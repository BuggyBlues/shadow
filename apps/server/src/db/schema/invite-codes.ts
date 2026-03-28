import { boolean, integer, pgTable, text, timestamp, uuid, varchar } from 'drizzle-orm/pg-core'
import { channels } from './channels'
import { servers } from './servers'
import { users } from './users'

export const inviteCodes = pgTable('invite_codes', {
  id: uuid('id').primaryKey().defaultRandom(),
  code: varchar('code', { length: 32 }).notNull().unique(),
  type: varchar('type', { length: 20 }).notNull().default('server'),
  // For server invites
  serverId: uuid('server_id').references(() => servers.id, { onDelete: 'cascade' }),
  // For channel invites
  channelId: uuid('channel_id').references(() => channels.id, { onDelete: 'cascade' }),
  // For user invites (friend requests)
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }),
  createdBy: uuid('created_by')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  usedBy: uuid('used_by').references(() => users.id, { onDelete: 'set null' }),
  note: text('note'),
  isActive: boolean('is_active').default(true).notNull(),
  // Expiration and usage limits
  expiresAt: timestamp('expires_at', { withTimezone: true }),
  maxUses: integer('max_uses'),
  usedCount: integer('used_count').default(0).notNull(),
  usedAt: timestamp('used_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
})
