/** @vitest-environment jsdom */
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'
import { ShopCart } from '../../../src/components/shop/shop-cart'
import { fetchApiMock, renderWithQuery, resetMocks, serverId } from '../_shared/test-helpers'

describe('S05/C03 cart remove item success refresh', () => {
  beforeEach(() => resetMocks())
  it('删除购物车项应调用 DELETE', async () => {
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
      if (String(path).includes('/shop/cart/c1') && options?.method === 'DELETE')
        return Promise.resolve({ ok: true })
      return Promise.resolve({})
    })
    renderWithQuery(<ShopCart serverId={serverId} />)
    await screen.findByText('商品A')
    const trash = screen.getAllByRole('button').find((b) => b.innerHTML.includes('lucide-trash-2'))
    if (!trash) throw new Error('trash not found')
    await userEvent.click(trash)
    await waitFor(() =>
      expect(
        fetchApiMock.mock.calls.some(
          (c) => String(c[0]).includes('/shop/cart/c1') && c[1]?.method === 'DELETE',
        ),
      ).toBe(true),
    )
  })
})
