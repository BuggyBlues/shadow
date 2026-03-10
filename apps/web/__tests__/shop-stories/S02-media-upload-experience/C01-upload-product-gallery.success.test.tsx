/** @vitest-environment jsdom */
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'
import { ShopAdmin } from '../../../src/components/shop/shop-admin'
import { fetchApiMock, renderWithQuery, resetMocks, serverId } from '../_shared/test-helpers'

describe('S02/C01 upload product gallery success', () => {
  beforeEach(() => resetMocks())
  it('商品画廊上传成功应调用 /api/media/upload', async () => {
    fetchApiMock.mockImplementation((path: string, options?: RequestInit) => {
      if (String(path).includes('/shop/categories')) return Promise.resolve([])
      if (String(path).includes('/shop/products') && (!options?.method || options.method === 'GET'))
        return Promise.resolve({ products: [], total: 0 })
      if (String(path).includes('/api/media/upload') && options?.method === 'POST')
        return Promise.resolve({ url: '/up-ok.png' })
      return Promise.resolve({})
    })
    renderWithQuery(<ShopAdmin serverId={serverId} onBack={() => {}} />)
    await userEvent.click(await screen.findByRole('button', { name: '添加商品' }))
    const input = document.querySelector('input[type="file"]') as HTMLInputElement
    await userEvent.upload(input, new File(['x'], 'a.png', { type: 'image/png' }))
    await waitFor(() => {
      expect(
        fetchApiMock.mock.calls.some(
          (c) => String(c[0]).includes('/api/media/upload') && c[1]?.method === 'POST',
        ),
      ).toBe(true)
    })
  })
})
