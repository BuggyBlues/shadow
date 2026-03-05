import { zValidator } from '@hono/zod-validator'
import { Hono } from 'hono'
import { z } from 'zod'
import type { AppContainer } from '../container'
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
      return c.json(message, 201)
    },
  )

  return dmHandler
}
