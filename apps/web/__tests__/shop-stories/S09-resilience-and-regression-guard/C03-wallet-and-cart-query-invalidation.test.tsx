/** @vitest-environment jsdom */
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'
import { ProductDetail } from '../../../src/components/shop/product-detail'
import { fetchApiMock, renderWithQuery, resetMocks, serverId } from '../_shared/test-helpers'

describe('S09/C03 wallet and cart query invalidation', () => {
  beforeEach(() => resetMocks())
  it('购买后应发生订单请求（可触发后续失效链）', async () => {
    fetchApiMock.mockImplementation((path: string, options?: RequestInit) => {
      if (String(path).includes('/reviews')) return Promise.resolve([])
      if (String(path).includes('/products/p1'))
        return Promise.resolve({
          id: 'p1',
          shopId: 's1',
          name: '商品',
          slug: 'p1',
          type: 'physical',
          status: 'active',
          basePrice: 100,
          currency: 'CNY',
          specNames: [],
          tags: [],
          salesCount: 0,
          avgRating: 0,
          ratingCount: 0,
          createdAt: '2026-01-01T00:00:00.000Z',
          media: [],
          skus: [],
        })
      if (String(path).includes('/shop/orders') && options?.method === 'POST')
        return Promise.resolve({ id: 'o1' })
      return Promise.resolve({})
    })
    renderWithQuery(<ProductDetail serverId={serverId} productId="p1" onBack={() => {}} />)
    const buy = await screen.findAllByRole('button', { name: '立即购买' })
    await userEvent.click(buy[0])
    await waitFor(() =>
      expect(
        fetchApiMock.mock.calls.some(
          (c) => String(c[0]).includes('/shop/orders') && c[1]?.method === 'POST',
        ),
      ).toBe(true),
    )
  })
})
