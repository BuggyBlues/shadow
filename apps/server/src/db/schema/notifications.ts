import {
  boolean,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core'
import { users } from './users'

export const notificationTypeEnum = pgEnum('notification_type', [
  'mention',
  'reply',
  'dm',
  'system',
])

export const notificationStrategyEnum = pgEnum('notification_strategy', [
  'all',
  'mention_only',
  'none',
])

export const notifications = pgTable(
  'notifications',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    type: notificationTypeEnum('type').notNull(),
    title: varchar('title', { length: 200 }).notNull(),
    body: text('body'),
    /**
     * Stable product event identifier. `type` stays as the coarse legacy bucket
     * (mention/reply/dm/system) for SDK compatibility; `kind` drives routing,
     * actions, templates, and future push workflows.
     */
    kind: varchar('kind', { length: 80 }).default('system').notNull(),
    referenceId: uuid('reference_id'),
    referenceType: varchar('reference_type', { length: 50 }),
    senderId: uuid('sender_id').references(() => users.id, { onDelete: 'set null' }),
    scopeServerId: uuid('scope_server_id'),
    scopeChannelId: uuid('scope_channel_id'),
    scopeDmChannelId: uuid('scope_dm_channel_id'),
    aggregationKey: varchar('aggregation_key', { length: 240 }),
    aggregatedCount: integer('aggregated_count').default(1).notNull(),
    lastAggregatedAt: timestamp('last_aggregated_at', { withTimezone: true }),
    metadata: jsonb('metadata').$type<Record<string, unknown>>(),
    isRead: boolean('is_read').default(false).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    expiresAt: timestamp('expires_at', { withTimezone: true }),
  },
  (t) => ({
    notificationsUserIdIdx: index('notifications_user_id_idx').on(t.userId),
    notificationsCreatedAtIdx: index('notifications_created_at_idx').on(t.createdAt),
    notificationsIsReadIdx: index('notifications_is_read_idx').on(t.isRead),
    notificationsUserUnreadCreatedIdx: index('notifications_user_unread_created_idx').on(
      t.userId,
      t.isRead,
      t.lastAggregatedAt,
      t.createdAt,
    ),
    notificationsScopeChannelIdx: index('notifications_scope_channel_idx').on(t.scopeChannelId),
    notificationsScopeServerIdx: index('notifications_scope_server_idx').on(t.scopeServerId),
    notificationsScopeDmChannelIdx: index('notifications_scope_dm_channel_idx').on(
      t.scopeDmChannelId,
    ),
    notificationsAggregationIdx: index('notifications_aggregation_idx').on(
      t.userId,
      t.aggregationKey,
      t.isRead,
    ),
  }),
)

export const notificationPreferences = pgTable('notification_preferences', {
  userId: uuid('user_id')
    .primaryKey()
    .references(() => users.id, { onDelete: 'cascade' }),
  strategy: notificationStrategyEnum('strategy').default('all').notNull(),
  mutedServerIds: uuid('muted_server_ids').array().default([]).notNull(),
  mutedChannelIds: uuid('muted_channel_ids').array().default([]).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
})
