import { zValidator } from '@hono/zod-validator'
import { Hono } from 'hono'
import { z } from 'zod'
import type { AppContainer } from '../container'
import { verifyToken } from '../lib/jwt'
import { authMiddleware } from '../middleware/auth.middleware'
import { loginSchema, registerSchema } from '../validators/auth.schema'
import { forceDisconnectUser } from '../ws/presence.gateway'

export function createAuthHandler(container: AppContainer) {
  const authHandler = new Hono()

  // POST /api/auth/register
  authHandler.post('/register', zValidator('json', registerSchema), async (c) => {
    const authService = container.resolve('authService')
    const input = c.req.valid('json')
    const result = await authService.register(input)
    return c.json(result, 201)
  })

  // POST /api/auth/login
  authHandler.post('/login', zValidator('json', loginSchema), async (c) => {
    const authService = container.resolve('authService')
    const input = c.req.valid('json')
    const result = await authService.login(input)
    return c.json(result)
  })

  // POST /api/auth/refresh
  authHandler.post(
    '/refresh',
    zValidator('json', z.object({ refreshToken: z.string() })),
    async (c) => {
      const authService = container.resolve('authService')
      const { refreshToken } = c.req.valid('json')
      const result = await authService.refresh(refreshToken)
      return c.json(result)
    },
  )

  // GET /api/auth/me
  authHandler.get('/me', authMiddleware, async (c) => {
    const authService = container.resolve('authService')
    const user = c.get('user')
    const result = await authService.getMe(user.userId)
    return c.json(result)
  })

  // PATCH /api/auth/me — update profile
  authHandler.patch(
    '/me',
    authMiddleware,
    zValidator(
      'json',
      z.object({
        displayName: z.string().max(64).optional(),
        avatarUrl: z.string().nullable().optional(),
      }),
    ),
    async (c) => {
      const authService = container.resolve('authService')
      const user = c.get('user')
      const input = c.req.valid('json')
      const result = await authService.updateProfile(user.userId, input)
      return c.json(result)
    },
  )

  // POST /api/auth/disconnect — beacon-based disconnect on page close
  authHandler.post('/disconnect', async (c) => {
    try {
      const body = await c.req.json<{ token?: string }>()
      if (body.token) {
        const payload = verifyToken(body.token)
        if (payload.userId) {
          const io = container.resolve('io')
          forceDisconnectUser(payload.userId, io, container)
        }
      }
    } catch {
      // Silently ignore — beacon fires on best-effort basis
    }
    return c.json({ ok: true })
  })

  return authHandler
}
