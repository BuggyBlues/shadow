import type { ProviderUsageSummary } from '@shadowob/cloud'
import { inArray } from 'drizzle-orm'
import type { Database } from '../db'
import { cloudAgentUsageSnapshots } from '../db/schema'

type CloudAgentUsageSnapshotInsert = typeof cloudAgentUsageSnapshots.$inferInsert

export type CloudAgentUsageSnapshotInput = Omit<
  CloudAgentUsageSnapshotInsert,
  'id' | 'createdAt' | 'updatedAt'
>

export class CloudUsageDao {
  constructor(private deps: { db: Database }) {}

  private get db() {
    return this.deps.db
  }

  async upsertAgentSnapshot(
    data: CloudAgentUsageSnapshotInput & { providers: ProviderUsageSummary[] },
  ) {
    const result = await this.db
      .insert(cloudAgentUsageSnapshots)
      .values(data)
      .onConflictDoUpdate({
        target: cloudAgentUsageSnapshots.agentId,
        set: {
          agentUserId: data.agentUserId,
          ownerId: data.ownerId,
          source: data.source,
          model: data.model ?? null,
          totalUsd: data.totalUsd ?? null,
          inputTokens: data.inputTokens ?? null,
          outputTokens: data.outputTokens ?? null,
          cacheReadTokens: data.cacheReadTokens ?? null,
          cacheWriteTokens: data.cacheWriteTokens ?? null,
          totalTokens: data.totalTokens ?? null,
          providers: data.providers,
          raw: data.raw ?? null,
          generatedAt: data.generatedAt,
          updatedAt: new Date(),
        },
      })
      .returning()
    return result[0] ?? null
  }

  async findLatestByAgentIds(agentIds: string[]) {
    if (agentIds.length === 0) return []
    return this.db
      .select()
      .from(cloudAgentUsageSnapshots)
      .where(inArray(cloudAgentUsageSnapshots.agentId, agentIds))
  }
}
