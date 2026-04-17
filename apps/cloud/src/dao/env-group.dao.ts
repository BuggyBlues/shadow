/**
 * DAO — persisted environment groups.
 */

import { asc, eq } from 'drizzle-orm'
import type { CloudDatabase } from '../db/index.js'
import { envGroups } from '../db/schema.js'

export class EnvGroupDao {
  constructor(private db: CloudDatabase) {}

  findAll(): string[] {
    const rows = this.db.select().from(envGroups).orderBy(asc(envGroups.name)).all()
    return rows
      .map((row) => row.name)
      .sort((a, b) => (a === 'default' ? -1 : b === 'default' ? 1 : a.localeCompare(b)))
  }

  ensure(name: string): void {
    const normalized = name.trim() || 'default'
    this.db.insert(envGroups).values({ name: normalized }).onConflictDoNothing().run()
  }

  create(name: string): void {
    this.ensure(name)
  }

  delete(name: string): void {
    if (name === 'default') return // protect default group
    this.db.delete(envGroups).where(eq(envGroups.name, name)).run()
  }
}
