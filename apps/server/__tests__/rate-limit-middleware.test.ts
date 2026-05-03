import { Hono } from 'hono'
import { describe, expect, it } from 'vitest'
import { createRateLimitMiddleware } from '../src/middleware/rate-limit.middleware'

describe('createRateLimitMiddleware', () => {
  it('returns 429 after the configured request limit', async () => {
    const app = new Hono()
    app.get(
      '/limited',
      createRateLimitMiddleware({
        namespace: `test-${Date.now()}`,
        windowMs: 60_000,
        limit: 2,
        keyGenerator: () => 'same-client',
      }),
      (c) => c.json({ ok: true }),
    )

    expect((await app.request('/limited')).status).toBe(200)
    expect((await app.request('/limited')).status).toBe(200)

    const limited = await app.request('/limited')
    expect(limited.status).toBe(429)
    expect(await limited.json()).toMatchObject({
      ok: false,
      code: 'RATE_LIMITED',
    })
    expect(limited.headers.get('Retry-After')).toBeTruthy()
  })
})
