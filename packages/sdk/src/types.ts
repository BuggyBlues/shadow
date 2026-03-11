// ─── Shadow SDK Types ───────────────────────────────────────────────────────

/** Message returned by the Shadow REST API and Socket.IO broadcasts */
export interface ShadowMessage {
  id: string
  content: string
  channelId: string
  authorId: string
  threadId?: string | null
  replyToId?: string | null
  isPinned?: boolean
  createdAt: string
  updatedAt: string
  author?: {
    id: string
    username: string
    displayName?: string | null
    avatarUrl?: string | null
    isBot?: boolean
  }
  attachments?: ShadowAttachment[]
}

export interface ShadowAttachment {
  id: string
  filename: string
  url: string
  contentType: string
  size: number
  width?: number | null
  height?: number | null
}

export interface ShadowChannel {
  id: string
  name: string
  type: string
  serverId: string
  description?: string | null
  position?: number
}

export interface ShadowDmChannel {
  id: string
  user1Id: string
  user2Id: string
  createdAt: string
}

export interface ShadowThread {
  id: string
  name: string
  channelId: string
  parentMessageId: string
  createdAt: string
}

export interface ShadowMember {
  userId: string
  serverId: string
  role: string
  user?: ShadowUser
}

export interface ShadowInviteCode {
  id: string
  code: string
  createdBy: string
  usedBy?: string | null
  usedAt?: string | null
  isActive: boolean
  note?: string | null
  createdAt: string
}

export interface ShadowServer {
  id: string
  name: string
  slug: string
  description: string | null
  iconUrl: string | null
  bannerUrl: string | null
  homepageHtml: string | null
  isPublic: boolean
}

export interface ShadowUser {
  id: string
  username: string
  displayName?: string
  avatarUrl?: string
  isBot?: boolean
  agentId?: string
}

export interface ShadowNotification {
  id: string
  userId: string
  type: string
  title: string
  body: string
  referenceId?: string
  referenceType?: string
  isRead: boolean
  createdAt: string
}

// ─── Channel Policy Types ───────────────────────────────────────────────────

export interface ShadowChannelPolicy {
  listen: boolean
  reply: boolean
  mentionOnly: boolean
  config: Record<string, unknown>
}

export interface ShadowRemoteChannel {
  id: string
  name: string
  type: string
  policy: ShadowChannelPolicy
}

export interface ShadowRemoteServer {
  id: string
  name: string
  slug?: string
  iconUrl?: string | null
  defaultPolicy: ShadowChannelPolicy
  channels: ShadowRemoteChannel[]
}

export interface ShadowRemoteConfig {
  agentId: string
  botUserId: string
  servers: ShadowRemoteServer[]
}

// ─── Socket Event Payloads ──────────────────────────────────────────────────

export interface TypingPayload {
  channelId: string
  userId: string
  username: string
}

export interface PresenceChangePayload {
  userId: string
  status: 'online' | 'idle' | 'dnd' | 'offline'
}

export interface PresenceActivityPayload {
  userId: string
  activity: string | null
  channelId: string
}

export interface MemberJoinPayload {
  channelId: string
  userId: string
}

export interface MemberLeavePayload {
  channelId: string
  userId: string
}

export interface ReactionPayload {
  messageId: string
  userId: string
  emoji: string
}

export interface MessageDeletedPayload {
  id: string
  channelId: string
}

export interface ChannelCreatedPayload {
  id: string
  name: string
  type: string
  serverId: string
}

export interface ChannelMemberAddedPayload {
  channelId: string
  userId: string
}

export interface ChannelMemberRemovedPayload {
  channelId: string
  userId: string
}

export interface ServerJoinedPayload {
  serverId: string
  serverName: string
}

export interface PolicyChangedPayload {
  agentId: string
  serverId: string
  channelId?: string | null
}

export interface DmMessage {
  id: string
  content: string
  senderId: string
  receiverId: string
  createdAt: string
}

// ─── Socket Event Map ───────────────────────────────────────────────────────

/** Events the server pushes to the client */
export interface ServerEventMap {
  'message:new': (message: ShadowMessage) => void
  'message:updated': (message: ShadowMessage) => void
  'message:deleted': (payload: MessageDeletedPayload) => void
  'member:typing': (payload: TypingPayload) => void
  'member:join': (payload: MemberJoinPayload) => void
  'member:leave': (payload: MemberLeavePayload) => void
  'presence:change': (payload: PresenceChangePayload) => void
  'presence:activity': (payload: PresenceActivityPayload) => void
  'reaction:add': (payload: ReactionPayload) => void
  'reaction:remove': (payload: ReactionPayload) => void
  'notification:new': (notification: ShadowNotification) => void
  'dm:message:new': (message: DmMessage) => void
  'channel:created': (payload: ChannelCreatedPayload) => void
  'channel:member-added': (payload: ChannelMemberAddedPayload) => void
  'channel:member-removed': (payload: ChannelMemberRemovedPayload) => void
  'server:joined': (payload: ServerJoinedPayload) => void
  'agent:policy-changed': (payload: PolicyChangedPayload) => void
  error: (payload: { message: string }) => void
}

/** Events the client sends to the server */
export interface ClientEventMap {
  'channel:join': (data: { channelId: string }, ack?: (res: { ok: boolean }) => void) => void
  'channel:leave': (data: { channelId: string }) => void
  'message:send': (data: {
    channelId: string
    content: string
    threadId?: string
    replyToId?: string
  }) => void
  'message:typing': (data: { channelId: string }) => void
  'presence:update': (data: { status: 'online' | 'idle' | 'dnd' | 'offline' }) => void
  'presence:activity': (data: { channelId: string; activity: string | null }) => void
}
