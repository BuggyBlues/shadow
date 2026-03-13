import {
  boolean,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core'
import { users } from './users'

export const userTaskClaims = pgTable(
  'user_task_claims',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    taskKey: varchar('task_key', { length: 64 }).notNull(),
    cycleKey: varchar('cycle_key', { length: 64 }).notNull().default('once'),
    rewardAmount: integer('reward_amount').notNull().default(0),
    rewardType: varchar('reward_type', { length: 32 }).notNull().default('shrimp_coin'),
    metadata: jsonb('metadata').$type<Record<string, unknown>>().default({}),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    userTaskClaimUnique: uniqueIndex('user_task_claim_unique').on(t.userId, t.taskKey, t.cycleKey),
  }),
)

export const userRewardLogs = pgTable(
  'user_reward_logs',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    rewardKey: varchar('reward_key', { length: 100 }).notNull(),
    referenceId: varchar('reference_id', { length: 100 }),
    amount: integer('amount').notNull(),
    note: text('note'),
    metadata: jsonb('metadata').$type<Record<string, unknown>>().default({}),
    isRepeatable: boolean('is_repeatable').notNull().default(false),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    userRewardUnique: uniqueIndex('user_reward_unique').on(t.userId, t.rewardKey, t.referenceId),
  }),
)
