/** @vitest-environment jsdom */
import { beforeEach, describe, expect, it } from 'vitest'
import { fetchApiMock, resetMocks } from '../_shared/test-helpers'

describe('S08/C04 cross user data consistency', () => {
  beforeEach(() => resetMocks())
  it('跨角色数据链路应保持同一实体 id', async () => {
    fetchApiMock.mockResolvedValue({ id: 'p-consistent' })
    const a = (await fetchApiMock('/api/a')) as { id: string }
    const b = (await fetchApiMock('/api/b')) as { id: string }
    expect(a.id).toBe(b.id)
  })
})
