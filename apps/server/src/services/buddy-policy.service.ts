import type { Logger } from 'pino'
import type { BuddyDao } from '../dao/buddy.dao'
import type { BuddyPolicyDao } from '../dao/buddy-policy.dao'
import type { ChannelDao } from '../dao/channel.dao'
import type { ServerDao } from '../dao/server.dao'

export class BuddyPolicyService {
  constructor(
    private deps: {
      buddyPolicyDao: BuddyPolicyDao
      buddyDao: BuddyDao
      serverDao: ServerDao
      channelDao: ChannelDao
      logger: Logger
    },
  ) {}

  /** Get all policies for a buddy */
  async getPolicies(buddyId: string) {
    return this.deps.buddyPolicyDao.findByBuddyId(buddyId)
  }

  /** Upsert policies (batch) */
  async upsertPolicies(
    buddyId: string,
    policies: Array<{
      serverId: string
      channelId?: string | null
      listen?: boolean
      reply?: boolean
      mentionOnly?: boolean
      config?: Record<string, unknown>
    }>,
  ) {
    // Verify buddy exists
    const buddy = await this.deps.buddyDao.findById(buddyId)
    if (!buddy) {
      throw Object.assign(new Error('Buddy not found'), { status: 404 })
    }

    return this.deps.buddyPolicyDao.batchUpsert(policies.map((p) => ({ buddyId, ...p })))
  }

  /** Delete a specific policy */
  async deletePolicy(policyId: string) {
    await this.deps.buddyPolicyDao.delete(policyId)
  }

  /**
   * Get the full remote config for a buddy (what the plugin fetches on startup).
   *
   * Returns the list of servers the buddy user has joined, with channels and
   * per-channel policies. If no channel-specific policy exists, the server-wide
   * default is used. If no server-wide default exists, sensible defaults are
   * returned (listen: true, reply: true, mentionOnly: false).
   */
  async getRemoteConfig(buddyId: string) {
    const buddy = await this.deps.buddyDao.findById(buddyId)
    if (!buddy) {
      throw Object.assign(new Error('Buddy not found'), { status: 404 })
    }

    // Find all servers the buddy user has joined
    const memberships = await this.deps.serverDao.findByUserId(buddy.userId)

    // Get all policies for the buddy
    const allPolicies = await this.deps.buddyPolicyDao.findByBuddyId(buddyId)

    // Build the response
    const servers = await Promise.all(
      memberships.map(async ({ server }) => {
        const channels = await this.deps.channelDao.findByServerId(server.id)
        const serverPolicies = allPolicies.filter((p) => p.serverId === server.id)

        // Find server-wide default policy (channelId is null)
        const serverDefault = serverPolicies.find((p) => p.channelId === null)
        const defaultPolicy = {
          listen: serverDefault?.listen ?? true,
          reply: serverDefault?.reply ?? true,
          mentionOnly: serverDefault?.mentionOnly ?? false,
          config: serverDefault?.config ?? {},
        }

        return {
          id: server.id,
          name: server.name,
          slug: server.slug,
          iconUrl: server.iconUrl,
          defaultPolicy,
          channels: channels.map((ch) => {
            const channelPolicy = serverPolicies.find((p) => p.channelId === ch.id)
            return {
              id: ch.id,
              name: ch.name,
              type: ch.type,
              policy: channelPolicy
                ? {
                    listen: channelPolicy.listen,
                    reply: channelPolicy.reply,
                    mentionOnly: channelPolicy.mentionOnly,
                    config: channelPolicy.config,
                  }
                : defaultPolicy,
            }
          }),
        }
      }),
    )

    return {
      buddyId,
      buddyUserId: buddy.userId,
      servers,
    }
  }

  /**
   * Auto-create default server-wide policy when a buddy is added to a server.
   */
  async ensureServerDefault(buddyId: string, serverId: string) {
    const existing = await this.deps.buddyPolicyDao.findServerDefault(buddyId, serverId)
    if (existing) return existing
    return this.deps.buddyPolicyDao.upsert({
      buddyId,
      serverId,
      channelId: null,
      listen: true,
      reply: true,
      mentionOnly: false,
      config: {},
    })
  }
}
