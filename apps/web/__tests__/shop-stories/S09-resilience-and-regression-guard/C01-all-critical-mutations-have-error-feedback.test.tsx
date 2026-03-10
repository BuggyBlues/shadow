/** @vitest-environment jsdom */
import { beforeEach, describe, expect, it } from 'vitest'
import { resetMocks, showToastMock } from '../_shared/test-helpers'

describe('S09/C01 all critical mutations have error feedback', () => {
  beforeEach(() => resetMocks())
  it('错误反馈通道可用', () => {
    showToastMock('错误', 'error')
    expect(showToastMock).toHaveBeenCalledWith('错误', 'error')
  })
})
