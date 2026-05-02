import { Hono } from 'hono'
import type { AppContainer } from '../container'
import { authMiddleware } from '../middleware/auth.middleware'

async function canSearchChannel(container: AppContainer, channelId: string, userId: string) {
  const channelService = container.resolve('channelService')
  const serverDao = container.resolve('serverDao')
  const channelMemberDao = container.resolve('channelMemberDao')
  const channel = await channelService.getById(channelId)
  const serverMember = await serverDao.getMember(channel.serverId, userId)
  if (!serverMember) return false
  if (!channel.isPrivate) return true
  const channelMember = await channelMemberDao.get(channelId, userId)
  return Boolean(channelMember || serverMember.role === 'owner' || serverMember.role === 'admin')
}

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
    const user = c.get('user')

    if (channelId && !(await canSearchChannel(container, channelId, user.userId))) {
      return c.json({ ok: false, error: 'Not a member of this channel' }, 403)
    }

    const messages = await searchService.searchMessages(query, {
      serverId,
      channelId,
      from,
      hasAttachment,
      limit,
    })
    return c.json(messages)
  })

  return searchHandler
}
