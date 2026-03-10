/** @vitest-environment jsdom */
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'
import { ShopAdmin } from '../../../src/components/shop/shop-admin'
import { fetchApiMock, renderWithQuery, resetMocks, serverId } from '../_shared/test-helpers'

describe('S01/C02 create entitlement product success', () => {
  beforeEach(() => resetMocks())

  it('创建权益商品应提交 type=entitlement', async () => {
    fetchApiMock.mockImplementation((path: string, options?: RequestInit) => {
      if (
        String(path).includes('/shop/categories') &&
        (!options?.method || options.method === 'GET')
      )
        return Promise.resolve([])
      if (String(path).includes('/shop/products') && (!options?.method || options.method === 'GET'))
        return Promise.resolve({ products: [], total: 0 })
      if (String(path).includes('/shop/products') && options?.method === 'POST')
        return Promise.resolve({ id: 'p-ent' })
      return Promise.resolve({})
    })
    renderWithQuery(<ShopAdmin serverId={serverId} onBack={() => {}} />)
    await userEvent.click(await screen.findByRole('button', { name: '添加商品' }))
    await userEvent.type(await screen.findByLabelText('商品名称 (必填)'), '权益商品A')
    await userEvent.click(screen.getByRole('button', { name: '虚拟权益' }))
    await userEvent.click(screen.getByRole('button', { name: '保存更改' }))
    await waitFor(() => {
      const call = fetchApiMock.mock.calls.find(
        (c) => String(c[0]).includes('/shop/products') && c[1]?.method === 'POST',
      )
      expect(call).toBeTruthy()
      const body = JSON.parse(String(call?.[1]?.body)) as { type: string }
      expect(body.type).toBe('entitlement')
    })
  })
})
