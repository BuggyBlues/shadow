import { index, pgTable, timestamp, unique, uuid, varchar } from 'drizzle-orm/pg-core'
import { channels } from './channels'
import { users } from './users'

export const channelJoinRequests = pgTable(
  'channel_join_requests',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    channelId: uuid('channel_id')
      .notNull()
      .references(() => channels.id, { onDelete: 'cascade' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    status: varchar('status', { length: 20 }).default('pending').notNull(),
    requestedAt: timestamp('requested_at', { withTimezone: true }).defaultNow().notNull(),
    reviewedAt: timestamp('reviewed_at', { withTimezone: true }),
    reviewedBy: uuid('reviewed_by').references(() => users.id, { onDelete: 'set null' }),
  },
  (t) => [
    unique('channel_join_requests_channel_user_unique').on(t.channelId, t.userId),
    index('channel_join_requests_channel_status_idx').on(t.channelId, t.status),
    index('channel_join_requests_user_status_idx').on(t.userId, t.status),
  ],
)
