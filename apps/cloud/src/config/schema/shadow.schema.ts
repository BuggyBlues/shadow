/**
 * Shadow plugin config types — servers, channels, buddies, bindings.
 */

import type { tags } from 'typia'

export interface ShadowServer {
  /** Unique identifier for this server in the config */
  id: string
  /** Display name for the server */
  name: string
  /** URL-friendly slug (auto-generated if omitted) */
  slug?: string
  /** Server description */
  description?: string
  /** Whether the server is publicly joinable */
  isPublic?: boolean
  /** Channels to create in this server */
  channels?: ShadowChannel[]
}

export interface ShadowChannel {
  /** Unique identifier for this channel in the config */
  id: string
  /** Channel display title */
  title: string
  /** Channel type (e.g. text, voice) */
  type?: string
  /** Channel description */
  description?: string
}

export interface ShadowBuddy {
  /** Unique identifier for this buddy in the config */
  id: string
  /** Display name */
  name: string
  /** Buddy description */
  description?: string
  /** Avatar image URL */
  avatarUrl?: string
}

/**
 * Reply policy mode — controls when a buddy replies to messages.
 *
 * - replyAll: reply to every message in bound channels
 * - mentionOnly: reply only when @mentioned
 * - custom: use keyword/user/buddy-based rules
 * - disabled: listen only, never reply (silent monitoring)
 */
export type ShadowReplyPolicyMode = 'replyAll' | 'mentionOnly' | 'custom' | 'disabled'

/**
 * Custom reply policy configuration.
 * Only used when mode is 'custom'.
 */
export interface ShadowCustomReplyPolicy {
  /** Reply only to messages from these usernames */
  replyToUsers?: string[]
  /** Reply only to messages containing these keywords (case-insensitive) */
  keywords?: string[]
  /** Smart reply: skip messages that @mention or reply-to someone else */
  smartReply?: boolean
  /** Allow replying to messages from other buddies/bots */
  replyToBuddy?: boolean
  /** Max depth of buddy-to-buddy conversation chain (prevents loops) */
  maxBuddyChainDepth?: number & tags.Type<'uint32'>
}

/**
 * Reply policy for a buddy binding.
 */
export interface ShadowReplyPolicy {
  /** Reply mode */
  mode: ShadowReplyPolicyMode
  /** Custom policy config (only used when mode is 'custom') */
  custom?: ShadowCustomReplyPolicy
}

export interface ShadowBinding {
  /** Target buddy/agent ID */
  targetId: string
  /** Type of target */
  targetType: 'buddy'
  /** Server config IDs this binding applies to */
  servers: string[]
  /** Channel config IDs this binding applies to */
  channels: string[]
  /** Agent deployment ID to bind */
  agentId: string
  /** Reply policy for this binding */
  replyPolicy?: ShadowReplyPolicy
}

export interface ShadowobPluginConfig {
  /** Shadow servers to provision */
  servers?: ShadowServer[]
  /** Buddy agents to create */
  buddies?: ShadowBuddy[]
  /** Binding rules connecting buddies to agents */
  bindings?: ShadowBinding[]
}

/**
 * Per-plugin instance config in the YAML config file.
 */
export interface PluginInstanceConfig {
  enabled?: boolean
  config?: Record<string, unknown>
  secrets?: Record<string, string>
  /** Per-agent overrides for this plugin */
  agents?: Record<
    string,
    {
      enabled?: boolean
      config?: Record<string, unknown>
      role?: string
    }
  >
}

/**
 * Plugins config — generic map with typed shadowob entry for backward compat.
 */
export interface PluginsConfig {
  shadowob?: ShadowobPluginConfig
  [pluginId: string]: PluginInstanceConfig | ShadowobPluginConfig | undefined
}
