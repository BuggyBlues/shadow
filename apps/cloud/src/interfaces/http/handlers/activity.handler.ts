/**
 * Activity handler — activity log (DB-backed).
 */

import { Hono } from 'hono'
import type { HandlerContext } from './types.js'

export function createActivityHandler(ctx: HandlerContext): Hono {
  const app = new Hono()

  app.get('/activity', (c) => {
    const activities = ctx.activityDao.findAll()
    return c.json({ activities })
  })

  app.post('/activity', async (c) => {
    const entry = await c.req.json<Record<string, unknown>>()
    ctx.activityDao.create({
      type: (entry.type as string) ?? 'unknown',
      title: (entry.title as string) ?? '',
      detail: (entry.detail as string) ?? undefined,
      namespace: (entry.namespace as string) ?? undefined,
      template: (entry.template as string) ?? undefined,
    })
    return c.json({ success: true })
  })

  return app
}
