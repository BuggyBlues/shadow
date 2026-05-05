import type { MessageMention } from '@shadowob/shared'
import type { Socket, Server as SocketIOServer } from 'socket.io'
import type { AppContainer } from '../container'
import { relayDmToBot } from '../lib/dm-relay'
import { logger } from '../lib/logger'

async function canUseChannelRoom(container: AppContainer, channelId: string, userId: string) {
  const channelDao = container.resolve('channelDao')
  const serverDao = container.resolve('serverDao')
  const channelMemberDao = container.resolve('channelMemberDao')
  const channel = await channelDao.findById(channelId)
  if (!channel) return false
  const serverMember = await serverDao.getMember(channel.serverId, userId)
  if (!serverMember) return false
  const channelMember = await channelMemberDao.get(channelId, userId)
  const canManage = serverMember.role === 'owner' || serverMember.role === 'admin'
  if (channel.isPrivate) return Boolean(channelMember || canManage)
  if (!channelMember) await channelMemberDao.add(channelId, userId).catch(() => null)
  return true
}

export function setupChatGateway(io: SocketIOServer, container: AppContainer): void {
  io.on('connection', (socket: Socket) => {
    const userId = socket.data.userId as string | undefined
    logger.info({ socketId: socket.id, userId }, 'Client connected')

    // channel:join
    socket.on(
      'channel:join',
      async ({ channelId }: { channelId: string }, ack?: (res: { ok: boolean }) => void) => {
        // Verify channel membership before joining the room
        if (userId) {
          try {
            const allowed = await canUseChannelRoom(container, channelId, userId)
            if (!allowed) {
              logger.warn({ userId, channelId }, 'Denied channel:join — not a member')
              if (typeof ack === 'function') ack({ ok: false })
              return
            }
          } catch (err) {
            logger.warn(
              { err, userId, channelId },
              'channel:join membership check failed — denying join',
            )
            if (typeof ack === 'function') ack({ ok: false })
            return
          }
        }

        await socket.join(`channel:${channelId}`)
        logger.info({ userId, channelId, socketId: socket.id }, 'Joined channel room')
        // Send ack if client provided a callback
        if (typeof ack === 'function') {
          ack({ ok: true })
        }
      },
    )

    // channel:leave
    socket.on('channel:leave', async ({ channelId }: { channelId: string }) => {
      await socket.leave(`channel:${channelId}`)
      logger.info({ userId, channelId, socketId: socket.id }, 'Left channel room')
    })

    // message:send
    socket.on(
      'message:send',
      async (data: {
        channelId: string
        content: string
        threadId?: string
        replyToId?: string
        mentions?: MessageMention[]
        metadata?: Record<string, unknown>
      }) => {
        if (!userId) return

        try {
          // Verify channel membership before sending
          const allowed = await canUseChannelRoom(container, data.channelId, userId)
          if (!allowed) {
            socket.emit('error', { message: 'You are not a member of this channel' })
            return
          }

          const messageService = container.resolve('messageService')
          const mentionService = container.resolve('mentionService')

          const preparedInput = await mentionService.prepareMessageInput(data.channelId, userId, {
            content: data.content,
            replyToId: data.replyToId,
            mentions: data.mentions,
            metadata: data.metadata,
          })
          const message = await messageService.send(data.channelId, userId, preparedInput)

          // Broadcast to channel room
          io.to(`channel:${data.channelId}`).emit('message:new', message)

          // Create notification for reply
          if (data.replyToId) {
            try {
              const notificationTriggerService = container.resolve('notificationTriggerService')
              const channelDao = container.resolve('channelDao')
              const originalMessage = await messageService.getById(data.replyToId)
              if (originalMessage && originalMessage.authorId !== userId) {
                const channel = await channelDao.findById(data.channelId)
                if (channel) {
                  await notificationTriggerService.triggerReply({
                    userId: originalMessage.authorId,
                    actorId: userId,
                    actorName: message.author?.displayName ?? message.author?.username ?? 'Someone',
                    messageId: message.id,
                    channelId: data.channelId,
                    serverId: channel.serverId,
                    channelName: channel.name,
                    preview: data.content.substring(0, 200),
                  })
                }
              }
            } catch (err) {
              logger.warn(
                { err, userId, replyToId: data.replyToId },
                'Reply notification creation failed — non-critical',
              )
            }
          }

          // Create notifications for structured mentions
          try {
            const senderName = message.author?.displayName ?? message.author?.username ?? 'Someone'
            const mentions = Array.isArray(message.metadata?.mentions)
              ? (message.metadata.mentions as MessageMention[])
              : []
            await mentionService.createMentionNotifications({
              messageId: message.id,
              channelId: data.channelId,
              authorId: userId,
              authorName: senderName,
              content: data.content,
              mentions,
            })
          } catch (err) {
            logger.warn(
              { err, userId, channelId: data.channelId },
              'Mention notification failed — non-critical',
            )
          }
        } catch (error) {
          const msg = error instanceof Error ? error.message : 'Failed to send message'
          socket.emit('error', { message: msg })
        }
      },
    )

    // message:typing
    socket.on(
      'message:typing',
      async ({ channelId, typing }: { channelId: string; typing?: boolean }) => {
        if (!userId) return
        const allowed = await canUseChannelRoom(container, channelId, userId).catch(() => false)
        if (!allowed) return
        const username = socket.data.username as string
        const displayName = socket.data.displayName as string | undefined
        socket.to(`channel:${channelId}`).emit('message:typing', {
          channelId,
          userId,
          username,
          displayName: displayName ?? username,
          typing: typing !== false,
        })
      },
    )

    // ---- DM (Direct Message) Events ----

    // dm:join — join a DM channel room
    socket.on('dm:join', async ({ dmChannelId }: { dmChannelId: string }) => {
      if (!userId) return
      // Verify user is a participant
      try {
        const dmService = container.resolve('dmService')
        const channel = await dmService.getChannelById(dmChannelId)
        if (!channel || (channel.userAId !== userId && channel.userBId !== userId)) {
          return
        }
        await socket.join(`dm:${dmChannelId}`)
        logger.info({ userId, dmChannelId, socketId: socket.id }, 'Joined DM room')
      } catch (err) {
        logger.warn({ err, userId, dmChannelId }, 'dm:join verification failed — denying join')
      }
    })

    // dm:leave — leave a DM channel room
    socket.on('dm:leave', async ({ dmChannelId }: { dmChannelId: string }) => {
      await socket.leave(`dm:${dmChannelId}`)
    })

    // dm:send — send a DM message
    socket.on(
      'dm:send',
      async (data: {
        dmChannelId: string
        content: string
        replyToId?: string
        metadata?: Record<string, unknown>
      }) => {
        if (!userId) return
        try {
          const dmService = container.resolve('dmService')
          const channel = await dmService.getChannelById(data.dmChannelId)
          if (!channel || (channel.userAId !== userId && channel.userBId !== userId)) {
            socket.emit('error', { message: 'Not a participant of this DM' })
            return
          }

          const message = await dmService.sendMessage(
            data.dmChannelId,
            userId,
            data.content,
            data.replyToId,
            undefined,
            data.metadata,
          )

          // Broadcast to DM room
          io.to(`dm:${data.dmChannelId}`).emit('dm:message', message)

          // Send notification to the other user
          const otherUserId = channel.userAId === userId ? channel.userBId : channel.userAId
          try {
            const notificationTriggerService = container.resolve('notificationTriggerService')
            const senderName = message.author?.displayName ?? message.author?.username ?? 'Someone'
            await notificationTriggerService.triggerDm({
              userId: otherUserId,
              actorId: userId,
              actorName: senderName,
              dmChannelId: data.dmChannelId,
              preview: data.content.substring(0, 200),
            })
          } catch (err) {
            logger.warn(
              { err, userId, dmChannelId: data.dmChannelId },
              'DM notification failed — non-critical',
            )
          }

          // Relay to bot using shared helper
          try {
            await relayDmToBot(io, container, data.dmChannelId, userId, otherUserId, {
              id: message.id!,
              content: message.content ?? data.content,
              author: message.author,
              createdAt: message.createdAt,
              replyToId: message.replyToId,
              attachments: message.attachments,
            })
          } catch (err) {
            logger.error({ err, dmChannelId: data.dmChannelId }, 'Bot DM relay failed')
          }

          // Record rental message for billing v2 (fire-and-forget)
          try {
            const rentalService = container.resolve('rentalService')
            await rentalService.recordRentalMessage(userId, otherUserId)
          } catch (err) {
            logger.warn(
              { err, userId, dmChannelId: data.dmChannelId },
              'Rental message recording failed — non-critical',
            )
          }
        } catch (error) {
          const msg = error instanceof Error ? error.message : 'Failed to send DM'
          socket.emit('error', { message: msg })
        }
      },
    )

    // dm:edit — edit a DM message
    socket.on(
      'dm:edit',
      async (data: { dmChannelId: string; messageId: string; content: string }) => {
        if (!userId) return
        try {
          const dmService = container.resolve('dmService')
          const isParticipant = await dmService.isParticipant(data.dmChannelId, userId)
          if (!isParticipant) {
            socket.emit('error', { message: 'Not a participant of this DM' })
            return
          }

          const updated = await dmService.editMessage(data.messageId, userId, data.content)
          io.to(`dm:${data.dmChannelId}`).emit('dm:message:updated', updated)
        } catch (error) {
          const msg = error instanceof Error ? error.message : 'Failed to edit DM'
          socket.emit('error', { message: msg })
        }
      },
    )

    // dm:delete — delete a DM message
    socket.on('dm:delete', async (data: { dmChannelId: string; messageId: string }) => {
      if (!userId) return
      try {
        const dmService = container.resolve('dmService')
        const isParticipant = await dmService.isParticipant(data.dmChannelId, userId)
        if (!isParticipant) {
          socket.emit('error', { message: 'Not a participant of this DM' })
          return
        }

        await dmService.deleteMessage(data.messageId, userId)
        io.to(`dm:${data.dmChannelId}`).emit('dm:message:deleted', {
          id: data.messageId,
          dmChannelId: data.dmChannelId,
        })
      } catch (error) {
        const msg = error instanceof Error ? error.message : 'Failed to delete DM'
        socket.emit('error', { message: msg })
      }
    })

    // dm:typing — typing indicator in DM
    socket.on(
      'dm:typing',
      async ({ dmChannelId, typing }: { dmChannelId: string; typing?: boolean }) => {
        if (!userId) return
        const dmService = container.resolve('dmService')
        const isParticipant = await dmService.isParticipant(dmChannelId, userId).catch(() => false)
        if (!isParticipant) return
        const username = socket.data.username as string
        const displayName = socket.data.displayName as string | undefined
        socket.to(`dm:${dmChannelId}`).emit('dm:typing', {
          dmChannelId,
          userId,
          username,
          displayName: displayName ?? username,
          typing: typing !== false,
        })
      },
    )

    // dm:react — add a reaction to a DM message
    socket.on(
      'dm:react',
      async (data: { dmChannelId: string; dmMessageId: string; emoji: string }) => {
        if (!userId) return
        try {
          const dmService = container.resolve('dmService')
          const isParticipant = await dmService.isParticipant(data.dmChannelId, userId)
          if (!isParticipant) {
            socket.emit('error', { message: 'Not a participant of this DM' })
            return
          }

          await dmService.addReaction(data.dmMessageId, userId, data.emoji)
          const reactions = await dmService.getReactions(data.dmMessageId)
          io.to(`dm:${data.dmChannelId}`).emit('dm:reaction:updated', {
            dmMessageId: data.dmMessageId,
            dmChannelId: data.dmChannelId,
            reactions,
          })
        } catch (error) {
          const msg = error instanceof Error ? error.message : 'Failed to add reaction'
          socket.emit('error', { message: msg })
        }
      },
    )

    // dm:unreact — remove a reaction from a DM message
    socket.on(
      'dm:unreact',
      async (data: { dmChannelId: string; dmMessageId: string; emoji: string }) => {
        if (!userId) return
        try {
          const dmService = container.resolve('dmService')
          const isParticipant = await dmService.isParticipant(data.dmChannelId, userId)
          if (!isParticipant) {
            socket.emit('error', { message: 'Not a participant of this DM' })
            return
          }

          await dmService.removeReaction(data.dmMessageId, userId, data.emoji)
          const reactions = await dmService.getReactions(data.dmMessageId)
          io.to(`dm:${data.dmChannelId}`).emit('dm:reaction:updated', {
            dmMessageId: data.dmMessageId,
            dmChannelId: data.dmChannelId,
            reactions,
          })
        } catch (error) {
          const msg = error instanceof Error ? error.message : 'Failed to remove reaction'
          socket.emit('error', { message: msg })
        }
      },
    )

    // Disconnect
    socket.on('disconnect', (reason) => {
      logger.info({ socketId: socket.id, userId, reason }, 'Client disconnected')
    })

    // Auto-join bot users to their DM channel rooms (after all handlers registered)
    if (userId) {
      ;(async () => {
        try {
          const userDao = container.resolve('userDao')
          const currentUser = await userDao.findById(userId)
          if (currentUser?.isBot) {
            const dmService = container.resolve('dmService')
            const dmChs = await dmService.getUserChannels(userId)
            for (const ch of dmChs) {
              await socket.join(`dm:${ch.id}`)
              logger.info(
                { userId, dmChannelId: ch.id, socketId: socket.id },
                'Bot auto-joined DM room',
              )
            }
            logger.info({ userId, count: dmChs.length }, 'Bot auto-joined all DM rooms')
          }
        } catch (err) {
          logger.error({ err, userId }, 'Failed to auto-join bot DM rooms')
        }
      })()
    }
  })
}
