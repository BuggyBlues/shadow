import { boolean, jsonb, pgTable, timestamp, uuid } from 'drizzle-orm/pg-core'
import { buddies } from './agents'
import { channels } from './channels'
import { servers } from './servers'

/**
 * Buddy policies — per-buddy, per-server/channel strategy table.
 *
 * When channelId is null, the policy applies as the server-wide default.
 * Channel-level policies override the server default.
 *
 * The `config` jsonb column is extensible for future strategy fields.
 */
export const buddyPolicies = pgTable('agent_policies', {
  id: uuid('id').primaryKey().defaultRandom(),

  buddyId: uuid('agent_id')
    .notNull()
    .references(() => buddies.id, { onDelete: 'cascade' }),

  serverId: uuid('server_id')
    .notNull()
    .references(() => servers.id, { onDelete: 'cascade' }),

  /** null = server-wide default policy */
  channelId: uuid('channel_id').references(() => channels.id, { onDelete: 'cascade' }),

  /** Whether the buddy listens on this server/channel */
  listen: boolean('listen').default(true).notNull(),

  /** Whether the buddy replies on this server/channel */
  reply: boolean('reply').default(true).notNull(),

  /** Only reply when the buddy is @mentioned */
  mentionOnly: boolean('mention_only').default(false).notNull(),

  /** Extensible config for future strategy fields */
  config: jsonb('config').$type<Record<string, unknown>>().default({}).notNull(),

  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
})
