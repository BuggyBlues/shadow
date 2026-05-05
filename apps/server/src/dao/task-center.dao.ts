import { and, desc, eq, sql } from 'drizzle-orm'
import type { Database } from '../db'
import { userRewardLogs, userTaskClaims } from '../db/schema/task-center'

function normalizeReferenceKey(referenceId: string | null | undefined) {
  const trimmed = referenceId?.trim()
  return trimmed ? trimmed : '__none__'
}

export class TaskCenterDao {
  constructor(private deps: { db: Database }) {}
  private get db() {
    return this.deps.db
  }

  async hasTaskClaim(userId: string, taskKey: string, cycleKey = 'once') {
    const r = await this.db
      .select({ id: userTaskClaims.id })
      .from(userTaskClaims)
      .where(
        and(
          eq(userTaskClaims.userId, userId),
          eq(userTaskClaims.taskKey, taskKey),
          eq(userTaskClaims.cycleKey, cycleKey),
        ),
      )
      .limit(1)
    return !!r[0]
  }

  async createTaskClaim(data: {
    userId: string
    taskKey: string
    cycleKey?: string
    rewardAmount: number
    rewardType?: string
    metadata?: Record<string, unknown>
  }) {
    const r = await this.db
      .insert(userTaskClaims)
      .values({
        userId: data.userId,
        taskKey: data.taskKey,
        cycleKey: data.cycleKey ?? 'once',
        rewardAmount: data.rewardAmount,
        rewardType: data.rewardType ?? 'shrimp_coin',
        metadata: data.metadata ?? {},
      })
      .onConflictDoNothing()
      .returning()
    return r[0] ?? null
  }

  async hasRewardLog(userId: string, rewardKey: string, referenceId: string | null = null) {
    const r = await this.db
      .select({ id: userRewardLogs.id })
      .from(userRewardLogs)
      .where(
        and(
          eq(userRewardLogs.userId, userId),
          eq(userRewardLogs.rewardKey, rewardKey),
          eq(userRewardLogs.referenceKey, normalizeReferenceKey(referenceId)),
        ),
      )
      .limit(1)
    return !!r[0]
  }

  async createRewardLog(data: {
    userId: string
    rewardKey: string
    referenceId?: string | null
    amount: number
    note?: string
    metadata?: Record<string, unknown>
    isRepeatable?: boolean
  }) {
    const r = await this.db
      .insert(userRewardLogs)
      .values({
        userId: data.userId,
        rewardKey: data.rewardKey,
        referenceId: data.referenceId ?? null,
        referenceKey: normalizeReferenceKey(data.referenceId),
        amount: data.amount,
        note: data.note,
        metadata: data.metadata ?? {},
        isRepeatable: data.isRepeatable ?? false,
      })
      .onConflictDoNothing()
      .returning()
    return r[0] ?? null
  }

  async countRewardsByKey(userId: string, rewardKey: string) {
    const r = await this.db
      .select({ count: sql<number>`count(*)::int` })
      .from(userRewardLogs)
      .where(and(eq(userRewardLogs.userId, userId), eq(userRewardLogs.rewardKey, rewardKey)))
    return r[0]?.count ?? 0
  }

  async listRewardLogs(userId: string, limit = 50, offset = 0) {
    return this.db
      .select()
      .from(userRewardLogs)
      .where(eq(userRewardLogs.userId, userId))
      .orderBy(desc(userRewardLogs.createdAt))
      .limit(limit)
      .offset(offset)
  }
}
