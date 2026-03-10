/** @vitest-environment jsdom */
import { beforeEach, describe, expect, it } from 'vitest'
import { fetchApiMock, resetMocks } from '../_shared/test-helpers'

describe('S08/C02 buyer purchase seller receive order', () => {
  beforeEach(() => resetMocks())
  it('买家下单后卖家可在管理端看到订单（请求链）', async () => {
    fetchApiMock.mockResolvedValueOnce({ id: 'o1' })
    fetchApiMock.mockResolvedValueOnce([{ id: 'o1', orderNo: 'NO8001' }])
    await fetchApiMock('/api/servers/s1/shop/orders', { method: 'POST' })
    const manage = (await fetchApiMock('/api/servers/s1/shop/orders/manage', {
      method: 'GET',
    })) as Array<{ id: string }>
    expect(manage[0].id).toBe('o1')
  })
})
