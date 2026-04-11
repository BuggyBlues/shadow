/** @vitest-environment jsdom */
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ShopAdmin } from '../../../src/components/shop/shop-admin'
import {
  fetchApiMock,
  renderWithQuery,
  resetMocks,
  serverId,
  showToastMock,
} from '../_shared/test-helpers'

describe('S01/C07 category delete 500 error toast', () => {
  beforeEach(() => {
    resetMocks()
    vi.spyOn(window, 'confirm').mockReturnValue(true)
  })
  it('删除分类失败应提示错误', async () => {
    fetchApiMock.mockImplementation((path: string, options?: RequestInit) => {
      if (String(path).includes('/shop/products') && (!options?.method || options.method === 'GET'))
        return Promise.resolve({ products: [], total: 0 })
      if (
        String(path).endsWith('/shop/categories') &&
        (!options?.method || options.method === 'GET')
      )
        return Promise.resolve([
          { id: 'c1', shopId: 's1', name: '默认分类', slug: 'default', position: 0 },
        ])
      if (String(path).includes('/shop/categories/c1') && options?.method === 'DELETE')
        return Promise.reject(new Error('shop.deleteCategoryError(500)'))
      return Promise.resolve({})
    })
    renderWithQuery(<ShopAdmin serverId={serverId} onBack={() => {}} />)
    await userEvent.click(await screen.findByRole('button', { name: '分类管理' }))
    const btn = screen.getAllByRole('button').find((b) => b.className.includes('hover:text-danger'))
    if (!btn) throw new Error('delete button missing')
    await userEvent.click(btn)
    await waitFor(() =>
      expect(showToastMock).toHaveBeenCalledWith('shop.deleteCategoryError(500)', 'error'),
    )
  })
})
