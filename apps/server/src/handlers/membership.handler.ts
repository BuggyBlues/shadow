import { zValidator } from '@hono/zod-validator'
import { Hono } from 'hono'
import { z } from 'zod'
import type { AppContainer } from '../container'
import { authMiddleware } from '../middleware/auth.middleware'

export function createMembershipHandler(container: AppContainer) {
  const handler = new Hono()

  handler.use('*', authMiddleware)

  handler.get('/me', async (c) => {
    const user = c.get('user')
    const membershipService = container.resolve('membershipService')
    return c.json(await membershipService.getMembership(user.userId))
  })

  handler.post(
    '/redeem-invite',
    zValidator(
      'json',
      z.object({
        code: z.string().min(1).max(64),
      }),
    ),
    async (c) => {
      const user = c.get('user')
      const membershipService = container.resolve('membershipService')
      const { code } = c.req.valid('json')
      return c.json(await membershipService.redeemInviteCode(user.userId, code))
    },
  )

  return handler
}
