import { zValidator } from '@hono/zod-validator'
import { Hono } from 'hono'
import { z } from 'zod'
import type { AppContainer } from '../container'
import { authMiddleware } from '../middleware/auth.middleware'

export function createAdminHandler(container: AppContainer) {
  const adminHandler = new Hono()

  adminHandler.use('*', authMiddleware)

  // TODO: Add admin role check middleware

  // GET /api/admin/users
  adminHandler.get('/users', async (c) => {
    const userDao = container.resolve('userDao')
    const limit = Number(c.req.query('limit') ?? '50')
    const offset = Number(c.req.query('offset') ?? '0')
    const users = await userDao.findAll(limit, offset)
    return c.json(users)
  })

  // PATCH /api/admin/users/:id
  adminHandler.patch(
    '/users/:id',
    zValidator(
      'json',
      z.object({
        displayName: z.string().optional(),
        status: z.enum(['online', 'idle', 'dnd', 'offline']).optional(),
      }),
    ),
    async (c) => {
      const userDao = container.resolve('userDao')
      const id = c.req.param('id')
      const input = c.req.valid('json')
      const user = await userDao.update(id, input)
      return c.json(user)
    },
  )

  // GET /api/admin/servers
  adminHandler.get('/servers', async (c) => {
    const serverDao = container.resolve('serverDao')
    const limit = Number(c.req.query('limit') ?? '50')
    const offset = Number(c.req.query('offset') ?? '0')
    const servers = await serverDao.findAll(limit, offset)
    return c.json(servers)
  })

  // DELETE /api/admin/servers/:id
  adminHandler.delete('/servers/:id', async (c) => {
    const serverDao = container.resolve('serverDao')
    const id = c.req.param('id')
    await serverDao.delete(id)
    return c.json({ success: true })
  })

  // GET /api/admin/agents
  adminHandler.get('/agents', async (c) => {
    const agentService = container.resolve('agentService')
    const agents = await agentService.getAll()
    return c.json(agents)
  })

  // POST /api/admin/agents/:id/restart
  adminHandler.post('/agents/:id/restart', async (c) => {
    const agentService = container.resolve('agentService')
    const id = c.req.param('id')
    const agent = await agentService.restart(id)
    return c.json(agent)
  })

  // GET /api/admin/stats
  adminHandler.get('/stats', async (c) => {
    const userDao = container.resolve('userDao')
    const serverDao = container.resolve('serverDao')
    const agentDao = container.resolve('agentDao')
    const users = await userDao.findAll(1, 0)
    const servers = await serverDao.findAll(1, 0)
    const agents = await agentDao.findAll(1, 0)

    // Basic stats - in production would use COUNT queries
    return c.json({
      totalUsers: users.length,
      totalServers: servers.length,
      totalAgents: agents.length,
    })
  })

  return adminHandler
}
