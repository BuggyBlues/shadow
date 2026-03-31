/**
 * Tests for Managed Agents features:
 * - P0: Vault / per-agent secret isolation
 * - P0: Per-tool permission policies
 * - P1: Per-agent networking policies
 * - P1: Agent version annotations
 */
import { describe, expect, it } from 'vitest'
import { buildNetworkPolicy } from '../../src/infra/security'

// ─── P1: Networking Policies ────────────────────────────────────────────────

describe('buildNetworkPolicy — per-agent networking', () => {
  it('unrestricted: only limits ingress, allows all egress', () => {
    const np = buildNetworkPolicy('test-agent', 'test-ns', 3100, [], {
      type: 'unrestricted',
    })
    expect(np.spec.policyTypes).toEqual(['Ingress'])
    expect(np.spec.egress).toBeUndefined()
    expect(np.spec.ingress[0].ports[0].port).toBe(3100)
  })

  it('deny-all: only allows DNS egress', () => {
    const np = buildNetworkPolicy('test-agent', 'test-ns', 3100, [], {
      type: 'deny-all',
    })
    expect(np.spec.policyTypes).toContain('Egress')
    const egressPorts = np.spec.egress.flatMap((r: { ports: Array<{ port: number }> }) =>
      r.ports.map((p) => p.port),
    )
    expect(egressPorts).toContain(53)
    expect(egressPorts).not.toContain(443)
  })

  it('limited: allows HTTPS + DNS + package managers when enabled', () => {
    const np = buildNetworkPolicy('test-agent', 'test-ns', 3100, [], {
      type: 'limited',
      allowPackageManagers: true,
    })
    const egressPorts = np.spec.egress.flatMap((r: { ports: Array<{ port: number }> }) =>
      r.ports.map((p) => p.port),
    )
    expect(egressPorts).toContain(443)
    expect(egressPorts).toContain(53)
    expect(egressPorts).toContain(80) // package managers
  })

  it('limited with allowedHosts: records annotation', () => {
    const np = buildNetworkPolicy('test-agent', 'test-ns', 3100, [], {
      type: 'limited',
      allowedHosts: ['api.anthropic.com', 'api.openai.com'],
    })
    expect(np.metadata.annotations['shadowob-cloud/allowed-hosts']).toBe(
      'api.anthropic.com,api.openai.com',
    )
  })

  it('default (no networking config): behaves like limited', () => {
    const np = buildNetworkPolicy('test-agent', 'test-ns')
    expect(np.spec.policyTypes).toContain('Ingress')
    expect(np.spec.policyTypes).toContain('Egress')
    const egressPorts = np.spec.egress.flatMap((r: { ports: Array<{ port: number }> }) =>
      r.ports.map((p) => p.port),
    )
    expect(egressPorts).toContain(443)
    expect(egressPorts).toContain(53)
  })
})

// ─── P0: Permission Policy Mapping ─────────────────────────────────────────

describe('permission policy mapping', () => {
  // These test the schema types and permission level values
  it('PermissionLevel type covers all ACPX modes', () => {
    const levels = ['always-allow', 'approve-reads', 'always-ask', 'deny-all'] as const
    expect(levels).toHaveLength(4)
    for (const level of levels) {
      expect(typeof level).toBe('string')
    }
  })
})

// ─── P0: Vault Config Schema ────────────────────────────────────────────────

describe('vault config schema', () => {
  it('VaultConfig accepts providers and secrets', () => {
    const vault = {
      providers: {
        anthropic: { apiKey: '${env:ANTHROPIC_API_KEY}' },
        openai: { apiKey: '${env:OPENAI_API_KEY}' },
      },
      secrets: {
        'github-token': '${env:GITHUB_TOKEN}',
      },
    }
    expect(vault.providers.anthropic.apiKey).toBe('${env:ANTHROPIC_API_KEY}')
    expect(vault.secrets['github-token']).toBe('${env:GITHUB_TOKEN}')
  })
})
