import { zValidator } from '@hono/zod-validator'
import { Hono } from 'hono'
import type { AppContainer } from '../container'
import { authMiddleware } from '../middleware/auth.middleware'
import {
  createAppSchema,
  listAppsQuerySchema,
  publishFromWorkspaceSchema,
  updateAppSchema,
} from '../validators/app.schema'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export function createAppHandler(container: AppContainer) {
  const h = new Hono()
  h.use('*', authMiddleware)

  /* ─── Helpers ─── */

  async function resolveServerId(param: string): Promise<string> {
    if (UUID_RE.test(param)) return param
    const serverDao = container.resolve('serverDao')
    const server = await serverDao.findBySlug(param)
    if (!server) throw Object.assign(new Error('Server not found'), { status: 404 })
    return server.id
  }

  async function requireAdmin(serverId: string, userId: string) {
    const permissionService = container.resolve('permissionService')
    await permissionService.requireRole(serverId, userId, 'admin')
  }

  /* ══════════════════════════════════════════
     List & Get Apps
     ══════════════════════════════════════════ */

  // GET /servers/:serverId/apps — list apps (public: only active; admin: all)
  h.get('/servers/:serverId/apps', async (c) => {
    const serverId = await resolveServerId(c.req.param('serverId'))
    const user = c.get('user')
    const query = listAppsQuerySchema.parse({
      status: c.req.query('status'),
      limit: c.req.query('limit'),
      offset: c.req.query('offset'),
    })

    // Non-admins can only see active apps
    const permissionService = container.resolve('permissionService')
    let isAdmin = false
    try {
      await permissionService.requireRole(serverId, user.userId, 'admin')
      isAdmin = true
    } catch {}

    const appService = container.resolve('appService')
    const result = await appService.listApps(serverId, {
      status: isAdmin ? query.status : 'active',
      limit: query.limit,
      offset: query.offset,
    })
    return c.json(result)
  })

  // GET /servers/:serverId/apps/homepage — get homepage app
  h.get('/servers/:serverId/apps/homepage', async (c) => {
    const serverId = await resolveServerId(c.req.param('serverId'))
    const appService = container.resolve('appService')
    const app = await appService.getHomepageApp(serverId)
    if (!app) return c.json(null)
    return c.json(app)
  })

  // GET /servers/:serverId/apps/:appId — get single app
  h.get('/servers/:serverId/apps/:appId', async (c) => {
    const serverId = await resolveServerId(c.req.param('serverId'))
    const appService = container.resolve('appService')
    const appId = c.req.param('appId')

    // Support slug-based lookup
    const app = UUID_RE.test(appId)
      ? await appService.getApp(appId)
      : await appService.getAppBySlug(serverId, appId)

    // Increment view count
    await appService.viewApp(app.id)
    return c.json(app)
  })

  /* ══════════════════════════════════════════
     Admin: Create / Update / Delete
     ══════════════════════════════════════════ */

  // POST /servers/:serverId/apps — create app
  h.post('/servers/:serverId/apps', zValidator('json', createAppSchema), async (c) => {
    const serverId = await resolveServerId(c.req.param('serverId'))
    const user = c.get('user')
    await requireAdmin(serverId, user.userId)

    const appService = container.resolve('appService')
    const app = await appService.createApp(serverId, user.userId, c.req.valid('json'))
    return c.json(app, 201)
  })

  // PATCH /servers/:serverId/apps/:appId — update app
  h.patch('/servers/:serverId/apps/:appId', zValidator('json', updateAppSchema), async (c) => {
    const serverId = await resolveServerId(c.req.param('serverId'))
    const user = c.get('user')
    await requireAdmin(serverId, user.userId)

    const appService = container.resolve('appService')
    const result = await appService.updateApp(
      c.req.param('appId'),
      user.userId,
      c.req.valid('json'),
    )
    return c.json(result)
  })

  // DELETE /servers/:serverId/apps/:appId — delete app
  h.delete('/servers/:serverId/apps/:appId', async (c) => {
    const serverId = await resolveServerId(c.req.param('serverId'))
    const user = c.get('user')
    await requireAdmin(serverId, user.userId)

    const appService = container.resolve('appService')
    await appService.deleteApp(c.req.param('appId'), user.userId)
    return c.json({ ok: true })
  })

  /* ══════════════════════════════════════════
     Publish from Workspace
     ══════════════════════════════════════════ */

  // POST /servers/:serverId/apps/publish — publish zip from workspace
  h.post(
    '/servers/:serverId/apps/publish',
    zValidator('json', publishFromWorkspaceSchema),
    async (c) => {
      const serverId = await resolveServerId(c.req.param('serverId'))
      const user = c.get('user')
      await requireAdmin(serverId, user.userId)

      const appService = container.resolve('appService')
      const app = await appService.publishFromWorkspace(serverId, user.userId, c.req.valid('json'))
      return c.json(app, 201)
    },
  )

  return h
}
