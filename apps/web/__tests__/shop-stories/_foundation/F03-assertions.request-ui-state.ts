import { expect } from 'vitest'

export function expectCalledPath(calls: Array<[unknown, unknown]>, includes: string) {
  const ok = calls.some((c) => String(c[0]).includes(includes))
  expect(ok).toBe(true)
}

export function expectMethod(calls: Array<[unknown, unknown]>, method: string) {
  const ok = calls.some(
    (c) =>
      String((c[1] as RequestInit | undefined)?.method || '').toUpperCase() ===
      method.toUpperCase(),
  )
  expect(ok).toBe(true)
}
