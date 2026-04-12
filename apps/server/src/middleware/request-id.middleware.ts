import type { Context, Next } from 'hono'
import { logger } from '../lib/logger'

export async function requestIdMiddleware(c: Context, next: Next): Promise<void> {
  const requestId = c.req.header('x-request-id') ?? crypto.randomUUID()
  c.set('requestId' as never, requestId as never)
  c.header('x-request-id', requestId)

  const start = Date.now()
  const { method, url } = c.req

  await next()

  const duration = Date.now() - start
  const status = c.res.status
  // 5xx → error, 4xx → warn, 2xx/3xx → debug (reduce production noise)
  const level = status >= 500 ? 'error' : status >= 400 ? 'warn' : 'info'

  logger[level](
    { requestId, method, url, status, duration },
    `${method} ${new URL(url).pathname} ${status} ${duration}ms`,
  )
}
