import { describe, expect, it, vi } from 'vitest'

const cloudMocks = vi.hoisted(() => ({
  listPodsAsync: vi.fn(),
}))

vi.mock('@shadowob/cloud', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@shadowob/cloud')>()
  return {
    ...actual,
    listPodsAsync: cloudMocks.listPodsAsync,
  }
})

import {
  probeDeploymentRuntimeResources,
  waitForNamespaceDeletion,
} from '../src/lib/cloud-deployment-processor'

describe('waitForNamespaceDeletion', () => {
  it('returns as soon as the namespace is deleted', async () => {
    const result = await waitForNamespaceDeletion('gstack-buddy', undefined, {
      exists: () => false,
      timeoutMs: 5_000,
      intervalMs: 1_000,
    })

    expect(result).toBe('deleted')
  })

  it('exits promptly when cancellation is requested during verification', async () => {
    let cancelled = false
    setTimeout(() => {
      cancelled = true
    }, 50)

    const startedAt = Date.now()
    const result = await waitForNamespaceDeletion('gstack-buddy', undefined, {
      exists: () => true,
      isCancelled: () => cancelled,
      timeoutMs: 5_000,
      intervalMs: 4_000,
    })

    expect(result).toBe('cancelled')
    expect(Date.now() - startedAt).toBeLessThan(1_000)
  })

  it('times out when Kubernetes never confirms deletion', async () => {
    const result = await waitForNamespaceDeletion('gstack-buddy', undefined, {
      exists: () => true,
      timeoutMs: 25,
      intervalMs: 10,
    })

    expect(result).toBe('timeout')
  })
})

describe('probeDeploymentRuntimeResources', () => {
  it('detects OpenClaw pods created by Kubernetes even when Pulumi readiness times out', async () => {
    cloudMocks.listPodsAsync.mockResolvedValueOnce([
      {
        name: 'strategy-buddy-abc',
        ready: '1/2',
        status: 'Running',
        restarts: 0,
        age: '2026-04-30T00:00:00Z',
        containers: ['agent-pack-sync', 'openclaw'],
      },
      {
        name: 'pause',
        ready: '1/1',
        status: 'Running',
        restarts: 0,
        age: '2026-04-30T00:00:00Z',
        containers: ['pause'],
      },
    ])

    await expect(probeDeploymentRuntimeResources('gstack-buddy')).resolves.toEqual({
      agentCount: 1,
      podNames: ['strategy-buddy-abc'],
      readyPods: 0,
    })
  })
})
