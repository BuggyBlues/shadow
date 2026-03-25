/**
 * Shadow OpenClaw Plugin — Type Definitions
 *
 * Project-specific types used by the Shadow channel plugin.
 * SDK types (ChannelPlugin, OpenClawConfig, etc.) are imported directly
 * from "openclaw/plugin-sdk/core".
 */

// ─── Shadow Account Config ─────────────────────────────────────────────────

export type ShadowAccountConfig = {
  token: string
  serverUrl: string
  enabled?: boolean
  agentId?: string
}

// ─── Shadow Policy Config (per-channel, from remote config) ─────────────────

export type ShadowPolicyConfig = {
  replyToBuddy?: boolean
  maxBuddyChainDepth?: number
  buddyBlacklist?: string[]
  buddyWhitelist?: string[]
  replyToUsers?: string[]
  keywords?: string[]
  smartReply?: boolean
}

// ─── Agent Chain Metadata (anti-loop tracking) ──────────────────────────────

export type AgentChainMetadata = {
  agentId: string
  depth: number
  participants: string[]
  startedAt?: number
  rootMessageId?: string
}

// ─── Message Context ────────────────────────────────────────────────────────

export type MsgContext = Record<string, unknown>

// ─── Reply Payload ──────────────────────────────────────────────────────────

export type ReplyPayload = {
  text?: string
  mediaUrl?: string
  mediaUrls?: string[]
  [key: string]: unknown
}

// ─── Typing Callbacks ───────────────────────────────────────────────────────

export type TypingCallbacks = {
  onReplyStart: () => Promise<void>
  onIdle?: () => void
  onCleanup?: () => void
}

export type CreateTypingCallbacksParams = {
  start: () => Promise<void>
  stop?: () => Promise<void>
  onStartError: (err: unknown) => void
  onStopError?: (err: unknown) => void
  keepaliveIntervalMs?: number
  maxDurationMs?: number
}

// ─── Plugin Runtime (provided by OpenClaw host) ─────────────────────────────

export type ChannelLogSink = {
  info: (msg: string) => void
  warn: (msg: string) => void
  error: (msg: string) => void
  debug: (msg: string) => void
}

export type PluginRuntimeChannel = {
  text: {
    resolveMarkdownTableMode: (params: {
      cfg: Record<string, unknown>
      channel: string
      accountId: string
    }) => string
    [key: string]: unknown
  }
  reply: {
    dispatchReplyWithBufferedBlockDispatcher: (params: {
      ctx: MsgContext
      cfg: Record<string, unknown>
      dispatcherOptions: {
        deliver: (payload: ReplyPayload) => Promise<void>
        [key: string]: unknown
      }
      replyOptions?: Record<string, unknown>
    }) => Promise<unknown>
    createReplyDispatcherWithTyping?: (options: {
      typingCallbacks?: TypingCallbacks
      deliver: (payload: ReplyPayload, info: { kind: string }) => Promise<void>
      onIdle?: () => void
      onCleanup?: () => void
      [key: string]: unknown
    }) => {
      dispatcher: {
        sendToolResult: (payload: ReplyPayload) => boolean
        sendBlockReply: (payload: ReplyPayload) => boolean
        sendFinalReply: (payload: ReplyPayload) => boolean
        waitForIdle: () => Promise<void>
        markComplete: () => void
      }
      replyOptions: Record<string, unknown>
      markDispatchIdle: () => void
      markRunComplete: () => void
    }
    finalizeInboundContext: (ctx: Partial<MsgContext>) => MsgContext
    formatAgentEnvelope: (params: {
      channel: string
      from: string
      timestamp?: number
      envelope: unknown
      body: string
    }) => string
    resolveEnvelopeFormatOptions: (cfg: Record<string, unknown>) => unknown
    [key: string]: unknown
  }
  routing: {
    resolveAgentRoute: (params: {
      cfg: Record<string, unknown>
      channel: string
      accountId: string
      peer: { kind: string; id: string }
    }) => { sessionKey: string; accountId: string; agentId: string; [key: string]: unknown }
    [key: string]: unknown
  }
  session: {
    resolveStorePath: (store: unknown, params: { agentId: string }) => string
    recordInboundSession: (params: {
      storePath: string
      sessionKey: string
      ctx: MsgContext
      onRecordError?: (err: unknown) => void
    }) => Promise<void>
    [key: string]: unknown
  }
  mentions: {
    buildMentionRegexes: (params: unknown) => RegExp[]
    matchesMentionPatterns: (params: unknown) => boolean
    [key: string]: unknown
  }
  debounce: {
    createInboundDebouncer: (params: unknown) => unknown
    resolveInboundDebounceMs: (params: unknown) => number
    [key: string]: unknown
  }
  [key: string]: unknown
}

export type PluginRuntime = {
  channel: PluginRuntimeChannel
  logging: {
    getChildLogger: (meta: Record<string, string>) => ChannelLogSink
    shouldLogVerbose: () => boolean
  }
  [key: string]: unknown
}
