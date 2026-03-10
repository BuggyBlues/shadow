/** @vitest-environment jsdom */

import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'
import { ShopAdmin } from '../../../src/components/shop/shop-admin'
import { fetchApiMock, renderWithQuery, resetMocks, serverId } from '../_shared/test-helpers'

describe('S02/C04 upload shop logo banner success', () => {
  beforeEach(() => resetMocks())

  it('店铺设置页应可上传 logo 与 banner', async () => {
    let uploadCount = 0

    fetchApiMock.mockImplementation((path: string, options?: RequestInit) => {
      if (String(path).endsWith('/shop') && (!options?.method || options.method === 'GET')) {
        return Promise.resolve({
          id: 's1',
          name: '旧店铺',
          description: 'old',
          logoUrl: '',
          bannerUrl: '',
        })
      }
      if (String(path).includes('/shop/products') && (!options?.method || options.method === 'GET'))
        return Promise.resolve({ products: [], total: 0 })
      if (
        String(path).includes('/shop/categories') &&
        (!options?.method || options.method === 'GET')
      )
        return Promise.resolve([])
      if (String(path).includes('/api/media/upload') && options?.method === 'POST') {
        uploadCount += 1
        return Promise.resolve({ url: `/upload-${uploadCount}.png` })
      }
      return Promise.resolve({})
    })

    renderWithQuery(<ShopAdmin serverId={serverId} onBack={() => {}} />)
    await userEvent.click(await screen.findByRole('button', { name: '店铺设置' }))

    const uploadInputs = document.querySelectorAll('input[type="file"]')
    const logoInput = uploadInputs[0] as HTMLInputElement
    const bannerInput = uploadInputs[1] as HTMLInputElement

    await userEvent.upload(logoInput, new File(['logo'], 'logo.png', { type: 'image/png' }))
    await userEvent.upload(bannerInput, new File(['banner'], 'banner.png', { type: 'image/png' }))

    await waitFor(() => {
      const uploadCalls = fetchApiMock.mock.calls.filter((c) =>
        String(c[0]).includes('/api/media/upload'),
      )
      expect(uploadCalls.length).toBe(2)
    })
  })
})
