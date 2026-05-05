import { and, count, desc, eq, gte } from 'drizzle-orm'
import type { Database } from '../db'
import { cloudActivities } from '../db/schema'

export class CloudActivityDao {
  constructor(private deps: { db: Database }) {}
  private get db() {
    return this.deps.db
  }

  async listByUser(userId: string, limit = 50, offset = 0) {
    return this.db
      .select()
      .from(cloudActivities)
      .where(eq(cloudActivities.userId, userId))
      .orderBy(desc(cloudActivities.createdAt))
      .limit(limit)
      .offset(offset)
  }

  async log(data: {
    userId: string
    type:
      | 'deploy'
      | 'destroy'
      | 'scale'
      | 'config_update'
      | 'cluster_add'
      | 'cluster_remove'
      | 'envvar_update'
      | 'template_submit'
      | 'template_update'
      | 'template_delete'
      | 'template_approved'
      | 'template_rejected'
      | 'billing_deduct'
      | 'diy_generate'
    namespace?: string
    meta?: Record<string, unknown>
  }) {
    const result = await this.db
      .insert(cloudActivities)
      .values({
        userId: data.userId,
        type: data.type,
        namespace: data.namespace ?? null,
        meta: data.meta ?? null,
      })
      .returning()
    return result[0]
  }

  async countByUserTypeSince(
    userId: string,
    type: Parameters<CloudActivityDao['log']>[0]['type'],
    since: Date,
  ) {
    const result = await this.db
      .select({ count: count() })
      .from(cloudActivities)
      .where(
        and(
          eq(cloudActivities.userId, userId),
          eq(cloudActivities.type, type),
          gte(cloudActivities.createdAt, since),
        ),
      )
    return result[0]?.count ?? 0
  }
}
