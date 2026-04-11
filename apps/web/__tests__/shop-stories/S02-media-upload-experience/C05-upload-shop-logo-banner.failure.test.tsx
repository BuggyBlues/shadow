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

describe('S02/C05 upload shop logo banner failure', () => {
  beforeEach(() => resetMocks())
  it('店铺 Logo/Banner 上传失败应显示错误', async () => {
    fetchApiMock.mockImplementation((path: string, options?: RequestInit) => {
      if (String(path).endsWith('/shop') && (!options?.method || options.method === 'GET'))
        return Promise.resolve({
          id: 's1',
          name: '店铺',
          description: '',
          logoUrl: '',
          bannerUrl: '',
        })
      if (String(path).includes('/api/media/upload') && options?.method === 'POST')
        return Promise.reject(new Error('shop.uploadError(500)'))
      return Promise.resolve({})
    })
    renderWithQuery(<ShopAdmin serverId={serverId} onBack={() => {}} />)
    await userEvent.click(await screen.findByRole('button', { name: '店铺设置' }))
    const input = document.querySelector('input[type="file"]') as HTMLInputElement
    await userEvent.upload(input, new File(['x'], 'a.png', { type: 'image/png' }))
    await waitFor(() =>
      expect(showToastMock).toHaveBeenCalledWith('shop.uploadError(500)', 'error'),
    )
  })
})
