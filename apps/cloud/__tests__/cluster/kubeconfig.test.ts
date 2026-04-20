/**
 * Unit tests for cluster kubeconfig management.
 */

import { mkdirSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// ─── Mock homedir to use temp directory ──────────────────────────────────────

const tmpRoot = join(tmpdir(), `shadow-cloud-kubeconfig-test-${Date.now()}`)

vi.mock('node:os', async (importOriginal) => {
  const actual = await importOriginal<typeof import('node:os')>()
  return {
    ...actual,
    homedir: () => tmpRoot,
  }
})

// Import AFTER mocking
const {
  storeKubeconfig,
  loadKubeconfigPath,
  loadClusterMeta,
  listRegisteredClusters,
  removeClusterFiles,
} = await import('../../src/cluster/kubeconfig.js')

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('kubeconfig management', () => {
  beforeEach(() => {
    mkdirSync(tmpRoot, { recursive: true })
  })

  afterEach(() => {
    rmSync(tmpRoot, { recursive: true, force: true })
  })

  const sampleKubeconfig = `
apiVersion: v1
clusters:
- cluster:
    server: https://127.0.0.1:6443
  name: default
contexts:
- context:
    cluster: default
    user: default
  name: default
current-context: default
`.trim()

  it('storeKubeconfig replaces 127.0.0.1 with master public IP', () => {
    const meta = storeKubeconfig('my-cluster', sampleKubeconfig, '1.2.3.4', 3)
    const stored = readFileSync(meta.kubeconfigPath, 'utf8')
    expect(stored).toContain('https://1.2.3.4:6443')
    expect(stored).not.toContain('127.0.0.1')
  })

  it('storeKubeconfig writes correct metadata', () => {
    const meta = storeKubeconfig('my-cluster', sampleKubeconfig, '1.2.3.4', 3)
    expect(meta.name).toBe('my-cluster')
    expect(meta.masterHost).toBe('1.2.3.4')
    expect(meta.nodeCount).toBe(3)
    expect(meta.createdAt).toBeTruthy()
  })

  it('loadKubeconfigPath returns path for registered cluster', () => {
    storeKubeconfig('test-cluster', sampleKubeconfig, '5.6.7.8', 2)
    const path = loadKubeconfigPath('test-cluster')
    expect(path).toContain('test-cluster.yaml')
  })

  it('loadKubeconfigPath throws for unknown cluster', () => {
    expect(() => loadKubeconfigPath('nonexistent')).toThrow('nonexistent')
  })

  it('loadClusterMeta returns null for unknown cluster', () => {
    const meta = loadClusterMeta('nonexistent')
    expect(meta).toBeNull()
  })

  it('listRegisteredClusters returns empty array when no clusters', () => {
    const list = listRegisteredClusters()
    expect(list).toEqual([])
  })

  it('listRegisteredClusters returns all registered clusters', () => {
    storeKubeconfig('alpha', sampleKubeconfig, '1.1.1.1', 2)
    storeKubeconfig('beta', sampleKubeconfig, '2.2.2.2', 4)
    const list = listRegisteredClusters()
    const names = list.map((c) => c.name).sort()
    expect(names).toEqual(['alpha', 'beta'])
  })

  it('removeClusterFiles cleans up both files', () => {
    storeKubeconfig('to-remove', sampleKubeconfig, '3.3.3.3', 1)
    removeClusterFiles('to-remove')
    expect(loadClusterMeta('to-remove')).toBeNull()
    expect(() => loadKubeconfigPath('to-remove')).toThrow()
  })
})
