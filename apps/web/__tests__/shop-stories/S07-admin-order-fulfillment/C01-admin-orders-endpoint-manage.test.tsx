/** @vitest-environment jsdom */
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'
import { ShopAdmin } from '../../../src/components/shop/shop-admin'
import { fetchApiMock, renderWithQuery, resetMocks, serverId } from '../_shared/test-helpers'

describe('S07/C01 admin orders endpoint manage', () => {
  beforeEach(() => resetMocks())
  it('进入订单管理应请求 /shop/orders/manage', async () => {
    fetchApiMock.mockImplementation((path: string) => {
      if (String(path).includes('/shop/products'))
        return Promise.resolve({ products: [], total: 0 })
      if (String(path).includes('/shop/categories')) return Promise.resolve([])
      if (String(path).includes('/shop/orders/manage')) return Promise.resolve([])
      return Promise.resolve({})
    })
    renderWithQuery(<ShopAdmin serverId={serverId} onBack={() => {}} />)
    await userEvent.click(await screen.findByRole('button', { name: '订单管理' }))
    expect(fetchApiMock.mock.calls.some((c) => String(c[0]).includes('/shop/orders/manage'))).toBe(
      true,
    )
  })
})
