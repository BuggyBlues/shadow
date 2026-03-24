import type { EmailVerificationDao } from '../dao/email-verification.dao'
import type { UserDao } from '../dao/user.dao'
import { randomFixedDigits } from '../lib/id'
import { logger } from '../lib/logger'

export class EmailVerificationService {
  constructor(
    private deps: {
      emailVerificationDao: EmailVerificationDao
      userDao: UserDao
    },
  ) {}

  /**
   * Send verification code to email
   * Returns the code (in production, this would send an actual email)
   */
  async sendCode(email: string): Promise<{ success: boolean; message: string }> {
    const { emailVerificationDao, userDao } = this.deps

    // Check if user exists with this email
    const user = await userDao.findByEmail(email)
    if (!user) {
      throw Object.assign(new Error('User not found'), { status: 404 })
    }

    // Check if email is already verified
    if (user.emailVerified) {
      throw Object.assign(new Error('Email is already verified'), { status: 409 })
    }

    // Rate limit: max 3 codes per hour
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000)
    const recentCodes = await emailVerificationDao.countRecentCodes(email, oneHourAgo)
    if (recentCodes >= 3) {
      throw Object.assign(new Error('Too many verification attempts. Please try again later.'), {
        status: 429,
      })
    }

    // Generate 6-digit code
    const code = randomFixedDigits(6)

    // Set expiration to 10 minutes
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000)

    // Store in database
    await emailVerificationDao.create({
      email,
      code,
      expiresAt,
    })

    // TODO: Send actual email via email service
    // For now, log the code for development
    logger.info({ email, code }, 'Verification code generated (development mode)')

    return {
      success: true,
      message: 'Verification code sent successfully',
    }
  }

  /**
   * Verify email with code
   */
  async verifyCode(email: string, code: string): Promise<{ success: boolean; message: string }> {
    const { emailVerificationDao, userDao } = this.deps

    // Find valid verification record
    const verification = await emailVerificationDao.findValidByEmailAndCode(email, code)
    if (!verification) {
      throw Object.assign(new Error('Invalid or expired verification code'), { status: 400 })
    }

    // Mark verification as used
    await emailVerificationDao.markVerified(verification.id)

    // Update user's emailVerified status
    await userDao.updateEmailVerified(email, true)

    return {
      success: true,
      message: 'Email verified successfully',
    }
  }
}
