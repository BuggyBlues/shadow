/** @vitest-environment jsdom */
import { screen } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import { ShopOrders } from '../../../src/components/shop/shop-orders'
import { fetchApiMock, renderWithQuery, resetMocks, serverId } from '../_shared/test-helpers'

describe('S04/C01 search filter sort combined', () => {
  beforeEach(() => resetMocks())
  it('切换状态过滤时应触发带 status 的请求', async () => {
    fetchApiMock.mockImplementation((path: string) => {
      if (String(path).includes('/shop/orders'))
        return Promise.resolve([
          {
            id: 'o1',
            orderNo: 'NO1',
            shopId: 's1',
            buyerId: 'u1',
            status: 'pending',
            totalAmount: 1,
            currency: 'CNY',
            createdAt: '2026-01-01T00:00:00.000Z',
            items: [
              {
                id: 'i1',
                productId: 'p1',
                productName: 'A',
                specValues: [],
                price: 1,
                quantity: 1,
              },
            ],
          },
        ])
      return Promise.resolve({})
    })
    renderWithQuery(<ShopOrders serverId={serverId} />)
    expect(await screen.findByText('#NO1')).toBeTruthy()
  })
})
