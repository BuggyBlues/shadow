import { describe, expect, it } from 'vitest'
import {
  buildContainerSecurityContext,
  buildNetworkPolicy,
  buildSecurityContext,
} from '../../src/infra/security'

describe('buildSecurityContext', () => {
  it('returns non-root pod security context', () => {
    const ctx = buildSecurityContext()
    expect(ctx.runAsNonRoot).toBe(true)
    expect(ctx.runAsUser).toBe(1000)
    expect(ctx.fsGroup).toBe(1000)
  })
})

describe('buildContainerSecurityContext', () => {
  it('drops ALL capabilities', () => {
    const ctx = buildContainerSecurityContext()
    expect(ctx.capabilities?.drop).toContain('ALL')
    expect(ctx.allowPrivilegeEscalation).toBe(false)
    expect(ctx.readOnlyRootFilesystem).toBe(true)
  })
})

describe('buildNetworkPolicy', () => {
  it('generates deny-all + egress whitelist', () => {
    const np = buildNetworkPolicy('test-agent', 'test-ns')
    expect(np.kind).toBe('NetworkPolicy')
    expect(np.metadata.name).toBe('test-agent-netpol')
    expect(np.metadata.namespace).toBe('test-ns')
    expect(np.spec.policyTypes).toContain('Ingress')
    expect(np.spec.policyTypes).toContain('Egress')
  })

  it('allows egress to port 443 and 53', () => {
    const np = buildNetworkPolicy('test-agent', 'test-ns')
    const allEgressPorts = np.spec.egress.flatMap((r: { ports: Array<{ port: number }> }) =>
      r.ports.map((p) => p.port),
    )
    expect(allEgressPorts).toContain(443)
    expect(allEgressPorts).toContain(53)
  })

  it('allows ingress on health port', () => {
    const np = buildNetworkPolicy('test-agent', 'test-ns', 4000)
    const ingressPorts = np.spec.ingress[0].ports.map((p: { port: number }) => p.port)
    expect(ingressPorts).toContain(4000)
  })

  it('includes extra egress ports for Shadow server', () => {
    const np = buildNetworkPolicy('test-agent', 'test-ns', 3100, [3002])
    const allEgressPorts = np.spec.egress.flatMap((r: { ports: Array<{ port: number }> }) =>
      r.ports.map((p) => p.port),
    )
    expect(allEgressPorts).toContain(443)
    expect(allEgressPorts).toContain(53)
    expect(allEgressPorts).toContain(3002)
  })

  it('does not duplicate port 443 in extra egress', () => {
    const np = buildNetworkPolicy('test-agent', 'test-ns', 3100, [443])
    const allEgressPorts = np.spec.egress.flatMap((r: { ports: Array<{ port: number }> }) =>
      r.ports.map((p) => p.port),
    )
    expect(allEgressPorts.filter((p: number) => p === 443)).toHaveLength(1)
  })
})
