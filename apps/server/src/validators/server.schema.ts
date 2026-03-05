import { z } from 'zod'

export const createServerSchema = z.object({
  name: z
    .string()
    .min(1, 'Server name is required')
    .max(100, 'Server name must be at most 100 characters'),
  iconUrl: z.string().url().optional(),
})

export const updateServerSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  iconUrl: z.string().url().nullable().optional(),
})

export const joinServerSchema = z.object({
  inviteCode: z.string().length(8, 'Invite code must be 8 characters'),
})

export type CreateServerInput = z.infer<typeof createServerSchema>
export type UpdateServerInput = z.infer<typeof updateServerSchema>
export type JoinServerInput = z.infer<typeof joinServerSchema>
