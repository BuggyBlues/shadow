import type { Context, Next } from 'hono'
import { logger } from '../lib/logger'

export async function errorMiddleware(c: Context, next: Next): Promise<Response | undefined> {
  try {
    await next()
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal Server Error'
    const appError = error as {
      status?: number
      code?: string
      capability?: string
      membership?: unknown
      requiredAmount?: number
      balance?: number
      shortfall?: number
      nextAction?: string
    }
    const status = appError.status ?? 500

    logger.error({ err: error, path: c.req.path, method: c.req.method }, message)

    return c.json(
      {
        error: status >= 500 ? 'Internal Server Error' : message,
        ...(appError.code ? { code: appError.code } : {}),
        ...(appError.capability ? { capability: appError.capability } : {}),
        ...(appError.membership ? { membership: appError.membership } : {}),
        ...(typeof appError.requiredAmount === 'number'
          ? { requiredAmount: appError.requiredAmount }
          : {}),
        ...(typeof appError.balance === 'number' ? { balance: appError.balance } : {}),
        ...(typeof appError.shortfall === 'number' ? { shortfall: appError.shortfall } : {}),
        ...(appError.nextAction ? { nextAction: appError.nextAction } : {}),
        ...(process.env.NODE_ENV !== 'production' && status >= 500 ? { detail: message } : {}),
      },
      status as 500,
    )
  }
}
