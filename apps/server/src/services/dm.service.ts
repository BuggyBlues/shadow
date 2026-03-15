import { and, desc, eq, lt, or } from 'drizzle-orm'
import type { Database } from '../db'
import { dmChannels, messages, users } from '../db/schema'

export class DmService {
  constructor(private deps: { db: Database }) {}

  async getOrCreateChannel(userAId: string, userBId: string) {
    // Ensure consistent ordering
    const [first, second] = userAId < userBId ? [userAId, userBId] : [userBId, userAId]

    const existing = await this.deps.db
      .select()
      .from(dmChannels)
      .where(and(eq(dmChannels.userAId, first), eq(dmChannels.userBId, second)))
      .limit(1)

    if (existing[0]) {
      return existing[0]
    }

    const result = await this.deps.db
      .insert(dmChannels)
      .values({ userAId: first, userBId: second })
      .returning()
    return result[0]
  }

  async getUserChannels(userId: string) {
    const channels = await this.deps.db
      .select()
      .from(dmChannels)
      .where(or(eq(dmChannels.userAId, userId), eq(dmChannels.userBId, userId)))

    // Enrich with other user info
    const enriched = []
    for (const ch of channels) {
      const otherId = ch.userAId === userId ? ch.userBId : ch.userAId
      const otherUser = await this.deps.db
        .select({
          id: users.id,
          username: users.username,
          displayName: users.displayName,
          avatarUrl: users.avatarUrl,
          status: users.status,
          isBot: users.isBot,
        })
        .from(users)
        .where(eq(users.id, otherId))
        .limit(1)

      enriched.push({
        ...ch,
        otherUser: otherUser[0] ?? null,
      })
    }

    return enriched
  }

  async getChannelById(id: string) {
    const result = await this.deps.db
      .select()
      .from(dmChannels)
      .where(eq(dmChannels.id, id))
      .limit(1)
    return result[0] ?? null
  }

  async getMessages(dmChannelId: string, limit = 50, cursor?: string) {
    // DM messages use the same messages table with a special channelId convention:
    // channelId = `dm:${dmChannelId}`
    const channelId = `dm:${dmChannelId}`
    const conditions = [eq(messages.channelId, channelId)]

    if (cursor) {
      conditions.push(lt(messages.createdAt, new Date(cursor)))
    }

    const rows = await this.deps.db
      .select()
      .from(messages)
      .where(and(...conditions))
      .orderBy(desc(messages.createdAt))
      .limit(limit)

    // Enrich with author info
    const enriched = []
    for (const msg of rows) {
      const author = await this.deps.db
        .select({
          id: users.id,
          username: users.username,
          displayName: users.displayName,
          avatarUrl: users.avatarUrl,
          isBot: users.isBot,
        })
        .from(users)
        .where(eq(users.id, msg.authorId))
        .limit(1)

      enriched.push({
        ...msg,
        author: author[0] ?? undefined,
      })
    }

    return enriched
  }

  async sendMessage(dmChannelId: string, authorId: string, content: string) {
    const channelId = `dm:${dmChannelId}`
    const result = await this.deps.db
      .insert(messages)
      .values({ content, channelId, authorId })
      .returning()

    // Update last_message_at
    await this.deps.db
      .update(dmChannels)
      .set({ lastMessageAt: new Date() })
      .where(eq(dmChannels.id, dmChannelId))

    // Enrich with author info
    const author = await this.deps.db
      .select({
        id: users.id,
        username: users.username,
        displayName: users.displayName,
        avatarUrl: users.avatarUrl,
        isBot: users.isBot,
      })
      .from(users)
      .where(eq(users.id, authorId))
      .limit(1)

    return {
      ...result[0],
      author: author[0] ?? undefined,
    }
  }
}
