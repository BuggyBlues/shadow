import { and, eq, isNull } from 'drizzle-orm'
import type { Database } from '../db'
import { buddyPolicies } from '../db/schema'

export class BuddyPolicyDao {
  constructor(private deps: { db: Database }) {}

  private get db() {
    return this.deps.db
  }

  /** Find all policies for a given buddy */
  async findByBuddyId(buddyId: string) {
    return this.db.select().from(buddyPolicies).where(eq(buddyPolicies.buddyId, buddyId))
  }

  /** Find all policies for a given buddy in a specific server */
  async findByBuddyAndServer(buddyId: string, serverId: string) {
    return this.db
      .select()
      .from(buddyPolicies)
      .where(and(eq(buddyPolicies.buddyId, buddyId), eq(buddyPolicies.serverId, serverId)))
  }

  /** Find the server-wide default policy (channelId is null) */
  async findServerDefault(buddyId: string, serverId: string) {
    const result = await this.db
      .select()
      .from(buddyPolicies)
      .where(
        and(
          eq(buddyPolicies.buddyId, buddyId),
          eq(buddyPolicies.serverId, serverId),
          isNull(buddyPolicies.channelId),
        ),
      )
      .limit(1)
    return result[0] ?? null
  }

  /** Find a channel-specific policy */
  async findByChannel(buddyId: string, serverId: string, channelId: string) {
    const result = await this.db
      .select()
      .from(buddyPolicies)
      .where(
        and(
          eq(buddyPolicies.buddyId, buddyId),
          eq(buddyPolicies.serverId, serverId),
          eq(buddyPolicies.channelId, channelId),
        ),
      )
      .limit(1)
    return result[0] ?? null
  }

  /** Upsert a policy (insert or update on conflict) */
  async upsert(data: {
    buddyId: string
    serverId: string
    channelId?: string | null
    listen?: boolean
    reply?: boolean
    mentionOnly?: boolean
    config?: Record<string, unknown>
  }) {
    // Try to find existing
    const existing = data.channelId
      ? await this.findByChannel(data.buddyId, data.serverId, data.channelId)
      : await this.findServerDefault(data.buddyId, data.serverId)

    const now = new Date()

    if (existing) {
      const result = await this.db
        .update(buddyPolicies)
        .set({
          listen: data.listen ?? existing.listen,
          reply: data.reply ?? existing.reply,
          mentionOnly: data.mentionOnly ?? existing.mentionOnly,
          config: data.config ?? existing.config,
          updatedAt: now,
        })
        .where(eq(buddyPolicies.id, existing.id))
        .returning()
      return result[0]
    }

    const result = await this.db
      .insert(buddyPolicies)
      .values({
        buddyId: data.buddyId,
        serverId: data.serverId,
        channelId: data.channelId ?? null,
        listen: data.listen ?? true,
        reply: data.reply ?? true,
        mentionOnly: data.mentionOnly ?? false,
        config: data.config ?? {},
      })
      .returning()
    return result[0]
  }

  /** Batch upsert policies */
  async batchUpsert(
    policies: Array<{
      buddyId: string
      serverId: string
      channelId?: string | null
      listen?: boolean
      reply?: boolean
      mentionOnly?: boolean
      config?: Record<string, unknown>
    }>,
  ) {
    const results = []
    for (const policy of policies) {
      const result = await this.upsert(policy)
      results.push(result)
    }
    return results
  }

  /** Delete a specific policy */
  async delete(id: string) {
    await this.db.delete(buddyPolicies).where(eq(buddyPolicies.id, id))
  }

  /** Delete all policies for a buddy in a server */
  async deleteByBuddyAndServer(buddyId: string, serverId: string) {
    await this.db
      .delete(buddyPolicies)
      .where(and(eq(buddyPolicies.buddyId, buddyId), eq(buddyPolicies.serverId, serverId)))
  }
}
