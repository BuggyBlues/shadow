/** @vitest-environment jsdom */
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'
import { ShopAdmin } from '../../../src/components/shop/shop-admin'
import { fetchApiMock, renderWithQuery, resetMocks, serverId } from '../_shared/test-helpers'

describe('S02/C06 upload state loading and reset', () => {
  beforeEach(() => resetMocks())
  it('上传完成后 input value 应可重置再次上传', async () => {
    fetchApiMock.mockImplementation((path: string, options?: RequestInit) => {
      if (String(path).includes('/shop/categories')) return Promise.resolve([])
      if (String(path).includes('/shop/products') && (!options?.method || options.method === 'GET'))
        return Promise.resolve({ products: [], total: 0 })
      if (String(path).includes('/api/media/upload') && options?.method === 'POST')
        return Promise.resolve({ url: '/ok.png' })
      return Promise.resolve({})
    })
    renderWithQuery(<ShopAdmin serverId={serverId} onBack={() => {}} />)
    await userEvent.click(await screen.findByRole('button', { name: '添加商品' }))
    const input = document.querySelector('input[type="file"]') as HTMLInputElement
    await userEvent.upload(input, new File(['x1'], 'a1.png', { type: 'image/png' }))
    await userEvent.upload(input, new File(['x2'], 'a2.png', { type: 'image/png' }))
    await waitFor(() => {
      const calls = fetchApiMock.mock.calls.filter((c) =>
        String(c[0]).includes('/api/media/upload'),
      )
      expect(calls.length).toBe(2)
    })
  })
})
