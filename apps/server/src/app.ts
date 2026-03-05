import { Hono } from 'hono'
import { cors } from 'hono/cors'
import type { AppContainer } from './container'
import { createAdminHandler } from './handlers/admin.handler'
import { createAuthHandler } from './handlers/auth.handler'
import { createChannelHandler } from './handlers/channel.handler'
import { createDmHandler } from './handlers/dm.handler'
import { createMediaHandler } from './handlers/media.handler'
import { createMessageHandler } from './handlers/message.handler'
import { createNotificationHandler } from './handlers/notification.handler'
import { createSearchHandler } from './handlers/search.handler'
import { createServerHandler } from './handlers/server.handler'
import { errorMiddleware } from './middleware/error.middleware'
import { loggerMiddleware } from './middleware/logger.middleware'

export function createApp(container: AppContainer) {
  const app = new Hono()

  // Global middleware
  app.use('*', cors())
  app.use('*', errorMiddleware)
  app.use('*', loggerMiddleware)

  // Health check
  app.get('/health', (c) => c.json({ status: 'ok', timestamp: new Date().toISOString() }))

  // API routes
  app.route('/api/auth', createAuthHandler(container))
  app.route('/api/servers', createServerHandler(container))
  app.route('/api', createChannelHandler(container))
  app.route('/api', createMessageHandler(container))
  app.route('/api/search', createSearchHandler(container))
  app.route('/api/dm', createDmHandler(container))
  app.route('/api/notifications', createNotificationHandler(container))
  app.route('/api/media', createMediaHandler(container))
  app.route('/api/admin', createAdminHandler(container))

  // 404 handler
  app.notFound((c) => c.json({ error: 'Not Found' }, 404))

  return app
}
