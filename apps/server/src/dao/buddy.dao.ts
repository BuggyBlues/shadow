import { eq, sql } from 'drizzle-orm'
import type { Database } from '../db'
import { buddies, users } from '../db/schema'

export class BuddyDao {
  constructor(private deps: { db: Database }) {}

  private get db() {
    return this.deps.db
  }

  async findById(id: string) {
    const result = await this.db.select().from(buddies).where(eq(buddies.id, id)).limit(1)
    return result[0] ?? null
  }

  async findByOwnerId(ownerId: string) {
    return this.db.select().from(buddies).where(eq(buddies.ownerId, ownerId))
  }

  async findAll(limit = 50, offset = 0) {
    return this.db.select().from(buddies).limit(limit).offset(offset)
  }

  async create(data: {
    userId: string
    kernelType: string
    config: Record<string, unknown>
    ownerId: string
  }) {
    const result = await this.db.insert(buddies).values(data).returning()
    return result[0]
  }

  async updateStatus(id: string, status: 'running' | 'stopped' | 'error', containerId?: string) {
    const result = await this.db
      .update(buddies)
      .set({
        status,
        ...(containerId !== undefined ? { containerId } : {}),
        updatedAt: new Date(),
      })
      .where(eq(buddies.id, id))
      .returning()
    return result[0] ?? null
  }

  async updateHeartbeat(id: string) {
    // Accumulate online seconds: if lastHeartbeat is recent (<= 120s), add the delta
    // Use NOW() to avoid JS Date serialization issues with PostgreSQL timestamptz casts
    const result = await this.db
      .update(buddies)
      .set({
        lastHeartbeat: sql`NOW()`,
        status: 'running',
        updatedAt: sql`NOW()`,
        totalOnlineSeconds: sql`${buddies.totalOnlineSeconds} + CASE
          WHEN ${buddies.lastHeartbeat} IS NOT NULL
            AND EXTRACT(EPOCH FROM (NOW() - ${buddies.lastHeartbeat})) <= 120
          THEN FLOOR(EXTRACT(EPOCH FROM (NOW() - ${buddies.lastHeartbeat})))::int
          ELSE 0 END`,
      })
      .where(eq(buddies.id, id))
      .returning()
    return result[0] ?? null
  }

  async updateConfig(id: string, config: Record<string, unknown>) {
    const result = await this.db
      .update(buddies)
      .set({ config, updatedAt: new Date() })
      .where(eq(buddies.id, id))
      .returning()
    return result[0] ?? null
  }

  async findByUserId(userId: string) {
    const result = await this.db.select().from(buddies).where(eq(buddies.userId, userId)).limit(1)
    return result[0] ?? null
  }

  async delete(id: string) {
    await this.db.delete(buddies).where(eq(buddies.id, id))
  }

  /** 创建 Buddy 关联的 buddy user，username冲突时自动加随机短缀 */
  async createBuddyUser(data: { username: string; displayName: string }) {
    const maxRetries = 5
    let username = data.username
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        const result = await this.db
          .insert(users)
          .values({
            email: `${username}@shadowob.buddy`,
            username,
            displayName: data.displayName,
            passwordHash: 'buddy-no-password',
            isBot: true,
          })
          .returning()
        return result[0]
      } catch (err: unknown) {
        // Drizzle may wrap the pg error; check code on the error itself or via cause
        const pgCode =
          (err as { code?: string })?.code ?? (err as { cause?: { code?: string } })?.cause?.code
        const isUniqueViolation =
          pgCode === '23505' ||
          (err instanceof Error && /unique.*constraint|duplicate key/i.test(err.message))
        if (!isUniqueViolation || attempt === maxRetries - 1) throw err
        // Append random 4-char suffix, keeping within 32-char limit
        const suffix = Math.random().toString(36).slice(2, 6)
        username = `${data.username.slice(0, 27)}_${suffix}`
      }
    }
  }
}
