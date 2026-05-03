import { createHash } from 'node:crypto'
import { Hono } from 'hono'
import type { AppContainer } from '../container'
import { createRateLimitMiddleware } from '../middleware/rate-limit.middleware'

function authRateKey(authHeader?: string | null) {
  return createHash('sha256')
    .update(authHeader || 'anonymous')
    .digest('hex')
}

function openAIError(status: number, message: string, code: string) {
  return new Response(
    JSON.stringify({
      error: {
        message,
        type: status === 401 ? 'authentication_error' : 'invalid_request_error',
        code,
      },
    }),
    { status, headers: { 'Content-Type': 'application/json' } },
  )
}

export function createModelProxyHandler(container: AppContainer) {
  const handler = new Hono()
  const rateLimit = createRateLimitMiddleware({
    namespace: 'model-proxy',
    windowMs: 60_000,
    limit: Number.parseInt(process.env.SHADOW_MODEL_PROXY_RATE_LIMIT_PER_MINUTE ?? '', 10) || 60,
    keyGenerator: (c) => authRateKey(c.req.header('authorization')),
  })

  handler.use('*', rateLimit)

  handler.get('/models', async (c) => {
    const service = container.resolve('modelProxyService')
    try {
      await service.resolveIdentity(c.req.header('authorization'))
      return c.json(service.modelsResponse())
    } catch (err) {
      const error = err as { status?: number; code?: string }
      return openAIError(
        error.status ?? 401,
        err instanceof Error ? err.message : 'Unauthorized',
        error.code ?? 'MODEL_PROXY_UNAUTHORIZED',
      )
    }
  })

  handler.get('/billing', async (c) => {
    const service = container.resolve('modelProxyService')
    try {
      await service.resolveIdentity(c.req.header('authorization'))
      return c.json(service.billingResponse())
    } catch (err) {
      const error = err as { status?: number; code?: string }
      return openAIError(
        error.status ?? 401,
        err instanceof Error ? err.message : 'Unauthorized',
        error.code ?? 'MODEL_PROXY_UNAUTHORIZED',
      )
    }
  })

  handler.post('/chat/completions', async (c) => {
    const service = container.resolve('modelProxyService')
    let identity: Awaited<ReturnType<typeof service.resolveIdentity>>
    try {
      identity = await service.resolveIdentity(c.req.header('authorization'))
    } catch (err) {
      const error = err as { status?: number; code?: string }
      return openAIError(
        error.status ?? 401,
        err instanceof Error ? err.message : 'Unauthorized',
        error.code ?? 'MODEL_PROXY_UNAUTHORIZED',
      )
    }

    let body: Record<string, unknown>
    try {
      body = (await c.req.json()) as Record<string, unknown>
    } catch {
      return openAIError(400, 'Request body must be valid JSON', 'MODEL_PROXY_INVALID_REQUEST')
    }

    return service.proxyChatCompletions(identity, body, c.req.raw.signal)
  })

  return handler
}
