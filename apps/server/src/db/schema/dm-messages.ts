import { boolean, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core'
import { dmChannels } from './dm-channels'
import { users } from './users'

export const dmMessages = pgTable('dm_messages', {
  id: uuid('id').primaryKey().defaultRandom(),
  content: text('content').notNull(),
  dmChannelId: uuid('dm_channel_id')
    .notNull()
    .references(() => dmChannels.id, { onDelete: 'cascade' }),
  authorId: uuid('author_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  replyToId: uuid('reply_to_id'),
  isEdited: boolean('is_edited').default(false).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
})
