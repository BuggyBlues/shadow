/** @vitest-environment jsdom */

import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'
import { ShopAdmin } from '../../../src/components/shop/shop-admin'
import {
  fetchApiMock,
  renderWithQuery,
  resetMocks,
  serverId,
  showToastMock,
} from '../_shared/test-helpers'

describe('S03/C03 settings save 400 error toast', () => {
  beforeEach(() => resetMocks())

  it('保存参数非法(400)时应提示错误', async () => {
    fetchApiMock.mockImplementation((path: string, options?: RequestInit) => {
      if (String(path).endsWith('/shop') && (!options?.method || options.method === 'GET')) {
        return Promise.resolve({
          id: 's1',
          name: '旧店铺',
          description: 'old',
          logoUrl: '',
          bannerUrl: '',
        })
      }
      if (String(path).endsWith('/shop') && options?.method === 'PUT') {
        return Promise.reject(new Error('参数非法(400)'))
      }
      if (String(path).includes('/shop/products') && (!options?.method || options.method === 'GET'))
        return Promise.resolve({ products: [], total: 0 })
      if (
        String(path).includes('/shop/categories') &&
        (!options?.method || options.method === 'GET')
      )
        return Promise.resolve([])
      return Promise.resolve({})
    })

    renderWithQuery(<ShopAdmin serverId={serverId} onBack={() => {}} />)
    await userEvent.click(await screen.findByRole('button', { name: '店铺设置' }))

    await userEvent.click(screen.getByRole('button', { name: '保存最新设置' }))

    await waitFor(() => {
      expect(showToastMock).toHaveBeenCalledWith('参数非法(400)', 'error')
    })
  })
})
