import type { Context } from 'hono'
import type { AppContainer } from '../container'
import { logger } from '../lib/logger'
import { getRedisClient } from '../lib/redis'

/**
 * Readiness check — verifies DB and Redis connectivity.
 * Returns 200 when all dependencies are healthy, 503 when degraded.
 */
export async function readinessCheck(c: Context, container: AppContainer) {
  const checks: Record<string, { status: string; error?: string }> = {}

  // DB check
  try {
    const { db } = await import('../db')
    await db.execute('SELECT 1')
    checks.database = { status: 'ok' }
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown'
    checks.database = { status: 'error', error: msg }
    logger.error({ err }, 'Health check: database unreachable')
  }

  // Redis check
  try {
    const redis = await getRedisClient()
    if (redis) {
      await redis.ping()
      checks.redis = { status: 'ok' }
    } else {
      checks.redis = { status: 'disabled' }
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown'
    checks.redis = { status: 'error', error: msg }
    logger.error({ err }, 'Health check: redis unreachable')
  }

  const allOk = Object.values(checks).every((c) => c.status !== 'error')
  return c.json(
    { status: allOk ? 'ok' : 'degraded', checks, timestamp: new Date().toISOString() },
    allOk ? 200 : 503,
  )
}
