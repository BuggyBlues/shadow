/** @vitest-environment jsdom */

import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'
import { ShopCart } from '../../../src/components/shop/shop-cart'
import { fetchApiMock, renderWithQuery, resetMocks, serverId } from '../_shared/test-helpers'

describe('S05/C02 cart quantity boundary 1-99', () => {
  beforeEach(() => resetMocks())

  it('加减数量应落在 1~99 区间', async () => {
    fetchApiMock.mockImplementation((path: string, options?: RequestInit) => {
      if (String(path).includes('/shop/cart') && (!options?.method || options.method === 'GET')) {
        return Promise.resolve([
          {
            id: 'c1',
            userId: 'u1',
            shopId: 's1',
            productId: 'p1',
            quantity: 1,
            product: { id: 'p1', name: '商品A', status: 'active', basePrice: 100 },
            sku: null,
            imageUrl: null,
            unitPrice: 100,
          },
        ])
      }
      if (String(path).includes('/shop/cart') && options?.method === 'POST') {
        return Promise.resolve({ ok: true })
      }
      return Promise.resolve({})
    })

    renderWithQuery(<ShopCart serverId={serverId} />)
    await screen.findByText('商品A')

    const minusBtn = screen.getAllByRole('button').find((b) => b.innerHTML.includes('lucide-minus'))
    const plusBtn = screen.getAllByRole('button').find((b) => b.innerHTML.includes('lucide-plus'))

    if (!minusBtn || !plusBtn) throw new Error('quantity buttons not found')

    await userEvent.click(minusBtn)
    await userEvent.click(plusBtn)

    await waitFor(() => {
      const postCalls = fetchApiMock.mock.calls.filter(
        (c) => String(c[0]).includes('/shop/cart') && c[1]?.method === 'POST',
      )
      expect(postCalls.length).toBe(2)
      const first = JSON.parse(String(postCalls[0][1]?.body)) as { quantity: number }
      const second = JSON.parse(String(postCalls[1][1]?.body)) as { quantity: number }
      expect(first.quantity).toBe(1)
      expect(second.quantity).toBe(2)
    })
  })
})
