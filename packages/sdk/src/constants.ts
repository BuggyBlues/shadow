// Re-export shared event constants for convenience

export type { ClientEvent, ServerEvent } from '@shadowob/shared'
export { CLIENT_EVENTS, SERVER_EVENTS } from '@shadowob/shared'

// ─── Room helpers ───────────────────────────────────────────────────────────

/** Build a Socket.IO room name for a channel */
export const channelRoom = (channelId: string) => `channel:${channelId}` as const

/** Build a Socket.IO room name for a thread */
export const threadRoom = (threadId: string) => `thread:${threadId}` as const

/** Build a Socket.IO room name for user-level notifications */
export const userRoom = (userId: string) => `user:${userId}` as const
