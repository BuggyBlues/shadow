/**
 * Cluster status — check SSH connectivity and k3s service state for each node.
 */

import { resolveNodeCredentials } from './parser.js'
import type { ClusterConfig, NodeConfig } from './schema.js'
import { SSHClient } from './ssh.js'

export interface NodeStatus {
  host: string
  role: NodeConfig['role']
  reachable: boolean
  k3sRunning?: boolean
  k3sVersion?: string
  error?: string
}

export interface ClusterStatus {
  clusterName: string
  nodes: NodeStatus[]
}

async function checkNode(node: NodeConfig): Promise<NodeStatus> {
  const creds = resolveNodeCredentials(node)
  const client = new SSHClient()

  const base: NodeStatus = { host: creds.host, role: node.role, reachable: false }

  try {
    await client.connect(creds)
    base.reachable = true

    const serviceCmd =
      node.role === 'master' ? 'k3s --version' : 'k3s agent --version 2>/dev/null || k3s --version'
    const versionResult = await client.exec(serviceCmd)
    if (versionResult.code === 0) {
      base.k3sRunning = true
      const match = versionResult.stdout.match(/k3s version\s+(\S+)/)
      base.k3sVersion = match?.[1] ?? versionResult.stdout.split('\n')[0]?.trim()
    } else {
      base.k3sRunning = false
    }
  } catch (err) {
    base.error = (err as Error).message
  } finally {
    await client.dispose()
  }

  return base
}

/**
 * Check status of all nodes in the cluster.
 * Runs checks in parallel.
 */
export async function getClusterStatus(config: ClusterConfig): Promise<ClusterStatus> {
  const nodeStatuses = await Promise.all(config.nodes.map(checkNode))
  return { clusterName: config.name, nodes: nodeStatuses }
}
