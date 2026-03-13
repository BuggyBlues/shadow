import { zValidator } from '@hono/zod-validator'
import { Hono } from 'hono'
import { z } from 'zod'
import type { AppContainer } from '../container'
import { authMiddleware } from '../middleware/auth.middleware'

export function createTaskCenterHandler(container: AppContainer) {
  const h = new Hono()

  h.use('*', authMiddleware)

  h.get('/tasks', async (c) => {
    const user = c.get('user') as { userId: string }
    const service = container.resolve('taskCenterService')
    return c.json(await service.getTaskCenter(user.userId))
  })

  h.post(
    '/tasks/:taskKey/claim',
    zValidator('param', z.object({ taskKey: z.string().min(1) })),
    async (c) => {
      const user = c.get('user') as { userId: string }
      const { taskKey } = c.req.valid('param')
      const service = container.resolve('taskCenterService')
      return c.json(await service.claimTask(user.userId, taskKey))
    },
  )

  h.get('/tasks/referral-summary', async (c) => {
    const user = c.get('user') as { userId: string }
    const service = container.resolve('taskCenterService')
    return c.json(await service.getReferralSummary(user.userId))
  })

  h.get('/tasks/rewards', async (c) => {
    const user = c.get('user') as { userId: string }
    const service = container.resolve('taskCenterService')
    const limit = Number(c.req.query('limit')) || 30
    const offset = Number(c.req.query('offset')) || 0
    return c.json(await service.getRewardHistory(user.userId, limit, offset))
  })

  return h
}
