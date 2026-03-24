import { z } from 'zod'

export const sendVerificationCodeSchema = z.object({
  email: z.string().email('Invalid email address'),
})

export const verifyEmailSchema = z.object({
  email: z.string().email('Invalid email address'),
  code: z
    .string()
    .length(6, 'Verification code must be 6 digits')
    .regex(/^\d+$/, 'Code must contain only digits'),
})

export type SendVerificationCodeInput = z.infer<typeof sendVerificationCodeSchema>
export type VerifyEmailInput = z.infer<typeof verifyEmailSchema>
