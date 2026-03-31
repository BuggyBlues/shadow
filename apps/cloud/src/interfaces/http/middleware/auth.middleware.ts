/**
 * Auth middleware — Bearer token authentication for external binds.
 */

import type { Context, Next } from 'hono'

export function createAuthMiddleware(authToken: string) {
  return async (c: Context, next: Next) => {
    const header = c.req.header('Authorization')
    if (!header) return c.json({ error: 'Authorization required' }, 401)
    const token = header.replace(/^Bearer\s+/i, '')
    if (token !== authToken) return c.json({ error: 'Invalid token' }, 403)
    await next()
  }
}
