/** @vitest-environment jsdom */

import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ShopAdmin } from '../../../src/components/shop/shop-admin'
import {
  fetchApiMock,
  renderWithQuery,
  resetMocks,
  serverId,
  showToastMock,
} from '../_shared/test-helpers'

describe('S02/C02 upload product gallery 500 failure', () => {
  beforeEach(() => {
    resetMocks()
    vi.spyOn(window, 'alert').mockImplementation(() => {})
  })

  it('商品画廊上传失败时应提示错误', async () => {
    fetchApiMock.mockImplementation((path: string, options?: RequestInit) => {
      if (
        String(path).includes('/shop/categories') &&
        (!options?.method || options.method === 'GET')
      )
        return Promise.resolve([])
      if (String(path).includes('/shop/products') && (!options?.method || options.method === 'GET'))
        return Promise.resolve({ products: [], total: 0 })
      if (String(path).includes('/api/media/upload') && options?.method === 'POST') {
        return Promise.reject(new Error('上传失败(500)'))
      }
      return Promise.resolve({})
    })

    renderWithQuery(<ShopAdmin serverId={serverId} onBack={() => {}} />)

    await userEvent.click(await screen.findByRole('button', { name: '添加商品' }))

    const uploadInputs = document.querySelectorAll('input[type="file"]')
    const firstInput = uploadInputs[0] as HTMLInputElement
    const file = new File(['img-bytes'], 'sample.png', { type: 'image/png' })
    await userEvent.upload(firstInput, file)

    await waitFor(() => {
      expect(fetchApiMock).toHaveBeenCalledWith(
        '/api/media/upload',
        expect.objectContaining({ method: 'POST' }),
      )
    })

    await waitFor(() => {
      expect(showToastMock).toHaveBeenCalledWith('上传失败(500)', 'error')
    })
  })
})
