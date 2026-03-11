/** @vitest-environment jsdom */
import { fireEvent, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'
import { ShopCart } from '../../../src/components/shop/shop-cart'
import { fetchApiMock, renderWithQuery, resetMocks, serverId } from '../_shared/test-helpers'

describe('S05/C08 checkout omit null skuid', () => {
  beforeEach(() => resetMocks())

  it('结算 payload 中 skuId 为 null 时应省略字段', async () => {
    fetchApiMock.mockImplementation((path: string, options?: RequestInit) => {
      if (String(path).includes('/shop/cart') && (!options?.method || options.method === 'GET')) {
        return Promise.resolve([
          {
            id: 'c1',
            userId: 'u1',
            shopId: 's1',
            productId: 'p1',
            skuId: null,
            quantity: 1,
            product: { id: 'p1', name: '商品A', status: 'active', basePrice: 10 },
            sku: null,
            imageUrl: null,
            unitPrice: 10,
          },
        ])
      }
      if (String(path).includes('/shop/orders') && options?.method === 'POST')
        return Promise.resolve({ id: 'o1' })
      return Promise.resolve({})
    })

    renderWithQuery(<ShopCart serverId={serverId} />)
    await screen.findByText('商品A')
    fireEvent.click(screen.getAllByRole('checkbox')[1] as HTMLInputElement)
    await userEvent.click(screen.getByRole('button', { name: /去结算/ }))

    await waitFor(() => {
      const call = fetchApiMock.mock.calls.find(
        (c) => String(c[0]).includes('/shop/orders') && c[1]?.method === 'POST',
      )
      expect(call).toBeTruthy()
      const body = JSON.parse(String(call?.[1]?.body)) as { items: Array<Record<string, unknown>> }
      expect(body.items[0]).toEqual({ productId: 'p1', quantity: 1 })
    })
  })
})
