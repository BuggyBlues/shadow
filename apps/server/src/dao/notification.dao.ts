import { and, count, desc, eq, inArray, sql } from 'drizzle-orm'
import type { Database } from '../db'
import { channels, messages, notificationPreferences, notifications, users } from '../db/schema'

type NotificationStrategy = 'all' | 'mention_only' | 'none'
type NotificationType = 'mention' | 'reply' | 'dm' | 'system'

export interface CreateNotificationRecord {
  userId: string
  type: NotificationType
  kind?: string
  title: string
  body?: string | null
  referenceId?: string | null
  referenceType?: string | null
  senderId?: string | null
  scopeServerId?: string | null
  scopeChannelId?: string | null
  scopeDmChannelId?: string | null
  aggregationKey?: string | null
  metadata?: Record<string, unknown> | null
  expiresAt?: Date | null
}

export interface AggregateNotificationRecord extends CreateNotificationRecord {
  aggregationKey: string
  windowStart: Date
}

export class NotificationDao {
  constructor(private deps: { db: Database }) {}

  private get db() {
    return this.deps.db
  }

  async findByUserId(userId: string, limit = 50, offset = 0) {
    const result = await this.db
      .select({
        notification: notifications,
        senderAvatarUrl: users.avatarUrl,
      })
      .from(notifications)
      .leftJoin(users, eq(notifications.senderId, users.id))
      .where(eq(notifications.userId, userId))
      .orderBy(desc(sql`coalesce(${notifications.lastAggregatedAt}, ${notifications.createdAt})`))
      .limit(limit)
      .offset(offset)

    return result.map((r) => ({
      ...r.notification,
      senderAvatarUrl: r.senderAvatarUrl,
    }))
  }

  async findUnreadByUserId(userId: string) {
    const result = await this.db
      .select({
        notification: notifications,
        senderAvatarUrl: users.avatarUrl,
      })
      .from(notifications)
      .leftJoin(users, eq(notifications.senderId, users.id))
      .where(and(eq(notifications.userId, userId), eq(notifications.isRead, false)))
      .orderBy(desc(sql`coalesce(${notifications.lastAggregatedAt}, ${notifications.createdAt})`))

    return result.map((r) => ({
      ...r.notification,
      senderAvatarUrl: r.senderAvatarUrl,
    }))
  }

  async create(data: CreateNotificationRecord) {
    const result = await this.db
      .insert(notifications)
      .values({
        userId: data.userId,
        type: data.type,
        kind: data.kind ?? data.referenceType ?? data.type,
        title: data.title,
        body: data.body,
        referenceId: data.referenceId,
        referenceType: data.referenceType,
        senderId: data.senderId,
        scopeServerId: data.scopeServerId,
        scopeChannelId: data.scopeChannelId,
        scopeDmChannelId: data.scopeDmChannelId,
        aggregationKey: data.aggregationKey,
        metadata: data.metadata,
        expiresAt: data.expiresAt,
      })
      .returning()
    return result[0]
  }

  async aggregateOrCreate(data: AggregateNotificationRecord) {
    const existing = await this.db
      .select()
      .from(notifications)
      .where(
        and(
          eq(notifications.userId, data.userId),
          eq(notifications.aggregationKey, data.aggregationKey),
          eq(notifications.isRead, false),
          sql`coalesce(${notifications.lastAggregatedAt}, ${notifications.createdAt}) >= ${data.windowStart.toISOString()}::timestamptz`,
        ),
      )
      .orderBy(desc(sql`coalesce(${notifications.lastAggregatedAt}, ${notifications.createdAt})`))
      .limit(1)

    if (existing[0]) {
      const result = await this.db
        .update(notifications)
        .set({
          title: data.title,
          body: data.body,
          referenceId: data.referenceId,
          referenceType: data.referenceType,
          senderId: data.senderId,
          scopeServerId: data.scopeServerId,
          scopeChannelId: data.scopeChannelId,
          scopeDmChannelId: data.scopeDmChannelId,
          metadata: data.metadata,
          aggregatedCount: sql`${notifications.aggregatedCount} + 1`,
          lastAggregatedAt: new Date(),
        })
        .where(eq(notifications.id, existing[0].id))
        .returning()
      return result[0]
    }

    return this.create(data)
  }

  async markAsRead(userId: string, id: string) {
    const result = await this.db
      .update(notifications)
      .set({ isRead: true })
      .where(and(eq(notifications.id, id), eq(notifications.userId, userId)))
      .returning()
    return result[0] ?? null
  }

  async markAllAsRead(userId: string) {
    await this.db
      .update(notifications)
      .set({ isRead: true })
      .where(and(eq(notifications.userId, userId), eq(notifications.isRead, false)))
  }

  async markAsReadByIds(ids: string[]) {
    if (ids.length === 0) return
    await this.db.update(notifications).set({ isRead: true }).where(inArray(notifications.id, ids))
  }

  async getUnreadCount(userId: string) {
    const result = await this.db
      .select({ value: count() })
      .from(notifications)
      .where(and(eq(notifications.userId, userId), eq(notifications.isRead, false)))
    return result[0]?.value ?? 0
  }

  async getPreference(userId: string) {
    const result = await this.db
      .select()
      .from(notificationPreferences)
      .where(eq(notificationPreferences.userId, userId))
      .limit(1)
    return result[0] ?? null
  }

  async upsertPreference(data: {
    userId: string
    strategy: NotificationStrategy
    mutedServerIds: string[]
    mutedChannelIds: string[]
  }) {
    const result = await this.db
      .insert(notificationPreferences)
      .values({
        userId: data.userId,
        strategy: data.strategy,
        mutedServerIds: data.mutedServerIds,
        mutedChannelIds: data.mutedChannelIds,
      })
      .onConflictDoUpdate({
        target: notificationPreferences.userId,
        set: {
          strategy: data.strategy,
          mutedServerIds: data.mutedServerIds,
          mutedChannelIds: data.mutedChannelIds,
          updatedAt: new Date(),
        },
      })
      .returning()
    return result[0]!
  }

  async findMessageScopesByMessageIds(messageIds: string[]) {
    if (messageIds.length === 0) return []
    return this.db
      .select({
        messageId: messages.id,
        channelId: channels.id,
        serverId: channels.serverId,
      })
      .from(messages)
      .innerJoin(channels, eq(messages.channelId, channels.id))
      .where(inArray(messages.id, messageIds))
  }

  async findChannelScopes(channelIds: string[]) {
    if (channelIds.length === 0) return []
    return this.db
      .select({
        channelId: channels.id,
        serverId: channels.serverId,
      })
      .from(channels)
      .where(inArray(channels.id, channelIds))
  }
}
