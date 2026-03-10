/** @vitest-environment jsdom */

import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'
import { ShopAdmin } from '../../../src/components/shop/shop-admin'
import { fetchApiMock, renderWithQuery, resetMocks, serverId } from '../_shared/test-helpers'

describe('S02/C01 create product and save', () => {
  beforeEach(() => resetMocks())

  it('点击添加商品并保存应调用创建接口', async () => {
    fetchApiMock.mockImplementation((path: string, options?: RequestInit) => {
      if (
        String(path).includes('/shop/categories') &&
        (!options?.method || options.method === 'GET')
      )
        return Promise.resolve([])
      if (String(path).includes('/shop/products') && (!options?.method || options.method === 'GET'))
        return Promise.resolve({ products: [], total: 0 })
      if (String(path).includes('/shop/products') && options?.method === 'POST')
        return Promise.resolve({ id: 'p-new' })
      return Promise.resolve({})
    })

    renderWithQuery(<ShopAdmin serverId={serverId} onBack={() => {}} />)

    await userEvent.click(await screen.findByRole('button', { name: '添加商品' }))
    await userEvent.type(await screen.findByLabelText('商品名称 (必填)'), '新商品A')
    await userEvent.click(screen.getByRole('button', { name: '保存更改' }))

    await waitFor(() => {
      expect(fetchApiMock).toHaveBeenCalledWith(
        `/api/servers/${serverId}/shop/products`,
        expect.objectContaining({ method: 'POST' }),
      )
    })
  })
})
