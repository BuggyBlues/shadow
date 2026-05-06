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
      params?: Record<string, unknown>
    }
    const status = appError.status ?? 500
    const errorCode = appError.code ?? (status >= 500 ? 'INTERNAL_ERROR' : undefined)

    logger.error({ err: error, path: c.req.path, method: c.req.method }, message)

    return c.json(
      {
        error: errorCode ?? message,
        ...(errorCode ? { code: errorCode } : {}),
        ...(appError.params ? { params: appError.params } : {}),
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
