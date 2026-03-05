import type { Socket, Server as SocketIOServer } from 'socket.io'
import type { AppContainer } from '../container'
import { logger } from '../lib/logger'

export function setupChatGateway(io: SocketIOServer, container: AppContainer): void {
  io.on('connection', (socket: Socket) => {
    const userId = socket.data.userId as string | undefined
    logger.info({ socketId: socket.id, userId }, 'Client connected')

    // channel:join
    socket.on('channel:join', async ({ channelId }: { channelId: string }) => {
      await socket.join(`channel:${channelId}`)
      logger.debug({ userId, channelId }, 'Joined channel room')
    })

    // channel:leave
    socket.on('channel:leave', async ({ channelId }: { channelId: string }) => {
      await socket.leave(`channel:${channelId}`)
      logger.debug({ userId, channelId }, 'Left channel room')
    })

    // message:send
    socket.on(
      'message:send',
      async (data: {
        channelId: string
        content: string
        threadId?: string
        replyToId?: string
      }) => {
        if (!userId) return

        try {
          const messageService = container.resolve('messageService')
          const message = await messageService.send(data.channelId, userId, {
            content: data.content,
            threadId: data.threadId,
            replyToId: data.replyToId,
          })

          // Broadcast to channel room
          io.to(`channel:${data.channelId}`).emit('message:new', message)

          // If it's a thread message, also emit to thread room
          if (data.threadId) {
            io.to(`thread:${data.threadId}`).emit('message:new', message)
          }
        } catch (error) {
          const msg = error instanceof Error ? error.message : 'Failed to send message'
          socket.emit('error', { message: msg })
        }
      },
    )

    // message:typing
    socket.on('message:typing', ({ channelId }: { channelId: string }) => {
      if (!userId) return
      const username = socket.data.username as string
      socket.to(`channel:${channelId}`).emit('message:typing', { channelId, userId, username })
    })

    // Disconnect
    socket.on('disconnect', (reason) => {
      logger.info({ socketId: socket.id, userId, reason }, 'Client disconnected')
    })
  })
}
