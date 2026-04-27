import type { ShadowChannelPolicy, ShadowMessage } from '@shadowob/sdk'
import type { AgentChainMetadata, ShadowPolicyConfig, ShadowRuntimeLogger } from '../types.js'

export type ShadowMessagePreflightOk = {
  ok: true
  senderLabel: string
  policy?: ShadowChannelPolicy
  policyConfig?: ShadowPolicyConfig
  isProcessingBuddyMessage: boolean
  wasMentionedExplicitly: boolean
}

export type ShadowMessagePreflightResult = ShadowMessagePreflightOk | { ok: false; reason: string }

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

export function evaluateShadowMessagePreflight(params: {
  message: ShadowMessage
  botUserId: string
  botUsername: string
  channelPolicies: Map<string, ShadowChannelPolicy>
  runtime: ShadowRuntimeLogger
}): ShadowMessagePreflightResult {
  const { message, botUserId, botUsername, channelPolicies, runtime } = params
  const senderLabel = message.author?.username ?? message.authorId

  if (message.authorId === botUserId) {
    return { ok: false, reason: `[msg] Skipping own message ${message.id}` }
  }

  const policy = channelPolicies.get(message.channelId)
  const policyConfig = policy?.config as ShadowPolicyConfig | undefined
  let isProcessingBuddyMessage = false

  if (message.author?.isBot) {
    if (!policyConfig?.replyToBuddy) {
      return {
        ok: false,
        reason: `[msg] Skipping bot message from ${senderLabel} (replyToBuddy=false) (${message.id})`,
      }
    }

    const maxDepth = policyConfig.maxBuddyChainDepth ?? 3
    const chainMeta = (message as { metadata?: { agentChain?: AgentChainMetadata } }).metadata
      ?.agentChain
    if (chainMeta) {
      if (chainMeta.depth >= maxDepth) {
        return {
          ok: false,
          reason: `[msg] Buddy chain depth ${chainMeta.depth} >= max ${maxDepth}, stopping loop (${message.id})`,
        }
      }

      if (chainMeta.participants?.includes(botUserId)) {
        return {
          ok: false,
          reason: `[msg] Already in buddy chain [${chainMeta.participants.join(', ')}], skipping to prevent loop (${message.id})`,
        }
      }

      const senderAgentId = message.author?.id
      if (senderAgentId && policyConfig.buddyBlacklist?.includes(senderAgentId)) {
        return {
          ok: false,
          reason: `[msg] Sender agent ${senderAgentId} is in blacklist, skipping (${message.id})`,
        }
      }

      if (
        senderAgentId &&
        policyConfig.buddyWhitelist?.length &&
        !policyConfig.buddyWhitelist.includes(senderAgentId)
      ) {
        return {
          ok: false,
          reason: `[msg] Sender agent ${senderAgentId} not in whitelist, skipping (${message.id})`,
        }
      }
    }

    isProcessingBuddyMessage = true
    runtime.log?.(
      `[msg] Processing bot message from ${senderLabel} (replyToBuddy=true) (${message.id})`,
    )
  }

  if (policy && !policy.listen) {
    return {
      ok: false,
      reason: `[msg] Policy blocks listen for channel ${message.channelId}, skipping`,
    }
  }

  if (policy && !policy.reply) {
    return {
      ok: false,
      reason: `[msg] Policy blocks reply for channel ${message.channelId}, skipping (${message.id})`,
    }
  }

  let wasMentionedExplicitly = false
  if (policy?.mentionOnly) {
    const mentionRegex = new RegExp(`@${escapeRegex(botUsername)}(?:\\s|$)`, 'i')
    wasMentionedExplicitly = mentionRegex.test(message.content)
    if (!wasMentionedExplicitly) {
      return {
        ok: false,
        reason: `[msg] mentionOnly policy — no @${botUsername} mention found, skipping (${message.id})`,
      }
    }
    runtime.log?.(
      `[msg] mentionOnly policy — @${botUsername} mentioned, processing (${message.id})`,
    )
  }

  if (policyConfig?.replyToUsers?.length) {
    const allowedUsers = policyConfig.replyToUsers.map((u) => u.toLowerCase())
    const senderUser = (message.author?.username ?? '').toLowerCase()
    if (!allowedUsers.includes(senderUser)) {
      return {
        ok: false,
        reason: `[msg] replyToUsers policy — sender "${senderUser}" not in allowed list, skipping (${message.id})`,
      }
    }
  }

  if (policyConfig?.keywords?.length) {
    const lowerContent = message.content.toLowerCase()
    const matched = policyConfig.keywords.some((kw) => lowerContent.includes(kw.toLowerCase()))
    if (!matched) {
      return {
        ok: false,
        reason: `[msg] keywords policy — no matching keyword found, skipping (${message.id})`,
      }
    }
    runtime.log?.(`[msg] keywords policy — keyword matched, processing (${message.id})`)
  }

  const smartReplyEnabled = policyConfig?.smartReply !== false
  if (smartReplyEnabled && !isProcessingBuddyMessage && !wasMentionedExplicitly) {
    const mentionPattern = /@([a-zA-Z0-9_\-\u4e00-\u9fa5]+)/g
    const allMentions = message.content.match(mentionPattern) || []
    const mentionsWithoutSelf = allMentions.filter((m) => {
      const mentionedUser = m.slice(1).toLowerCase()
      return mentionedUser !== botUsername.toLowerCase()
    })

    if (allMentions.length > 0 && mentionsWithoutSelf.length === allMentions.length) {
      return {
        ok: false,
        reason: `[msg] Smart reply: message @mentions others (${allMentions.join(', ')}) but not @${botUsername}, skipping (${message.id})`,
      }
    }

    const replyToData = (message as { replyTo?: { authorId?: string } }).replyTo
    if (replyToData?.authorId && replyToData.authorId !== botUserId) {
      const selfMentioned = allMentions.some((m) => {
        const mentionedUser = m.slice(1).toLowerCase()
        return mentionedUser === botUsername.toLowerCase()
      })
      if (!selfMentioned) {
        return {
          ok: false,
          reason: `[msg] Smart reply: message is a reply to another user (${replyToData.authorId}), not this Buddy, skipping (${message.id})`,
        }
      }
    }
  }

  return {
    ok: true,
    senderLabel,
    policy,
    policyConfig,
    isProcessingBuddyMessage,
    wasMentionedExplicitly,
  }
}
