/** @vitest-environment jsdom */
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'
import { ShopCart } from '../../../src/components/shop/shop-cart'
import { fetchApiMock, renderWithQuery, resetMocks, serverId } from '../_shared/test-helpers'

describe('S05/C01 cart select all and total calc', () => {
  beforeEach(() => resetMocks())
  it('全选后结算按钮数量应变化', async () => {
    fetchApiMock.mockImplementation((path: string) => {
      if (String(path).includes('/shop/cart'))
        return Promise.resolve([
          {
            id: 'c1',
            userId: 'u1',
            shopId: 's1',
            productId: 'p1',
            quantity: 1,
            product: { id: 'p1', name: '商品A', status: 'active', basePrice: 10 },
            sku: null,
            imageUrl: null,
            unitPrice: 10,
          },
        ])
      return Promise.resolve({})
    })
    renderWithQuery(<ShopCart serverId={serverId} />)
    await screen.findByText('商品A')
    await userEvent.click(screen.getAllByRole('checkbox')[0])
    expect(screen.getByRole('button', { name: /去结算/ })).toBeTruthy()
  })
})
