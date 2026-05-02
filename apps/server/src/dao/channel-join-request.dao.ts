import { and, eq } from 'drizzle-orm'
import type { Database } from '../db'
import { channelJoinRequests } from '../db/schema'

export type ChannelJoinRequestStatus = 'pending' | 'approved' | 'rejected'

export class ChannelJoinRequestDao {
  constructor(private deps: { db: Database }) {}

  private get db() {
    return this.deps.db
  }

  async findById(id: string) {
    const result = await this.db
      .select()
      .from(channelJoinRequests)
      .where(eq(channelJoinRequests.id, id))
      .limit(1)
    return result[0] ?? null
  }

  async findByChannelAndUser(channelId: string, userId: string) {
    const result = await this.db
      .select()
      .from(channelJoinRequests)
      .where(
        and(eq(channelJoinRequests.channelId, channelId), eq(channelJoinRequests.userId, userId)),
      )
      .limit(1)
    return result[0] ?? null
  }

  async request(channelId: string, userId: string) {
    const now = new Date()
    const result = await this.db
      .insert(channelJoinRequests)
      .values({
        channelId,
        userId,
        status: 'pending',
        requestedAt: now,
        reviewedAt: null,
        reviewedBy: null,
      })
      .onConflictDoUpdate({
        target: [channelJoinRequests.channelId, channelJoinRequests.userId],
        set: {
          status: 'pending',
          requestedAt: now,
          reviewedAt: null,
          reviewedBy: null,
        },
      })
      .returning()
    return result[0]!
  }

  async review(
    id: string,
    status: Exclude<ChannelJoinRequestStatus, 'pending'>,
    reviewerId: string,
  ) {
    const result = await this.db
      .update(channelJoinRequests)
      .set({
        status,
        reviewedAt: new Date(),
        reviewedBy: reviewerId,
      })
      .where(eq(channelJoinRequests.id, id))
      .returning()
    return result[0] ?? null
  }
}
