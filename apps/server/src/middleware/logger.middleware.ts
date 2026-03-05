import type { Context, Next } from 'hono'
import { logger } from '../lib/logger'

export async function loggerMiddleware(c: Context, next: Next): Promise<void> {
  const start = Date.now()
  const { method, url } = c.req

  await next()

  const duration = Date.now() - start
  const status = c.res.status

  logger.info(
    {
      method,
      url,
      status,
      duration: `${duration}ms`,
    },
    `${method} ${new URL(url).pathname} ${status} ${duration}ms`,
  )
}
