import { zValidator } from '@hono/zod-validator'
import { Hono } from 'hono'
import { z } from 'zod'
import type { AppContainer } from '../container'
import { authMiddleware } from '../middleware/auth.middleware'
import { messageMentionsSchema } from '../validators/message.schema'

const suggestQuerySchema = z.object({
  channelId: z.string().uuid(),
  trigger: z.enum(['@', '#']),
  q: z.string().max(128).optional(),
  limit: z.coerce.number().int().min(1).max(50).optional(),
})

const resolveSchema = z.object({
  channelId: z.string().uuid(),
  content: z.string().min(1).max(16000),
  mentions: messageMentionsSchema.optional(),
})

export function createMentionHandler(container: AppContainer) {
  const mentionHandler = new Hono()

  mentionHandler.use('*', authMiddleware)

  mentionHandler.get('/mentions/suggest', zValidator('query', suggestQuerySchema), async (c) => {
    const mentionService = container.resolve('mentionService')
    const user = c.get('user')
    const query = c.req.valid('query')
    const suggestions = await mentionService.suggest({
      userId: user.userId,
      channelId: query.channelId,
      trigger: query.trigger,
      query: query.q,
      limit: query.limit,
    })
    return c.json({ suggestions })
  })

  mentionHandler.post('/mentions/resolve', zValidator('json', resolveSchema), async (c) => {
    const mentionService = container.resolve('mentionService')
    const user = c.get('user')
    const input = c.req.valid('json')
    const mentions = await mentionService.resolveMentions({
      channelId: input.channelId,
      authorId: user.userId,
      content: input.content,
      clientMentions: input.mentions,
    })
    return c.json({ mentions })
  })

  return mentionHandler
}
