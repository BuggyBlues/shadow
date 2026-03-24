import { and, eq, gt, isNull } from 'drizzle-orm'
import type { Database } from '../db'
import { emailVerifications } from '../db/schema'

export class EmailVerificationDao {
  constructor(private deps: { db: Database }) {}

  private get db() {
    return this.deps.db
  }

  /**
   * Create a new email verification code
   */
  async create(data: { email: string; code: string; expiresAt: Date }) {
    const result = await this.db
      .insert(emailVerifications)
      .values({
        email: data.email,
        code: data.code,
        expiresAt: data.expiresAt,
      })
      .returning()
    return result[0]
  }

  /**
   * Find a valid (non-expired, non-verified) verification by email and code
   */
  async findValidByEmailAndCode(email: string, code: string) {
    const result = await this.db
      .select()
      .from(emailVerifications)
      .where(
        and(
          eq(emailVerifications.email, email),
          eq(emailVerifications.code, code),
          gt(emailVerifications.expiresAt, new Date()),
          isNull(emailVerifications.verifiedAt),
        ),
      )
      .limit(1)
    return result[0] ?? null
  }

  /**
   * Mark a verification as verified
   */
  async markVerified(id: string) {
    const result = await this.db
      .update(emailVerifications)
      .set({ verifiedAt: new Date() })
      .where(eq(emailVerifications.id, id))
      .returning()
    return result[0] ?? null
  }

  /**
   * Delete expired and verified records older than the given date
   */
  async cleanupOlderThan(date: Date) {
    await this.db
      .delete(emailVerifications)
      .where(
        and(gt(emailVerifications.expiresAt, new Date()), eq(emailVerifications.verifiedAt, date)),
      )
  }

  /**
   * Count unverified codes for an email in the last N minutes
   */
  async countRecentCodes(email: string, since: Date) {
    const result = await this.db
      .select({ count: { value: emailVerifications.id } })
      .from(emailVerifications)
      .where(
        and(
          eq(emailVerifications.email, email),
          gt(emailVerifications.createdAt, since),
          isNull(emailVerifications.verifiedAt),
        ),
      )
    return result.length
  }
}
