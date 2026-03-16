import { zValidator } from '@hono/zod-validator'
import { Hono } from 'hono'
import { z } from 'zod'
import type { AppContainer } from '../container'
import { logger } from '../lib/logger'
import { authMiddleware } from '../middleware/auth.middleware'

export function createDmHandler(container: AppContainer) {
  const dmHandler = new Hono()

  dmHandler.use('*', authMiddleware)

  // POST /api/dm/channels
  dmHandler.post(
    '/channels',
    zValidator('json', z.object({ userId: z.string().uuid() })),
    async (c) => {
      const dmService = container.resolve('dmService')
      const { userId: targetUserId } = c.req.valid('json')
      const user = c.get('user')
      const channel = await dmService.getOrCreateChannel(user.userId, targetUserId)
      return c.json(channel, 201)
    },
  )

  // GET /api/dm/channels
  dmHandler.get('/channels', async (c) => {
    const dmService = container.resolve('dmService')
    const user = c.get('user')
    const channels = await dmService.getUserChannels(user.userId)
    return c.json(channels)
  })

  // GET /api/dm/channels/:id/messages
  dmHandler.get('/channels/:id/messages', async (c) => {
    const dmService = container.resolve('dmService')
    const id = c.req.param('id')
    const limit = Number(c.req.query('limit') ?? '50')
    const cursor = c.req.query('cursor')
    const messages = await dmService.getMessages(id, limit, cursor)
    return c.json(messages)
  })

  // POST /api/dm/channels/:id/messages
  dmHandler.post(
    '/channels/:id/messages',
    zValidator('json', z.object({ content: z.string().min(1).max(4000) })),
    async (c) => {
      const dmService = container.resolve('dmService')
      const id = c.req.param('id')
      const { content } = c.req.valid('json')
      const user = c.get('user')
      const message = await dmService.sendMessage(id, user.userId, content)

      // Broadcast to DM room via WebSocket
      const io = container.resolve('io')
      io.to(`dm:${id}`).emit('dm:message', message)

      // Relay to bot user if recipient is a bot (for AI processing)
      try {
        const channel = await dmService.getChannelById(id)
        if (channel) {
          const otherUserId = channel.userAId === user.userId ? channel.userBId : channel.userAId
          const userDao = container.resolve('userDao')
          const otherUser = await userDao.findById(otherUserId)
          if (otherUser?.isBot) {
            // Ensure bot socket is in DM room
            const botSockets = await io.in(`user:${otherUserId}`).fetchSockets()
            for (const bs of botSockets) {
              bs.join(`dm:${id}`)
            }
            logger.info(
              { otherUserId, dmChannelId: id, botSocketCount: botSockets.length },
              'REST: Relaying DM to bot',
            )

            const dmPayload = {
              id: message.id,
              content,
              dmChannelId: id,
              channelId: `dm:${id}`,
              authorId: user.userId,
              author: message.author,
              senderId: user.userId,
              receiverId: otherUserId,
              createdAt: message.createdAt,
            }
            // Emit to DM room (bot is joined, mirrors channel pattern)
            io.to(`dm:${id}`).emit('dm:message:new', dmPayload)
            // Also emit to user room as fallback
            io.to(`user:${otherUserId}`).emit('dm:message:new', dmPayload)
          }
        }
      } catch (err) {
        logger.error({ err, dmChannelId: id }, 'REST: Bot DM relay failed')
      }

      return c.json(message, 201)
    },
  )

  return dmHandler
}
