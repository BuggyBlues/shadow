import type { Server as SocketIOServer } from 'socket.io'

/**
 * 通知 WebSocket 网关
 * 提供推送通知到在线用户的能力
 */
export function setupNotificationGateway(io: SocketIOServer): void {
  io.on('connection', (socket) => {
    const userId = socket.data.userId as string | undefined
    if (!userId) return

    // Join user's personal notification room
    void socket.join(`user:${userId}`)
  })
}

/**
 * 向指定用户推送通知
 */
export function pushNotification(
  io: SocketIOServer,
  userId: string,
  notification: Record<string, unknown>,
): void {
  io.to(`user:${userId}`).emit('notification:new', notification)
}

/**
 * 向指定用户推送 DM 消息
 */
export function pushDmMessage(
  io: SocketIOServer,
  userId: string,
  message: Record<string, unknown>,
): void {
  io.to(`user:${userId}`).emit('dm:message:new', message)
}
