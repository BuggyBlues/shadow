export const LIMITS = {
  /** Max message content length */
  MESSAGE_CONTENT_MAX: 4000,
  /** Max username length */
  USERNAME_MAX: 32,
  /** Min username length */
  USERNAME_MIN: 3,
  /** Max display name length */
  DISPLAY_NAME_MAX: 64,
  /** Max server name length */
  SERVER_NAME_MAX: 100,
  /** Max channel name length */
  CHANNEL_NAME_MAX: 100,
  /** Max thread name length */
  THREAD_NAME_MAX: 100,
  /** Max file upload size (10MB) */
  FILE_UPLOAD_MAX_SIZE: 10 * 1024 * 1024,
  /** Messages per page (cursor pagination) */
  MESSAGES_PER_PAGE: 50,
  /** Max servers per user */
  SERVERS_PER_USER_MAX: 100,
  /** Max channels per server */
  CHANNELS_PER_SERVER_MAX: 200,
  /** Invite code length */
  INVITE_CODE_LENGTH: 8,
  /** Password min length */
  PASSWORD_MIN: 8,
  /** Max reactions per message per user */
  REACTIONS_PER_MESSAGE_MAX: 20,
} as const
