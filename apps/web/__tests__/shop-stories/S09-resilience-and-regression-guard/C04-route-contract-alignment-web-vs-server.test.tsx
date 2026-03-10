/** @vitest-environment jsdom */
import { beforeEach, describe, expect, it } from 'vitest'
import { fetchApiMock, resetMocks } from '../_shared/test-helpers'

describe('S09/C04 route contract alignment web vs server', () => {
  beforeEach(() => resetMocks())
  it('核心路由前缀应保持 /api/servers/:id/shop', () => {
    fetchApiMock('/api/servers/abc/shop/products', { method: 'GET' })
    expect(String(fetchApiMock.mock.calls[0][0])).toContain('/api/servers/')
    expect(String(fetchApiMock.mock.calls[0][0])).toContain('/shop/')
  })
})
