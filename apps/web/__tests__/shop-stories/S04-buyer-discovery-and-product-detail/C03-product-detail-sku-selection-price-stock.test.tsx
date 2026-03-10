/** @vitest-environment jsdom */
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'
import { ProductDetail } from '../../../src/components/shop/product-detail'
import { fetchApiMock, renderWithQuery, resetMocks, serverId } from '../_shared/test-helpers'

describe('S04/C03 product detail sku selection price stock', () => {
  beforeEach(() => resetMocks())
  it('选择规格后仍可触发购买动作', async () => {
    fetchApiMock.mockImplementation((path: string, options?: RequestInit) => {
      if (String(path).includes('/products/p1/reviews')) return Promise.resolve([])
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
          specNames: ['颜色'],
          tags: [],
          salesCount: 0,
          avgRating: 0,
          ratingCount: 0,
          createdAt: '2026-01-01T00:00:00.000Z',
          media: [],
          skus: [{ id: 'sku1', specValues: ['红'], price: 120, stock: 5, isActive: true }],
        })
      if (String(path).includes('/shop/orders') && options?.method === 'POST')
        return Promise.resolve({ id: 'o1' })
      return Promise.resolve({})
    })
    renderWithQuery(<ProductDetail serverId={serverId} productId="p1" onBack={() => {}} />)
    await userEvent.click(await screen.findByRole('button', { name: '红' }))
    const buyBtns = await screen.findAllByRole('button', { name: '立即购买' })
    await userEvent.click(buyBtns[0])
    expect(fetchApiMock.mock.calls.some((c) => String(c[0]).includes('/shop/orders'))).toBe(true)
  })
})
