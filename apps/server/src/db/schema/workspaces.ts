import {
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core'
import { servers } from './servers'

export const workspaceNodeKindEnum = pgEnum('workspace_node_kind', ['dir', 'file'])

export const workspaces = pgTable('workspaces', {
  id: uuid('id').primaryKey().defaultRandom(),
  serverId: uuid('server_id')
    .notNull()
    .references(() => servers.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
})

export const workspaceNodes = pgTable('workspace_nodes', {
  id: uuid('id').primaryKey().defaultRandom(),
  workspaceId: uuid('workspace_id')
    .notNull()
    .references(() => workspaces.id, { onDelete: 'cascade' }),
  parentId: uuid('parent_id'),
  kind: workspaceNodeKindEnum('kind').notNull(),
  name: varchar('name', { length: 500 }).notNull(),
  path: text('path').notNull(),
  pos: integer('pos').default(0).notNull(),
  ext: varchar('ext', { length: 50 }),
  mime: varchar('mime', { length: 255 }),
  sizeBytes: integer('size_bytes'),
  contentRef: text('content_ref'),
  previewUrl: text('preview_url'),
  flags: jsonb('flags').$type<Record<string, unknown>>(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
})
