/** @vitest-environment jsdom */
import { fireEvent, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'
import { ShopCart } from '../../../src/components/shop/shop-cart'
import {
  fetchApiMock,
  renderWithQuery,
  resetMocks,
  serverId,
  showToastMock,
} from '../_shared/test-helpers'

describe('S05/C06 checkout 400 insufficient stock', () => {
  beforeEach(() => resetMocks())
  it('库存不足时应报错', async () => {
    fetchApiMock.mockImplementation((path: string, options?: RequestInit) => {
      if (String(path).includes('/shop/cart') && (!options?.method || options.method === 'GET'))
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
      if (String(path).includes('/shop/orders') && options?.method === 'POST')
        return Promise.reject(new Error('库存不足(400)'))
      return Promise.resolve({})
    })
    renderWithQuery(<ShopCart serverId={serverId} />)
    await screen.findByText('商品A')
    fireEvent.click(screen.getAllByRole('checkbox')[1] as HTMLInputElement)
    await userEvent.click(screen.getByRole('button', { name: /去结算/ }))
    await waitFor(() => expect(showToastMock).toHaveBeenCalledWith('库存不足(400)', 'error'))
  })
})
