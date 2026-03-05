import type { NotificationDao } from '../dao/notification.dao'

export class NotificationService {
  constructor(private deps: { notificationDao: NotificationDao }) {}

  async getByUserId(userId: string, limit?: number, offset?: number) {
    return this.deps.notificationDao.findByUserId(userId, limit, offset)
  }

  async create(data: {
    userId: string
    type: 'mention' | 'reply' | 'dm' | 'system'
    title: string
    body?: string
    referenceId?: string
    referenceType?: string
  }) {
    return this.deps.notificationDao.create(data)
  }

  async markAsRead(id: string) {
    return this.deps.notificationDao.markAsRead(id)
  }

  async markAllAsRead(userId: string) {
    await this.deps.notificationDao.markAllAsRead(userId)
  }

  async getUnreadCount(userId: string) {
    return this.deps.notificationDao.getUnreadCount(userId)
  }
}
