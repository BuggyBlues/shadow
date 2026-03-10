/** @vitest-environment jsdom */
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'
import { fetchApiMock, renderWithQuery, resetMocks, serverId } from '../_shared/test-helpers'
import { ShopAdmin } from '../../../src/components/shop/shop-admin'

describe('S02/C07 gallery persist after reopen edit', () => {
  beforeEach(() => resetMocks())

  it('商品列表项无 media 时，进入编辑应请求详情并回显画廊', async () => {
    fetchApiMock.mockImplementation((path: string, options?: RequestInit) => {
      if (String(path).includes('/shop/categories')) return Promise.resolve([])
      if (String(path).includes('/shop/products') && (!options?.method || options.method === 'GET')) {
        return Promise.resolve({ products: [{ id: 'p1', shopId: 's1', name: '商品A', slug: 'a', type: 'physical', status: 'active', basePrice: 9, currency: 'CNY', specNames: [], tags: [], salesCount: 0, avgRating: 0, ratingCount: 0, createdAt: '2026-01-01T00:00:00.000Z' }], total: 1 })
      }
      if (String(path).includes('/shop/products/p1') && (!options?.method || options.method === 'GET')) {
        return Promise.resolve({ id: 'p1', shopId: 's1', name: '商品A', slug: 'a', type: 'physical', status: 'active', basePrice: 9, currency: 'CNY', specNames: [], tags: [], salesCount: 0, avgRating: 0, ratingCount: 0, media: [{ id: 'm1', type: 'image', url: '/persist.png', position: 0 }], skus: [], createdAt: '2026-01-01T00:00:00.000Z' })
      }
      return Promise.resolve({})
    })

    renderWithQuery(<ShopAdmin serverId={serverId} onBack={() => {}} />)
    await screen.findByText('商品A')
    await userEvent.click(screen.getByTitle('编辑商品'))

    await waitFor(() => {
      expect(fetchApiMock.mock.calls.some((c) => String(c[0]).includes(`/api/servers/${serverId}/shop/products/p1`))).toBe(true)
    })
  })
})
