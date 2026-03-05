import type { Context, Next } from 'hono'
import { logger } from '../lib/logger'

export async function errorMiddleware(c: Context, next: Next): Promise<Response | undefined> {
  try {
    await next()
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal Server Error'
    const status = (error as { status?: number }).status ?? 500

    logger.error({ err: error, path: c.req.path, method: c.req.method }, message)

    return c.json(
      {
        error: status >= 500 ? 'Internal Server Error' : message,
        ...(process.env.NODE_ENV !== 'production' && status >= 500 ? { detail: message } : {}),
      },
      status as 500,
    )
  }
}
