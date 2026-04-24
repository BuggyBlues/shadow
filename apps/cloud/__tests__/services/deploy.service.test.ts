import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { CloudConfig } from '../../src/config/schema.js'
import { DeployService } from '../../src/services/deploy.service.js'

describe('DeployService', () => {
  let tempDir: string

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), 'deploy-service-test-'))
  })

  afterEach(() => {
    rmSync(tempDir, { recursive: true, force: true })
    vi.restoreAllMocks()
  })

  it('passes extraSecrets to the stack without Shadow-specific processing', async () => {
    const filePath = join(tempDir, 'shadowob-cloud.json')
    writeFileSync(filePath, JSON.stringify({ ok: true }), 'utf8')

    const config: CloudConfig = {
      version: '1.0.0',
      deployments: {
        namespace: 'shadowob-cloud',
        agents: [
          {
            id: 'buddy-agent',
            runtime: 'openclaw',
            configuration: { openclaw: {} },
          },
        ],
      },
    } as CloudConfig

    const configService = {
      parseFile: vi.fn().mockResolvedValue(config),
      resolve: vi.fn().mockResolvedValue(config),
    }
    const manifestService = {
      build: vi.fn(),
    }
    const stack = { cancel: vi.fn().mockResolvedValue(undefined) }
    const k8s = {
      isToolInstalled: vi.fn().mockReturnValue(true),
      kindClusterExists: vi.fn().mockReturnValue(true),
      createKindCluster: vi.fn(),
      isKubeReachable: vi.fn().mockReturnValue(true),
      getOrCreateStack: vi.fn().mockResolvedValue(stack),
      deployStack: vi.fn().mockResolvedValue(undefined),
      getStackOutputs: vi.fn().mockResolvedValue({}),
    }
    const logger = {
      step: vi.fn(),
      info: vi.fn(),
      dim: vi.fn(),
      warn: vi.fn(),
      success: vi.fn(),
    }

    const service = new DeployService(
      configService as never,
      manifestService as never,
      k8s as never,
      logger as never,
    )

    // Callers (CLI/task-manager) resolve URLs via resolveShadowExtraSecrets before
    // calling deploy.up(). Here we simulate that result: SHADOW_AGENT_SERVER_URL
    // wins as pod-facing URL, provision URL stored under SHADOW_PROVISION_URL.
    await service.up({
      filePath,
      extraSecrets: {
        SHADOW_SERVER_URL: 'http://host.lima.internal:3002',
        SHADOW_PROVISION_URL: 'http://server:3002',
        SHADOW_USER_TOKEN: 'pat_test',
      },
      skipProvision: true,
    })

    expect(k8s.getOrCreateStack).toHaveBeenCalledWith(
      expect.objectContaining({
        stackName: 'dev-shadowob-cloud',
      }),
    )
  })

  it('scopes the default Pulumi stack name by namespace', async () => {
    const filePath = join(tempDir, 'shadowob-cloud.json')
    writeFileSync(filePath, JSON.stringify({ ok: true }), 'utf8')

    const config: CloudConfig = {
      version: '1.0.0',
      deployments: {
        namespace: 'marketingskills-buddy',
        agents: [
          {
            id: 'buddy-agent',
            runtime: 'openclaw',
            configuration: { openclaw: {} },
          },
        ],
      },
    } as CloudConfig

    const configService = {
      parseFile: vi.fn().mockResolvedValue(config),
      resolve: vi.fn().mockResolvedValue(config),
    }
    const manifestService = {
      build: vi.fn(),
    }
    const stack = { cancel: vi.fn().mockResolvedValue(undefined) }
    const k8s = {
      isToolInstalled: vi.fn().mockReturnValue(true),
      kindClusterExists: vi.fn().mockReturnValue(true),
      createKindCluster: vi.fn(),
      isKubeReachable: vi.fn().mockReturnValue(true),
      getOrCreateStack: vi.fn().mockResolvedValue(stack),
      deployStack: vi.fn().mockResolvedValue(undefined),
      getStackOutputs: vi.fn().mockResolvedValue({}),
    }
    const logger = {
      step: vi.fn(),
      info: vi.fn(),
      dim: vi.fn(),
      warn: vi.fn(),
      success: vi.fn(),
    }

    const service = new DeployService(
      configService as never,
      manifestService as never,
      k8s as never,
      logger as never,
    )

    await service.up({
      filePath,
      extraSecrets: {
        SHADOW_SERVER_URL: 'http://server:3002',
        SHADOW_USER_TOKEN: 'pat_test',
      },
      skipProvision: true,
    })

    expect(k8s.getOrCreateStack).toHaveBeenCalledWith(
      expect.objectContaining({
        stackName: 'dev-marketingskills-buddy',
      }),
    )
  })
})
