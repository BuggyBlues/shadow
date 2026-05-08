import type { Context, Next } from 'hono'
import { logger } from '../lib/logger'

export async function loggerMiddleware(c: Context, next: Next): Promise<void> {
  const start = Date.now()
  const { method, url } = c.req
  const parsedUrl = new URL(url)
  const path = parsedUrl.pathname
  const safePath = path.replace(/^\/api\/media\/signed\/[^/]+$/, '/api/media/signed/[redacted]')
  const safeUrl = `${parsedUrl.origin}${safePath}${parsedUrl.search}`

  await next()

  const duration = Date.now() - start
  const status = c.res.status

  logger.info(
    {
      method,
      url: safeUrl,
      status,
      duration: `${duration}ms`,
    },
    `${method} ${safePath} ${status} ${duration}ms`,
  )
}
