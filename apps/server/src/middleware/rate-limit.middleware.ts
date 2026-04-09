import type { Context, MiddlewareHandler } from 'hono'
import { createClient, type RedisClientType } from 'redis'
import { logger } from '../lib/logger'

export interface RateLimitOptions {
  /** Max requests per window */
  max: number
  /** Window duration in seconds */
  windowSec: number
  /** Key prefix for Redis */
  prefix?: string
  /** Custom key extractor (default: client IP) */
  keyFn?: (c: Context) => string
  /** Custom error response */
  onLimit?: (c: Context) => Response
}

const defaultKey = (c: Context): string => {
  return c.req.header('x-forwarded-for') ?? c.req.header('x-real-ip') ?? 'unknown'
}

const defaultOnLimit = (c: Context): Response => {
  return c.json({ error: 'Too Many Requests', message: 'Rate limit exceeded. Try again later.' }, 429)
}

// Lazy, shared Redis client — created once, reused across requests
let redisClient: RedisClientType | null = null
let redisConnecting: Promise<RedisClientType | null> | null = null

async function getRateLimitRedis(): Promise<RedisClientType | null> {
  if (redisClient) return redisClient
  if (redisConnecting) return redisConnecting

  const redisUrl = process.env.REDIS_URL
  if (!redisUrl) return null

  redisConnecting = (async () => {
    try {
      const client = createClient({ url: redisUrl })
      client.on('error', (err) => logger.error({ err }, 'Rate limiter Redis error'))
      await client.connect()
      redisClient = client
      return client
    } catch (err) {
      logger.error({ err }, 'Rate limiter: Redis connection failed')
      return null
    } finally {
      redisConnecting = null
    }
  })()

  return redisConnecting
}

/**
 * Rate limiting middleware backed by Redis.
 * Uses sliding window counter algorithm via sorted sets.
 * Falls back to no-op if Redis is unavailable.
 */
export function rateLimit(options: RateLimitOptions): MiddlewareHandler {
  const { max, windowSec, prefix = 'rl', keyFn = defaultKey, onLimit = defaultOnLimit } = options

  return async (c, next) => {
    const redis = await getRateLimitRedis()
    if (!redis) {
      // Redis unavailable — skip rate limiting (don't block traffic)
      return next()
    }

    const key = `${prefix}:${keyFn(c)}`
    const now = Date.now()
    const windowStart = now - windowSec * 1000

    // Use Redis sorted set: score = timestamp, member = unique request id
    const pipeline = redis.multi()
    // Remove expired entries
    pipeline.zRemRangeByScore(key, 0, windowStart)
    // Count current window
    pipeline.zCard(key)
    // Add current request
    pipeline.zAdd(key, { score: now, value: `${now}-${Math.random().toString(36).slice(2, 10)}` })
    // Set expiry on the key (window + 1s buffer)
    pipeline.expire(key, windowSec + 1)

    const results = await pipeline.exec()
    const count = results?.[1] as number ?? 0

    // Set rate limit headers
    c.header('X-RateLimit-Limit', String(max))
    c.header('X-RateLimit-Remaining', String(Math.max(0, max - count - 1)))
    c.header('X-RateLimit-Reset', String(Math.ceil((now + windowSec * 1000) / 1000)))

    if (count >= max) {
      // Remove the request we just added (it's over the limit)
      await redis.zRemRangeByScore(key, now, now)
      logger.info({ key, count, max }, 'Rate limit exceeded')
      return onLimit(c)
    }

    return next()
  }
}
