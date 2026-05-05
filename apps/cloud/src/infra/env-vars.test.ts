import { describe, expect, it } from 'vitest'
import { dedupeEnvVars } from './env-vars.js'

describe('dedupeEnvVars', () => {
  it('keeps the later value for duplicate Kubernetes env names', () => {
    expect(
      dedupeEnvVars([
        { name: 'NODE_ENV', value: 'production' },
        { name: 'PATH', value: '/usr/bin' },
        { name: 'PATH', value: '/opt/runtime/bin:/usr/bin' },
      ]),
    ).toEqual([
      { name: 'NODE_ENV', value: 'production' },
      { name: 'PATH', value: '/opt/runtime/bin:/usr/bin' },
    ])
  })

  it('preserves non-string Pulumi input names without trying to merge them', () => {
    const symbolicName = { toString: () => 'PATH' }
    expect(
      dedupeEnvVars([
        { name: symbolicName, value: 'a' },
        { name: symbolicName, value: 'b' },
      ]),
    ).toEqual([
      { name: symbolicName, value: 'a' },
      { name: symbolicName, value: 'b' },
    ])
  })
})
