import type { Socket, Server as SocketIOServer } from 'socket.io'
import type { AppContainer } from '../container'

const onlineUsers = new Map<string, Set<string>>() // userId -> Set<socketId>

export function setupPresenceGateway(io: SocketIOServer, container: AppContainer): void {
  io.on('connection', (socket: Socket) => {
    const userId = socket.data.userId as string | undefined
    if (!userId) return

    // Track online user
    if (!onlineUsers.has(userId)) {
      onlineUsers.set(userId, new Set())
      // Broadcast online status
      const userDao = container.resolve('userDao')
      void userDao.updateStatus(userId, 'online')
      io.emit('presence:change', { userId, status: 'online' })
    }
    onlineUsers.get(userId)!.add(socket.id)

    // presence:update
    socket.on(
      'presence:update',
      async ({ status }: { status: 'online' | 'idle' | 'dnd' | 'offline' }) => {
        const userDao = container.resolve('userDao')
        await userDao.updateStatus(userId, status)
        io.emit('presence:change', { userId, status })
      },
    )

    // Disconnect
    socket.on('disconnect', () => {
      const sockets = onlineUsers.get(userId)
      if (sockets) {
        sockets.delete(socket.id)
        if (sockets.size === 0) {
          onlineUsers.delete(userId)
          const userDao = container.resolve('userDao')
          void userDao.updateStatus(userId, 'offline')
          io.emit('presence:change', { userId, status: 'offline' })
        }
      }
    })
  })
}

/** Get online user IDs */
export function getOnlineUserIds(): string[] {
  return Array.from(onlineUsers.keys())
}
