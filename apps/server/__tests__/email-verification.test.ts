/**
 * Email Verification — End-to-End Tests
 *
 * Tests the email verification flow:
 *   1. Send verification code
 *   2. Verify email with code
 *   3. Rate limiting
 *
 * Requires: docker compose postgres running on localhost:5432
 */

import { drizzle } from 'drizzle-orm/postgres-js'
import { Hono } from 'hono'
import postgres from 'postgres'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { type AppContainer, createAppContainer } from '../src/container'
import type { Database } from '../src/db'
import * as schema from '../src/db/schema'
import { createAuthHandler } from '../src/handlers/auth.handler'
import { signAccessToken } from '../src/lib/jwt'

/* ══════════════════════════════════════════════════════════
   Setup
   ══════════════════════════════════════════════════════════ */

const TEST_DB_URL = process.env.DATABASE_URL ?? 'postgresql://shadow:shadow@localhost:5432/shadow'

let sql: ReturnType<typeof postgres>
let db: Database
let container: AppContainer
let app: Hono

// Test identities
let testUserId: string
let testEmail: string
let testToken: string

/* ── Helper: make HTTP request through Hono ── */

async function req(
  method: string,
  path: string,
  opts?: { token?: string; body?: unknown; query?: Record<string, string> },
) {
  let url = `http://localhost${path}`
  if (opts?.query) {
    const params = new URLSearchParams(opts.query)
    url += `?${params.toString()}`
  }

  const init: RequestInit = { method }
  const headers: Record<string, string> = {}
  if (opts?.token) headers.Authorization = `Bearer ${opts.token}`
  if (opts?.body) {
    headers['Content-Type'] = 'application/json'
    init.body = JSON.stringify(opts.body)
  }
  init.headers = headers

  return app.request(url, init)
}

async function json<T = unknown>(res: Response): Promise<T> {
  return res.json() as Promise<T>
}

/* ── Setup & Teardown ── */

beforeAll(async () => {
  sql = postgres(TEST_DB_URL, { max: 5 })
  db = drizzle(sql, { schema })
  container = createAppContainer(db)

  // Create Hono app with auth handler
  app = new Hono()
  app.route('/api/auth', createAuthHandler(container))

  // Create test user directly in DB (bypass invite code requirement)
  const userDao = container.resolve('userDao')
  const ts = Date.now()
  const user = await userDao.create({
    email: `test-${ts}@example.com`,
    username: `testuser${ts}`,
    passwordHash: 'not-used',
  })
  testUserId = user!.id
  testEmail = user!.email

  testToken = signAccessToken({
    userId: testUserId,
    email: testEmail,
    username: user!.username,
  })
})

afterAll(async () => {
  await sql.end()
})

/* ══════════════════════════════════════════════════════════
   Tests
   ══════════════════════════════════════════════════════════ */

describe('Email Verification API', () => {
  describe('POST /api/auth/verify-email/send-code', () => {
    it('should send verification code for existing user', async () => {
      const res = await req('POST', '/api/auth/verify-email/send-code', {
        body: { email: testEmail },
      })
      expect(res.status).toBe(200)
      const data = await json(res)
      expect(data).toMatchObject({
        success: true,
        message: 'Verification code sent successfully',
      })
    })

    it('should return 404 for non-existent user', async () => {
      const res = await req('POST', '/api/auth/verify-email/send-code', {
        body: { email: 'nonexistent@example.com' },
      })
      expect(res.status).toBe(404)
      const data = await json(res)
      expect(data.error).toBe('User not found')
    })

    it('should return 400 for invalid email format', async () => {
      const res = await req('POST', '/api/auth/verify-email/send-code', {
        body: { email: 'invalid-email' },
      })
      expect(res.status).toBe(400)
    })
  })

  describe('POST /api/auth/verify-email/verify', () => {
    it('should return 400 for invalid code', async () => {
      const res = await req('POST', '/api/auth/verify-email/verify', {
        body: { email: testEmail, code: '000000' },
      })
      expect(res.status).toBe(400)
      const data = await json(res)
      expect(data.error).toBe('Invalid or expired verification code')
    })

    it('should return 400 for wrong code length', async () => {
      const res = await req('POST', '/api/auth/verify-email/verify', {
        body: { email: testEmail, code: '12345' },
      })
      expect(res.status).toBe(400)
    })

    it('should return 400 for non-numeric code', async () => {
      const res = await req('POST', '/api/auth/verify-email/verify', {
        body: { email: testEmail, code: 'abcdef' },
      })
      expect(res.status).toBe(400)
    })
  })

  describe('Rate limiting', () => {
    it('should limit code generation to 3 per hour', async () => {
      // Create a new user for rate limit test
      const userDao = container.resolve('userDao')
      const ts = Date.now()
      const rateTestUser = await userDao.create({
        email: `test-rate-${ts}@example.com`,
        username: `testrate${ts}`,
        passwordHash: 'not-used',
      })
      const rateTestEmail = rateTestUser!.email

      // Send 3 codes
      for (let i = 0; i < 3; i++) {
        const res = await req('POST', '/api/auth/verify-email/send-code', {
          body: { email: rateTestEmail },
        })
        expect(res.status).toBe(200)
      }

      // 4th request should be rate limited
      const res = await req('POST', '/api/auth/verify-email/send-code', {
        body: { email: rateTestEmail },
      })
      expect(res.status).toBe(429)
      const data = await json(res)
      expect(data.error).toContain('Too many verification attempts')
    })
  })

  describe('Email verification status', () => {
    it('should return user with emailVerified field', async () => {
      const res = await req('GET', '/api/auth/me', {
        token: testToken,
      })
      expect(res.status).toBe(200)
      const data = await json(res)
      expect(data).toHaveProperty('emailVerified')
      expect(typeof data.emailVerified).toBe('boolean')
    })
  })
})
