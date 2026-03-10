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

describe('S03/C02 settings update save success', () => {
  beforeEach(() => resetMocks())

  it('修改店铺设置后保存成功并提示', async () => {
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
        return Promise.resolve({ ok: true })
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

    const nameInput = await screen.findByPlaceholderText('给店铺起个响亮的名字')
    await userEvent.clear(nameInput)
    await userEvent.type(nameInput, '新店铺')

    await userEvent.click(screen.getByRole('button', { name: '保存最新设置' }))

    await waitFor(() => {
      const call = fetchApiMock.mock.calls.find(
        (c) => String(c[0]).endsWith('/shop') && c[1]?.method === 'PUT',
      )
      expect(call).toBeTruthy()
      const body = JSON.parse(String(call?.[1]?.body)) as { name: string }
      expect(body.name).toBe('新店铺')
    })

    await waitFor(() => {
      expect(showToastMock).toHaveBeenCalledWith('店铺设置已保存', 'success')
    })
  })
})
