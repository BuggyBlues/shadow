import { zValidator } from '@hono/zod-validator'
import { Hono } from 'hono'
import type { AppContainer } from '../container'
import { authMiddleware } from '../middleware/auth.middleware'
import { createRateLimitMiddleware } from '../middleware/rate-limit.middleware'
import { playLaunchSchema } from '../validators/play.schema'

export function createPlayHandler(container: AppContainer) {
  const handler = new Hono()
  const launchRateLimit = createRateLimitMiddleware({
    namespace: 'play-launch',
    windowMs: 60_000,
    limit: 30,
    keyGenerator: (c) => c.get('user')?.userId ?? 'anonymous',
  })

  handler.get('/catalog', async (c) => {
    const playLaunchService = container.resolve('playLaunchService')
    return c.json({ plays: await playLaunchService.listCatalog() })
  })

  handler.use('*', authMiddleware)

  handler.post('/launch', launchRateLimit, zValidator('json', playLaunchSchema), async (c) => {
    const user = c.get('user')
    const playLaunchService = container.resolve('playLaunchService')
    const input = c.req.valid('json')
    const host = c.req.header('x-forwarded-host') ?? c.req.header('host')
    const proto = c.req.header('x-forwarded-proto') ?? 'http'
    return c.json(
      await playLaunchService.launch(user.userId, input, {
        authHeader: c.req.header('authorization'),
        origin: host ? `${proto}://${host}` : undefined,
      }),
    )
  })

  return handler
}
