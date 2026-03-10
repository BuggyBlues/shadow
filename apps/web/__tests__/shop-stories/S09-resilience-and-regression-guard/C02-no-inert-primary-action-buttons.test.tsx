/** @vitest-environment jsdom */
import { screen } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import { ProductDetail } from '../../../src/components/shop/product-detail'
import { fetchApiMock, renderWithQuery, resetMocks, serverId } from '../_shared/test-helpers'

describe('S09/C02 no inert primary action buttons', () => {
  beforeEach(() => resetMocks())
  it('详情页应存在可点击主操作按钮', async () => {
    fetchApiMock.mockImplementation((path: string) => {
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
      return Promise.resolve({})
    })
    renderWithQuery(<ProductDetail serverId={serverId} productId="p1" onBack={() => {}} />)
    expect((await screen.findAllByRole('button', { name: '立即购买' })).length).toBeGreaterThan(0)
  })
})
