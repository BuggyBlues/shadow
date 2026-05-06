import { describe, expect, it, vi } from 'vitest'

const cloudMocks = vi.hoisted(() => ({
  deleteNamespace: vi.fn(),
  listPodsAsync: vi.fn(),
}))

vi.mock('@shadowob/cloud', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@shadowob/cloud')>()
  return {
    ...actual,
    deleteNamespace: cloudMocks.deleteNamespace,
    listPodsAsync: cloudMocks.listPodsAsync,
  }
})

import {
  ensureNamespaceDeletionStarted,
  probeDeploymentRuntimeResources,
  resolveDeploymentShadowProvisionToken,
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

describe('ensureNamespaceDeletionStarted', () => {
  it('requests Kubernetes namespace deletion when Pulumi destroy leaves the namespace behind', async () => {
    await expect(
      ensureNamespaceDeletionStarted('gstack-buddy', 'kubeconfig-yaml', {
        exists: () => true,
      }),
    ).resolves.toEqual({ status: 'delete-requested' })

    expect(cloudMocks.deleteNamespace).toHaveBeenCalledWith('gstack-buddy', 'kubeconfig-yaml')
  })

  it('does not request deletion when the namespace is already gone', async () => {
    cloudMocks.deleteNamespace.mockClear()

    await expect(
      ensureNamespaceDeletionStarted('gstack-buddy', undefined, {
        exists: () => false,
      }),
    ).resolves.toEqual({ status: 'already-deleted' })

    expect(cloudMocks.deleteNamespace).not.toHaveBeenCalled()
  })

  it('surfaces kubectl delete errors so destroy does not silently wait forever', async () => {
    cloudMocks.deleteNamespace.mockImplementationOnce(() => {
      throw new Error('api server unavailable')
    })

    await expect(
      ensureNamespaceDeletionStarted('gstack-buddy', undefined, {
        exists: () => true,
      }),
    ).resolves.toEqual({
      status: 'delete-failed',
      error: 'api server unavailable',
    })
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

describe('resolveDeploymentShadowProvisionToken', () => {
  it('keeps an explicit runtime token when one is provided', async () => {
    await expect(
      resolveDeploymentShadowProvisionToken({ SHADOW_USER_TOKEN: 'explicit-token' }, 'user-1'),
    ).resolves.toBe('explicit-token')
  })

  it('mints a transient access token for server-side Shadow provisioning', async () => {
    process.env.JWT_SECRET = process.env.JWT_SECRET ?? 'test-secret'

    const token = await resolveDeploymentShadowProvisionToken({}, 'user-1')

    expect(token).toBeTruthy()
    expect(token).not.toContain('explicit-token')
  })
})
