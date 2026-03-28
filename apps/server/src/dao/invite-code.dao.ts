import { and, eq, isNull, or, sql } from 'drizzle-orm'
import type { Database } from '../db'
import { channels, inviteCodes, servers, users } from '../db/schema'

export type InviteType = 'server' | 'channel' | 'user'

export interface CreateInviteData {
  code: string
  type: InviteType
  createdBy: string
  serverId?: string
  channelId?: string
  userId?: string
  note?: string
  expiresAt?: Date
  maxUses?: number
}

export class InviteCodeDao {
  constructor(private deps: { db: Database }) {}

  private get db() {
    return this.deps.db
  }

  async create(data: CreateInviteData) {
    const result = await this.db
      .insert(inviteCodes)
      .values({
        code: data.code,
        type: data.type,
        createdBy: data.createdBy,
        serverId: data.serverId,
        channelId: data.channelId,
        userId: data.userId,
        note: data.note,
        expiresAt: data.expiresAt,
        maxUses: data.maxUses,
      })
      .returning()
    return result[0]
  }

  async findByCode(code: string) {
    const result = await this.db
      .select({
        invite: inviteCodes,
        createdBy: {
          id: users.id,
          username: users.username,
          displayName: users.displayName,
          avatarUrl: users.avatarUrl,
        },
        server: {
          id: servers.id,
          name: servers.name,
          iconUrl: servers.iconUrl,
          bannerUrl: servers.bannerUrl,
        },
        channel: {
          id: channels.id,
          name: channels.name,
        },
      })
      .from(inviteCodes)
      .leftJoin(users, eq(inviteCodes.createdBy, users.id))
      .leftJoin(servers, eq(inviteCodes.serverId, servers.id))
      .leftJoin(channels, eq(inviteCodes.channelId, channels.id))
      .where(eq(inviteCodes.code, code))
      .limit(1)
    return result[0] ?? null
  }

  async findByUsedBy(userId: string) {
    const result = await this.db
      .select()
      .from(inviteCodes)
      .where(eq(inviteCodes.usedBy, userId))
      .limit(1)
    return result[0] ?? null
  }

  async findAvailable(code: string) {
    const now = new Date()
    const result = await this.db
      .select()
      .from(inviteCodes)
      .where(
        and(
          eq(inviteCodes.code, code),
          eq(inviteCodes.isActive, true),
          or(isNull(inviteCodes.expiresAt), sql`${inviteCodes.expiresAt} > ${now}`),
          or(isNull(inviteCodes.maxUses), sql`${inviteCodes.usedCount} < ${inviteCodes.maxUses}`),
        ),
      )
      .limit(1)
    return result[0] ?? null
  }

  async markUsed(id: string, userId: string) {
    const result = await this.db
      .update(inviteCodes)
      .set({
        usedBy: userId,
        usedAt: new Date(),
        usedCount: sql`${inviteCodes.usedCount} + 1`,
      })
      .where(eq(inviteCodes.id, id))
      .returning()
    return result[0] ?? null
  }

  async deactivate(id: string) {
    const result = await this.db
      .update(inviteCodes)
      .set({ isActive: false })
      .where(eq(inviteCodes.id, id))
      .returning()
    return result[0] ?? null
  }

  async findAll(limit = 50, offset = 0) {
    const rows = await this.db
      .select({
        inviteCode: inviteCodes,
        createdByUser: {
          id: users.id,
          username: users.username,
          displayName: users.displayName,
        },
      })
      .from(inviteCodes)
      .leftJoin(users, eq(inviteCodes.createdBy, users.id))
      .orderBy(sql`${inviteCodes.createdAt} DESC`)
      .limit(limit)
      .offset(offset)

    return rows.map((r) => ({
      ...r.inviteCode,
      createdByUser: r.createdByUser,
    }))
  }

  async count() {
    const result = await this.db.select({ count: sql<number>`count(*)` }).from(inviteCodes)
    return Number(result[0]?.count ?? 0)
  }

  async countUsed() {
    const result = await this.db
      .select({ count: sql<number>`count(*)` })
      .from(inviteCodes)
      .where(sql`${inviteCodes.usedBy} IS NOT NULL`)
    return Number(result[0]?.count ?? 0)
  }

  async delete(id: string) {
    await this.db.delete(inviteCodes).where(eq(inviteCodes.id, id))
  }

  /** Find all invite codes created by a specific user, with used-by user info */
  async findByCreator(userId: string, limit = 50, offset = 0) {
    const usedByUser = {
      id: users.id,
      username: users.username,
      displayName: users.displayName,
      avatarUrl: users.avatarUrl,
    }

    // Self-join: get usedBy user info
    const rows = await this.db
      .select({
        inviteCode: inviteCodes,
        usedByUser: usedByUser,
      })
      .from(inviteCodes)
      .leftJoin(users, eq(inviteCodes.usedBy, users.id))
      .where(eq(inviteCodes.createdBy, userId))
      .orderBy(sql`${inviteCodes.createdAt} DESC`)
      .limit(limit)
      .offset(offset)

    return rows.map((r) => ({
      ...r.inviteCode,
      usedByUser: r.usedByUser?.id ? r.usedByUser : null,
    }))
  }

  /** Find invites by entity (server/channel/user) */
  async findByEntity(type: InviteType, entityId: string, limit = 50, offset = 0) {
    let whereClause: ReturnType<typeof eq>
    switch (type) {
      case 'server':
        whereClause = eq(inviteCodes.serverId, entityId)
        break
      case 'channel':
        whereClause = eq(inviteCodes.channelId, entityId)
        break
      case 'user':
        whereClause = eq(inviteCodes.userId, entityId)
        break
    }

    const rows = await this.db
      .select({
        inviteCode: inviteCodes,
        usedByUser: {
          id: users.id,
          username: users.username,
          displayName: users.displayName,
          avatarUrl: users.avatarUrl,
        },
      })
      .from(inviteCodes)
      .leftJoin(users, eq(inviteCodes.usedBy, users.id))
      .where(and(whereClause, eq(inviteCodes.isActive, true)))
      .orderBy(sql`${inviteCodes.createdAt} DESC`)
      .limit(limit)
      .offset(offset)

    return rows.map((r) => ({
      ...r.inviteCode,
      usedByUser: r.usedByUser?.id ? r.usedByUser : null,
    }))
  }

  /** Reset all invites for an entity (deactivate existing) */
  async resetEntityInvites(type: InviteType, entityId: string) {
    let whereClause: ReturnType<typeof eq>
    switch (type) {
      case 'server':
        whereClause = eq(inviteCodes.serverId, entityId)
        break
      case 'channel':
        whereClause = eq(inviteCodes.channelId, entityId)
        break
      case 'user':
        whereClause = eq(inviteCodes.userId, entityId)
        break
    }

    await this.db
      .update(inviteCodes)
      .set({ isActive: false })
      .where(and(whereClause, eq(inviteCodes.isActive, true)))
  }
}
