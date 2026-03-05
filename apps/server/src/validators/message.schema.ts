import { LIMITS } from '@shadow/shared'
import { z } from 'zod'

export const sendMessageSchema = z.object({
  content: z
    .string()
    .min(1, 'Message content is required')
    .max(
      LIMITS.MESSAGE_CONTENT_MAX,
      `Message must be at most ${LIMITS.MESSAGE_CONTENT_MAX} characters`,
    ),
  threadId: z.string().uuid().optional(),
  replyToId: z.string().uuid().optional(),
})

export const updateMessageSchema = z.object({
  content: z
    .string()
    .min(1, 'Message content is required')
    .max(
      LIMITS.MESSAGE_CONTENT_MAX,
      `Message must be at most ${LIMITS.MESSAGE_CONTENT_MAX} characters`,
    ),
})

export const createThreadSchema = z.object({
  name: z.string().min(1).max(100),
  parentMessageId: z.string().uuid(),
})

export const reactionSchema = z.object({
  emoji: z.string().min(1).max(32),
})

export type SendMessageInput = z.infer<typeof sendMessageSchema>
export type UpdateMessageInput = z.infer<typeof updateMessageSchema>
export type CreateThreadInput = z.infer<typeof createThreadSchema>
export type ReactionInput = z.infer<typeof reactionSchema>
