/** @vitest-environment jsdom */
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'
import { ShopAdmin } from '../../../src/components/shop/shop-admin'
import { fetchApiMock, renderWithQuery, resetMocks, serverId } from '../_shared/test-helpers'

describe('S07/C04 admin orders empty state', () => {
  beforeEach(() => resetMocks())
  it('空订单应显示空状态', async () => {
    fetchApiMock.mockImplementation((path: string) => {
      if (String(path).includes('/shop/products'))
        return Promise.resolve({ products: [], total: 0 })
      if (String(path).includes('/shop/categories')) return Promise.resolve([])
      if (String(path).includes('/shop/orders/manage')) return Promise.resolve([])
      return Promise.resolve({})
    })
    renderWithQuery(<ShopAdmin serverId={serverId} onBack={() => {}} />)
    await userEvent.click(await screen.findByRole('button', { name: '订单管理' }))
    expect(await screen.findByText('当前暂无相关订单记录')).toBeTruthy()
  })
})
