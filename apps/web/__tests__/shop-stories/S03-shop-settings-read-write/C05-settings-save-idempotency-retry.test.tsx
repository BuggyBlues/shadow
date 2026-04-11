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

describe('S03/C05 settings save idempotency retry', () => {
  beforeEach(() => resetMocks())
  it('首次失败后重试保存应成功', async () => {
    let putCount = 0
    fetchApiMock.mockImplementation((path: string, options?: RequestInit) => {
      if (String(path).endsWith('/shop') && (!options?.method || options.method === 'GET'))
        return Promise.resolve({
          id: 's1',
          name: '店铺',
          description: '',
          logoUrl: '',
          bannerUrl: '',
        })
      if (String(path).endsWith('/shop') && options?.method === 'PUT') {
        putCount += 1
        if (putCount === 1) return Promise.reject(new Error('shop.saveError(500)'))
        return Promise.resolve({ ok: true })
      }
      return Promise.resolve({})
    })
    renderWithQuery(<ShopAdmin serverId={serverId} onBack={() => {}} />)
    await userEvent.click(await screen.findByRole('button', { name: '店铺设置' }))
    const save = screen.getByRole('button', { name: '保存最新设置' })
    await userEvent.click(save)
    await userEvent.click(save)
    await waitFor(() => {
      expect(showToastMock).toHaveBeenCalledWith('shop.saveError(500)', 'error')
      expect(showToastMock).toHaveBeenCalledWith('shop.settingsSaved', 'success')
    })
  })
})
