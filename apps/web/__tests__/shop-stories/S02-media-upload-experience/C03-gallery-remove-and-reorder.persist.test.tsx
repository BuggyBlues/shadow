/** @vitest-environment jsdom */
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'
import { ShopAdmin } from '../../../src/components/shop/shop-admin'
import { fetchApiMock, renderWithQuery, resetMocks, serverId } from '../_shared/test-helpers'

describe('S02/C03 gallery remove and reorder persist', () => {
  beforeEach(() => resetMocks())
  it('删除一张画廊图片后保存应仅提交剩余媒体', async () => {
    fetchApiMock.mockImplementation((path: string, options?: RequestInit) => {
      if (String(path).includes('/shop/categories')) return Promise.resolve([])
      if (
        String(path).includes('/shop/products') &&
        (!options?.method || options.method === 'GET')
      ) {
        return Promise.resolve({
          products: [
            {
              id: 'p1',
              shopId: 's1',
              name: '商品A',
              slug: 'a',
              type: 'physical',
              status: 'active',
              basePrice: 9,
              currency: 'CNY',
              specNames: [],
              tags: [],
              salesCount: 0,
              avgRating: 0,
              ratingCount: 0,
              media: [
                { id: 'm1', type: 'image', url: '/1.png', position: 0 },
                { id: 'm2', type: 'image', url: '/2.png', position: 1 },
              ],
              createdAt: '2026-01-01T00:00:00.000Z',
            },
          ],
          total: 1,
        })
      }
      if (String(path).includes('/shop/products/p1') && options?.method === 'PUT')
        return Promise.resolve({ ok: true })
      return Promise.resolve({})
    })
    renderWithQuery(<ShopAdmin serverId={serverId} onBack={() => {}} />)
    await screen.findByText('商品A')
    await userEvent.click(screen.getByTitle('编辑商品'))
    const removeButtons = document.querySelectorAll('button')
    const target = Array.from(removeButtons).find((b) =>
      b.className.includes('hover:bg-rose-500'),
    ) as HTMLButtonElement | undefined
    if (target) await userEvent.click(target)
    await userEvent.click(screen.getByRole('button', { name: '保存更改' }))
    await waitFor(() => {
      const put = fetchApiMock.mock.calls.find(
        (c) => String(c[0]).includes('/shop/products/p1') && c[1]?.method === 'PUT',
      )
      expect(put).toBeTruthy()
    })
  })
})
