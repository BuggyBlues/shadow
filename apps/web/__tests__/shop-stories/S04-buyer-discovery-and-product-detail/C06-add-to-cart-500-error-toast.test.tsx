/** @vitest-environment jsdom */
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'
import { ProductDetail } from '../../../src/components/shop/product-detail'
import {
  fetchApiMock,
  renderWithQuery,
  resetMocks,
  serverId,
  showToastMock,
} from '../_shared/test-helpers'

describe('S04/C06 add to cart 500 error toast', () => {
  beforeEach(() => resetMocks())
  it('加入购物车失败应提示错误', async () => {
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
      if (String(path).includes('/shop/cart') && options?.method === 'POST')
        return Promise.reject(new Error('shop.addToCartError(500)'))
      return Promise.resolve({})
    })
    renderWithQuery(<ProductDetail serverId={serverId} productId="p1" onBack={() => {}} />)
    const btns = await screen.findAllByRole('button', { name: '加入购物车' })
    await userEvent.click(btns[0])
    await waitFor(() =>
      expect(showToastMock).toHaveBeenCalledWith('shop.addToCartError(500)', 'error'),
    )
  })
})
