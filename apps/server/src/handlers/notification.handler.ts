import { Hono } from 'hono'
import type { AppContainer } from '../container'
import { authMiddleware } from '../middleware/auth.middleware'

export function createNotificationHandler(container: AppContainer) {
  const notificationHandler = new Hono()

  notificationHandler.use('*', authMiddleware)

  // GET /api/notifications
  notificationHandler.get('/', async (c) => {
    const notificationService = container.resolve('notificationService')
    const user = c.get('user')
    const limit = Number(c.req.query('limit') ?? '50')
    const offset = Number(c.req.query('offset') ?? '0')
    const notifications = await notificationService.getByUserId(user.userId, limit, offset)
    return c.json(notifications)
  })

  // PATCH /api/notifications/:id/read
  notificationHandler.patch('/:id/read', async (c) => {
    const notificationService = container.resolve('notificationService')
    const id = c.req.param('id')
    const notification = await notificationService.markAsRead(id)
    return c.json(notification)
  })

  // POST /api/notifications/read-all
  notificationHandler.post('/read-all', async (c) => {
    const notificationService = container.resolve('notificationService')
    const user = c.get('user')
    await notificationService.markAllAsRead(user.userId)
    return c.json({ success: true })
  })

  // GET /api/notifications/unread-count
  notificationHandler.get('/unread-count', async (c) => {
    const notificationService = container.resolve('notificationService')
    const user = c.get('user')
    const count = await notificationService.getUnreadCount(user.userId)
    return c.json({ count })
  })

  return notificationHandler
}
