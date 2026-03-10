/** @vitest-environment jsdom */

import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'
import { ShopAdmin } from '../../../src/components/shop/shop-admin'
import { fetchApiMock, renderWithQuery, resetMocks, serverId } from '../_shared/test-helpers'

describe('S03/C01 settings initial read render', () => {
  beforeEach(() => resetMocks())

  it('进入店铺设置时应展示已保存的信息', async () => {
    fetchApiMock.mockImplementation((path: string, options?: RequestInit) => {
      if (String(path).endsWith('/shop') && (!options?.method || options.method === 'GET')) {
        return Promise.resolve({
          id: 's1',
          name: '银河旗舰店',
          description: '欢迎来到银河旗舰店',
          logoUrl: '/logo.png',
          bannerUrl: '/banner.png',
        })
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

    expect(await screen.findByDisplayValue('银河旗舰店')).toBeTruthy()
    expect(screen.getByDisplayValue('欢迎来到银河旗舰店')).toBeTruthy()
  })
})
