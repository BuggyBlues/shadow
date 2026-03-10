import { eq } from 'drizzle-orm'
import type { Database } from '../db'
import { workspaces } from '../db/schema'

export class WorkspaceDao {
  constructor(private deps: { db: Database }) {}

  private get db() {
    return this.deps.db
  }

  async findById(id: string) {
    const result = await this.db.select().from(workspaces).where(eq(workspaces.id, id)).limit(1)
    return result[0] ?? null
  }

  async findByServerId(serverId: string) {
    const result = await this.db
      .select()
      .from(workspaces)
      .where(eq(workspaces.serverId, serverId))
      .limit(1)
    return result[0] ?? null
  }

  async create(data: { serverId: string; name: string; description?: string }) {
    const result = await this.db
      .insert(workspaces)
      .values({
        serverId: data.serverId,
        name: data.name,
        description: data.description,
      })
      .returning()
    return result[0]
  }

  async update(id: string, data: Partial<{ name: string; description: string | null }>) {
    const result = await this.db
      .update(workspaces)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(workspaces.id, id))
      .returning()
    return result[0] ?? null
  }

  async delete(id: string) {
    await this.db.delete(workspaces).where(eq(workspaces.id, id))
  }
}
