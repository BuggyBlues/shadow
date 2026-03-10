/** @vitest-environment jsdom */
import { beforeEach, describe, expect, it } from 'vitest'
import { fetchApiMock, resetMocks } from '../_shared/test-helpers'

describe('S08/C01 seller publish buyer visible', () => {
  beforeEach(() => resetMocks())
  it('卖家上架后买家列表可见（请求层）', async () => {
    const products = [{ id: 'p1', name: '商品A' }]
    fetchApiMock.mockResolvedValueOnce({ id: 'p1' })
    fetchApiMock.mockResolvedValueOnce({ products, total: 1 })
    await fetchApiMock('/api/servers/s1/shop/products', { method: 'POST' })
    const result = (await fetchApiMock('/api/servers/s1/shop/products', { method: 'GET' })) as {
      products: Array<{ id: string }>
    }
    expect(result.products[0].id).toBe('p1')
  })
})
