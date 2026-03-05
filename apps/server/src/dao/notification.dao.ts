import { and, desc, eq } from 'drizzle-orm'
import type { Database } from '../db'
import { notifications } from '../db/schema'

export class NotificationDao {
  constructor(private deps: { db: Database }) {}

  private get db() {
    return this.deps.db
  }

  async findByUserId(userId: string, limit = 50, offset = 0) {
    return this.db
      .select()
      .from(notifications)
      .where(eq(notifications.userId, userId))
      .orderBy(desc(notifications.createdAt))
      .limit(limit)
      .offset(offset)
  }

  async create(data: {
    userId: string
    type: 'mention' | 'reply' | 'dm' | 'system'
    title: string
    body?: string
    referenceId?: string
    referenceType?: string
  }) {
    const result = await this.db.insert(notifications).values(data).returning()
    return result[0]
  }

  async markAsRead(id: string) {
    const result = await this.db
      .update(notifications)
      .set({ isRead: true })
      .where(eq(notifications.id, id))
      .returning()
    return result[0] ?? null
  }

  async markAllAsRead(userId: string) {
    await this.db
      .update(notifications)
      .set({ isRead: true })
      .where(and(eq(notifications.userId, userId), eq(notifications.isRead, false)))
  }

  async getUnreadCount(userId: string) {
    const result = await this.db
      .select()
      .from(notifications)
      .where(and(eq(notifications.userId, userId), eq(notifications.isRead, false)))
    return result.length
  }
}
