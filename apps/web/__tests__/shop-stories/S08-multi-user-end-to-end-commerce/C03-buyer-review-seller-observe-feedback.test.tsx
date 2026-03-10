/** @vitest-environment jsdom */
import { beforeEach, describe, expect, it } from 'vitest'
import { fetchApiMock, resetMocks } from '../_shared/test-helpers'

describe('S08/C03 buyer review seller observe feedback', () => {
  beforeEach(() => resetMocks())
  it('买家评价后服务端可返回评价记录', async () => {
    fetchApiMock.mockResolvedValueOnce({ ok: true })
    fetchApiMock.mockResolvedValueOnce([{ id: 'r1', rating: 5 }])
    await fetchApiMock('/api/servers/s1/shop/orders/o1/review', { method: 'POST' })
    const reviews = (await fetchApiMock('/api/servers/s1/shop/products/p1/reviews', {
      method: 'GET',
    })) as Array<{ id: string }>
    expect(reviews[0].id).toBe('r1')
  })
})
