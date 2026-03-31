/**
 * Secret handler — encrypted secret & environment variable management.
 */

import { Hono } from 'hono'
import type { HandlerContext } from './types.js'

export function createSecretHandler(ctx: HandlerContext): Hono {
  const app = new Hono()

  // ── Provider Secrets ──────────────────────────────────────────────────

  app.get('/secrets', (c) => {
    const secrets = ctx.secretDao.findAll()
    return c.json({ secrets })
  })

  app.get('/secrets/:providerId', (c) => {
    const providerId = c.req.param('providerId')
    const secrets = ctx.secretDao.findByProvider(providerId)
    return c.json({ secrets })
  })

  app.put('/secrets/:providerId', async (c) => {
    const providerId = c.req.param('providerId')
    try {
      const body = await c.req.json<{ key: string; value: string; groupName?: string }>()
      if (!body.key || !body.value) {
        return c.json({ error: 'key and value are required' }, 400)
      }
      ctx.secretDao.upsert(providerId, body.key, body.value, body.groupName)
      return c.json({ ok: true })
    } catch (err) {
      return c.json({ error: (err as Error).message }, 400)
    }
  })

  app.delete('/secrets/:providerId/:key', (c) => {
    const providerId = c.req.param('providerId')
    const key = c.req.param('key')
    ctx.secretDao.delete(providerId, key)
    return c.json({ ok: true })
  })

  app.delete('/secrets/:providerId', (c) => {
    const providerId = c.req.param('providerId')
    ctx.secretDao.deleteProvider(providerId)
    return c.json({ ok: true })
  })

  // ── Environment Variables ─────────────────────────────────────────────

  app.get('/env', (c) => {
    const envVars = ctx.envVarDao.findAllMasked()
    return c.json({ envVars })
  })

  app.get('/env/:scope', (c) => {
    const scope = c.req.param('scope')
    const envVars = ctx.envVarDao.findByScope(scope)
    return c.json({ envVars })
  })

  app.put('/env/:scope', async (c) => {
    const scope = c.req.param('scope')
    try {
      const body = await c.req.json<{ key: string; value: string; isSecret?: boolean; groupName?: string }>()
      if (!body.key || body.value === undefined) {
        return c.json({ error: 'key and value are required' }, 400)
      }
      ctx.envVarDao.upsert(scope, body.key, body.value, body.isSecret ?? true, body.groupName)
      return c.json({ ok: true })
    } catch (err) {
      return c.json({ error: (err as Error).message }, 400)
    }
  })

  app.delete('/env/:scope/:key', (c) => {
    const scope = c.req.param('scope')
    const key = c.req.param('key')
    ctx.envVarDao.delete(scope, key)
    return c.json({ ok: true })
  })

  return app
}
