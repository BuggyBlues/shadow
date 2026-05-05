import { Hono } from 'hono'
import type { AppContainer } from '../container'
import { authMiddleware } from '../middleware/auth.middleware'

export function createSearchHandler(container: AppContainer) {
  const searchHandler = new Hono()

  searchHandler.use('*', authMiddleware)

  // GET /api/search/messages
  searchHandler.get('/messages', async (c) => {
    const searchService = container.resolve('searchService')
    const query = c.req.query('query') ?? ''
    const serverId = c.req.query('serverId')
    const channelId = c.req.query('channelId')
    const from = c.req.query('from')
    const hasAttachment = c.req.query('hasAttachment') === 'true' || undefined
    const limit = Number(c.req.query('limit') ?? '50')
    const actor = c.get('actor')

    if (channelId) {
      await container.resolve('policyService').requireChannelRead(actor, channelId)
    }

    const accessibleChannelIds = channelId
      ? [channelId]
      : await searchService.getAccessibleChannelIds(actor, serverId)

    const messages = await searchService.searchMessages(query, {
      serverId,
      channelId,
      accessibleChannelIds,
      from,
      hasAttachment,
      limit,
    })
    return c.json(messages)
  })

  return searchHandler
}
