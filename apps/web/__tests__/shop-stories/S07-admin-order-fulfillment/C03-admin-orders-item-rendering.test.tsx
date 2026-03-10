/** @vitest-environment jsdom */
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'
import { ShopAdmin } from '../../../src/components/shop/shop-admin'
import { fetchApiMock, renderWithQuery, resetMocks, serverId } from '../_shared/test-helpers'

describe('S07/C03 admin orders item rendering', () => {
  beforeEach(() => resetMocks())
  it('订单管理应渲染订单项', async () => {
    fetchApiMock.mockImplementation((path: string) => {
      if (String(path).includes('/shop/products'))
        return Promise.resolve({ products: [], total: 0 })
      if (String(path).includes('/shop/categories')) return Promise.resolve([])
      if (String(path).includes('/shop/orders/manage'))
        return Promise.resolve([
          {
            id: 'o1',
            orderNo: 'NO7001',
            buyerId: 'u1',
            status: 'paid',
            totalAmount: 12,
            items: [{ id: 'i1', productName: '商品A', specValues: [], price: 12, quantity: 1 }],
            createdAt: '2026-01-01T00:00:00.000Z',
          },
        ])
      return Promise.resolve({})
    })
    renderWithQuery(<ShopAdmin serverId={serverId} onBack={() => {}} />)
    await userEvent.click(await screen.findByRole('button', { name: '订单管理' }))
    expect(await screen.findByText(/NO7001/)).toBeTruthy()
  })
})
