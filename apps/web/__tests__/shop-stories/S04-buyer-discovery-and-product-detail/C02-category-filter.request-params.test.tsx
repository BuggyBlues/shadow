/** @vitest-environment jsdom */
import { beforeEach, describe, expect, it } from 'vitest'
import { fetchApiMock, resetMocks } from '../_shared/test-helpers'

describe('S04/C02 category filter request params', () => {
  beforeEach(() => resetMocks())
  it('分类过滤参数应可体现在请求路径中', async () => {
    fetchApiMock('/api/servers/sid/shop/products?categoryId=c1', { method: 'GET' })
    expect(String(fetchApiMock.mock.calls[0]?.[0])).toContain('categoryId=c1')
  })
})
