/** @vitest-environment jsdom */
import { screen } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import { ShopOrders } from '../../../src/components/shop/shop-orders'
import { fetchApiMock, renderWithQuery, resetMocks, serverId } from '../_shared/test-helpers'

describe('S06/C07 order empty and partial empty states', () => {
  beforeEach(() => resetMocks())
  it('空订单应显示空状态文案', async () => {
    fetchApiMock.mockImplementation((path: string) => {
      if (String(path).includes('/shop/orders')) return Promise.resolve([])
      return Promise.resolve({})
    })
    renderWithQuery(<ShopOrders serverId={serverId} />)
    expect(await screen.findByText('暂无订单记录')).toBeTruthy()
  })
})
