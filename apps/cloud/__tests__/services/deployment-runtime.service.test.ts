import { readFileSync } from 'node:fs'
import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  DeploymentRuntimeService,
  rewriteLoopbackKubeconfig,
} from '../../src/services/deployment-runtime.service'

const originalLoopbackHost = process.env.KUBECONFIG_LOOPBACK_HOST

afterEach(() => {
  if (originalLoopbackHost === undefined) {
    delete process.env.KUBECONFIG_LOOPBACK_HOST
  } else {
    process.env.KUBECONFIG_LOOPBACK_HOST = originalLoopbackHost
  }
})

describe('rewriteLoopbackKubeconfig', () => {
  it('rewrites localhost-style kubeconfig servers to the configured host alias', () => {
    const kubeconfig = `apiVersion: v1
clusters:
- cluster:
    server: https://127.0.0.1:6443
  name: local
contexts:
- context:
    cluster: local
    user: local
  name: local
current-context: local`

    const rewritten = rewriteLoopbackKubeconfig(kubeconfig, 'host.lima.internal')

    expect(rewritten).toContain('server: https://host.lima.internal:6443')
    expect(rewritten).toContain('tls-server-name: localhost')
  })

  it('also rewrites localhost hostnames', () => {
    const kubeconfig = `clusters:
- cluster:
    server: https://localhost:6443
  name: local`

    expect(rewriteLoopbackKubeconfig(kubeconfig, 'host.docker.internal')).toContain(
      'server: https://host.docker.internal:6443',
    )
  })

  it('leaves kubeconfig untouched when no loopback host override is provided', () => {
    const kubeconfig = `clusters:
- cluster:
    server: https://127.0.0.1:6443
  name: local`

    expect(rewriteLoopbackKubeconfig(kubeconfig, '')).toBe(kubeconfig)
  })
})

describe('DeploymentRuntimeService.destroy', () => {
  it('passes a stored config snapshot to DeployService.destroy when available', async () => {
    const destroy = vi.fn().mockResolvedValue(undefined)
    const runtime = new DeploymentRuntimeService({ destroy } as unknown as never)
    const configSnapshot = {
      version: '1',
      deployments: {
        agents: [{ id: 'agent-1', runtime: 'openclaw' }],
      },
    }

    await runtime.destroy({
      namespace: 'qa-destroy-test',
      stack: 'deployment-1',
      configSnapshot,
    })

    expect(destroy).toHaveBeenCalledWith({
      namespace: 'qa-destroy-test',
      stack: 'deployment-1',
      k8sContext: undefined,
      config: configSnapshot,
    })
  })

  it('passes a rewritten kubeconfig path through to DeployService.destroy', async () => {
    process.env.KUBECONFIG_LOOPBACK_HOST = 'host.lima.internal'

    const destroy = vi.fn().mockImplementation(async (options) => {
      expect(options.k8sContext).toBe('local')
      expect(typeof process.env.KUBECONFIG).toBe('string')
      expect(process.env.KUBECONFIG).toContain('.shadowob/kubeconfigs/')
      expect(readFileSync(process.env.KUBECONFIG!, 'utf8')).toContain(
        'server: https://host.lima.internal:6443',
      )
    })

    const runtime = new DeploymentRuntimeService({ destroy } as unknown as never)

    await runtime.destroy({
      namespace: 'qa-destroy-test',
      stack: 'deployment-1',
      configSnapshot: {
        version: '1',
        deployments: {
          agents: [{ id: 'agent-1', runtime: 'openclaw' }],
        },
      },
      cluster: {
        name: 'local',
        kubeconfig: `apiVersion: v1
clusters:
- cluster:
    server: https://127.0.0.1:6443
  name: local
contexts:
- context:
    cluster: local
    user: local
  name: local
current-context: local
users:
- name: local
  user:
    token: test`,
      },
    })

    expect(destroy).toHaveBeenCalledOnce()
  })
})

describe('DeploymentRuntimeService.deployFromSnapshot', () => {
  it('passes a rewritten kubeconfig path through to DeployService.up', async () => {
    process.env.KUBECONFIG_LOOPBACK_HOST = 'host.lima.internal'

    const up = vi.fn().mockImplementation(async (options) => {
      expect(options.k8sContext).toBe('local')
      expect(typeof process.env.KUBECONFIG).toBe('string')
      expect(process.env.KUBECONFIG).toContain('.shadowob/kubeconfigs/')
      expect(readFileSync(process.env.KUBECONFIG!, 'utf8')).toContain(
        'server: https://host.lima.internal:6443',
      )

      return {
        namespace: options.namespace,
        agentCount: 1,
        config: {
          version: '1',
          deployments: {
            agents: [{ id: 'agent-1', runtime: 'openclaw' }],
          },
        },
      }
    })

    const runtime = new DeploymentRuntimeService({ up } as unknown as never)

    await runtime.deployFromSnapshot({
      namespace: 'qa-deploy-test',
      stack: 'deployment-1',
      configSnapshot: {
        version: '1',
        deployments: {
          agents: [{ id: 'agent-1', runtime: 'openclaw' }],
        },
      },
      cluster: {
        name: 'local',
        kubeconfig: `apiVersion: v1
clusters:
- cluster:
    server: https://127.0.0.1:6443
  name: local
contexts:
- context:
    cluster: local
    user: local
  name: local
current-context: local
users:
- name: local
  user:
    token: test`,
      },
    })

    expect(up).toHaveBeenCalledOnce()
  })
})
