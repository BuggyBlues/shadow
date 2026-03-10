/** @vitest-environment jsdom */

import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'
import { ShopOrders } from '../../../src/components/shop/shop-orders'
import { fetchApiMock, renderWithQuery, resetMocks, serverId } from '../_shared/test-helpers'

describe('S06/C03 order cancel forbidden status', () => {
  beforeEach(() => resetMocks())

  it('已完成订单不应出现取消订单按钮', async () => {
    fetchApiMock.mockImplementation((path: string) => {
      if (String(path).includes('/shop/orders')) {
        return Promise.resolve([
          {
            id: 'o1',
            orderNo: 'NO1001',
            shopId: 's1',
            buyerId: 'u1',
            status: 'completed',
            totalAmount: 30,
            currency: 'CNY',
            createdAt: '2026-01-01T00:00:00.000Z',
            items: [
              {
                id: 'i1',
                productId: 'p1',
                productName: '商品A',
                specValues: [],
                price: 30,
                quantity: 1,
              },
            ],
          },
        ])
      }
      return Promise.resolve({})
    })

    renderWithQuery(<ShopOrders serverId={serverId} />)

    await userEvent.click(await screen.findByText('#NO1001'))

    expect(screen.queryByRole('button', { name: '取消订单' })).toBeNull()
  })
})
