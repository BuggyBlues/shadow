/** @vitest-environment jsdom */
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'
import { ShopAdmin } from '../../../src/components/shop/shop-admin'
import { fetchApiMock, renderWithQuery, resetMocks, serverId } from '../_shared/test-helpers'

describe('S01/C03 edit product persist and echo', () => {
  beforeEach(() => resetMocks())

  it('编辑商品后应调用 PUT /shop/products/:id', async () => {
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
              name: '旧名',
              slug: 'old',
              type: 'physical',
              status: 'active',
              basePrice: 9,
              currency: 'CNY',
              specNames: [],
              tags: [],
              salesCount: 0,
              avgRating: 0,
              ratingCount: 0,
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
    await screen.findByText('旧名')
    await userEvent.click(screen.getByTitle('编辑商品'))
    const name = await screen.findByLabelText('商品名称 (必填)')
    await userEvent.clear(name)
    await userEvent.type(name, '新名')
    await userEvent.click(screen.getByRole('button', { name: '保存更改' }))
    await waitFor(() => {
      expect(
        fetchApiMock.mock.calls.some(
          (c) => String(c[0]).includes('/shop/products/p1') && c[1]?.method === 'PUT',
        ),
      ).toBe(true)
    })
  })
})
