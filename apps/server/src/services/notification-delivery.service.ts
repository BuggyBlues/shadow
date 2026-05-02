import type { Server as SocketIOServer } from 'socket.io'

type NotificationRecord = {
  id: string
  userId: string
  [key: string]: unknown
}

export class NotificationDeliveryService {
  constructor(private deps: { io?: SocketIOServer }) {}

  async deliver(notification: NotificationRecord | null | undefined) {
    if (!notification) return
    try {
      this.deps.io?.to(`user:${notification.userId}`).emit('notification:new', notification)
    } catch {
      /* io may be absent in unit tests or during bootstrap */
    }
  }

  async deliverMany(notifications: Array<NotificationRecord | null | undefined>) {
    for (const notification of notifications) {
      await this.deliver(notification)
    }
  }

  async emitToUser(userId: string, event: string, payload: Record<string, unknown>) {
    try {
      this.deps.io?.to(`user:${userId}`).emit(event, payload)
    } catch {
      /* io may be absent in unit tests or during bootstrap */
    }
  }
}
