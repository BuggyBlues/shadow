import { z } from 'zod'

export const registerSchema = z.object({
  email: z.string().email('Invalid email address'),
  username: z
    .string()
    .min(3, 'Username must be at least 3 characters')
    .max(32, 'Username must be at most 32 characters')
    .regex(
      /^[a-zA-Z0-9_-]+$/,
      'Username can only contain letters, numbers, hyphens and underscores',
    )
    .optional(),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(128, 'Password must be at most 128 characters'),
  displayName: z.string().max(64).optional(),
  inviteCode: z.string().max(64).optional(),
  referralCode: z.string().max(64).optional(),
})

export const loginSchema = z.object({
  email: z.string().min(1, 'Username or email is required').max(128, 'Input is too long'),
  password: z.string().min(1, 'Password is required'),
})

export const emailLoginStartSchema = z.object({
  email: z.string().email('Invalid email address'),
  locale: z.string().max(16).optional(),
})

export const emailLoginVerifySchema = z.object({
  email: z.string().email('Invalid email address'),
  code: z.string().min(4).max(12),
  displayName: z.string().max(64).optional(),
})

export const googleIdTokenSchema = z.object({
  credential: z.string().min(1),
})

export const changePasswordSchema = z
  .object({
    oldPassword: z.string().min(1, 'Current password is required'),
    newPassword: z
      .string()
      .min(8, 'New password must be at least 8 characters')
      .max(128, 'New password must be at most 128 characters'),
    confirmPassword: z.string().min(1, 'Password confirmation is required'),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  })

export type RegisterInput = z.infer<typeof registerSchema>
export type LoginInput = z.infer<typeof loginSchema>
export type EmailLoginStartInput = z.infer<typeof emailLoginStartSchema>
export type EmailLoginVerifyInput = z.infer<typeof emailLoginVerifySchema>
export type GoogleIdTokenInput = z.infer<typeof googleIdTokenSchema>
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>
