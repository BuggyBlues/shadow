import type { Context, MiddlewareHandler } from 'hono'
import { RedisStore, rateLimiter } from 'hono-rate-limiter'
import { createClient } from 'redis'
import { logger } from '../lib/logger'

// Lazy, shared Redis client for rate limiter store
let redisClient: ReturnType<typeof createClient> | null = null

function getRedisClient() {
  if (redisClient) return redisClient
  const redisUrl = process.env.REDIS_URL
  if (!redisUrl) return null
  redisClient = createClient({ url: redisUrl })
  redisClient.on('error', (err) => logger.error({ err }, 'Rate limiter Redis error'))
  void redisClient.connect().catch((err) => {
    logger.error({ err }, 'Rate limiter: Redis connection failed')
    redisClient = null
  })
  return redisClient
}

/**
 * Create a rate limiting middleware using hono-rate-limiter with Redis store.
 * Falls back to pass-through (no limit) if Redis is unavailable.
 */
export function rateLimit(opts: {
  /** Max requests per window */
  max: number
  /** Window duration in seconds */
  windowSec: number
  /** Key prefix (used as keyPrefix in RedisStore) */
  prefix?: string
}): MiddlewareHandler {
  const client = getRedisClient()
  if (!client) {
    // Redis unavailable — return pass-through middleware (don't block traffic)
    return async (_c, next) => next()
  }

  const store = new RedisStore({
    client,
    keyPrefix: opts.prefix ?? 'rl',
  })

  return rateLimiter({
    store,
    duration: opts.windowSec * 1000,
    max: opts.max,
    keyGenerator: (c) => c.req.header('x-forwarded-for') ?? c.req.header('x-real-ip') ?? 'unknown',
    errorBody: (c: Context) =>
      c.json({ error: 'Too Many Requests', message: 'Rate limit exceeded. Try again later.' }, 429),
  })
}
