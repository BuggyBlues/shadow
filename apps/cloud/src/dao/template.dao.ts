/**
 * DAO — Template data access.
 */

import { eq, like } from 'drizzle-orm'
import type { CloudDatabase } from '../db/index.js'
import { type NewTemplate, type Template, templates } from '../db/schema.js'

export class TemplateDao {
  constructor(private db: CloudDatabase) {}

  findAll(): Template[] {
    return this.db.select().from(templates).all()
  }

  findBySlug(slug: string): Template | undefined {
    return this.db.select().from(templates).where(eq(templates.slug, slug)).get()
  }

  search(query: string): Template[] {
    return this.db
      .select()
      .from(templates)
      .where(like(templates.name, `%${query}%`))
      .all()
  }

  create(data: NewTemplate): Template {
    return this.db.insert(templates).values(data).returning().get()
  }

  update(slug: string, data: Partial<NewTemplate>): Template | undefined {
    return this.db
      .update(templates)
      .set({ ...data, updatedAt: new Date().toISOString() })
      .where(eq(templates.slug, slug))
      .returning()
      .get()
  }

  delete(slug: string): void {
    this.db.delete(templates).where(eq(templates.slug, slug)).run()
  }
}
