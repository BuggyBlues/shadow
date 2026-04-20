/**
 * Cluster config parser — read, validate, and resolve cluster.json.
 *
 * Supports ${env:VAR} template syntax in password fields.
 */

import { readFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { resolve } from 'node:path'
import { type ClusterConfig, ClusterConfigSchema, type NodeConfig } from './schema.js'

// ─── Template resolution ──────────────────────────────────────────────────────

const ENV_TEMPLATE_RE = /\$\{env:([^}]+)\}/g

function resolveEnvTemplate(value: string): string {
  return value.replace(ENV_TEMPLATE_RE, (match, envKey: string) => {
    const envVal = process.env[envKey]
    if (envVal === undefined) {
      throw new Error(`Environment variable "${envKey}" is not set (required by cluster.json)`)
    }
    return envVal
  })
}

function expandHome(p: string): string {
  return p.startsWith('~') ? resolve(homedir(), p.slice(2)) : p
}

// ─── Parser ───────────────────────────────────────────────────────────────────

/**
 * Read and validate cluster.json from the given path.
 * Performs schema validation but does NOT resolve env vars yet
 * (credentials are resolved lazily at connection time via resolveNodeCredentials).
 */
export function readClusterConfig(filePath: string): ClusterConfig {
  const abs = resolve(filePath)
  let raw: unknown
  try {
    raw = JSON.parse(readFileSync(abs, 'utf8'))
  } catch (err) {
    throw new Error(`Failed to read cluster config at ${abs}: ${(err as Error).message}`)
  }

  const result = ClusterConfigSchema.safeParse(raw)
  if (!result.success) {
    const issues = result.error.issues.map((i) => `  • ${i.path.join('.')}: ${i.message}`)
    throw new Error(`Invalid cluster.json:\n${issues.join('\n')}`)
  }

  return result.data
}

/**
 * Resolve credentials for a single node at connection time.
 * Expands ${env:VAR} in password and ~ in sshKeyPath.
 */
export function resolveNodeCredentials(node: NodeConfig): {
  host: string
  port: number
  user: string
  sshKeyPath?: string
  password?: string
} {
  return {
    host: node.host,
    port: node.port,
    user: node.user,
    sshKeyPath: node.sshKeyPath ? expandHome(node.sshKeyPath) : undefined,
    password: node.password ? resolveEnvTemplate(node.password) : undefined,
  }
}

/**
 * Get the master node from a cluster config (always exactly one).
 */
export function getMasterNode(config: ClusterConfig): NodeConfig {
  const master = config.nodes.find((n) => n.role === 'master')
  if (!master) throw new Error('No master node found in cluster config')
  return master
}

/**
 * Get all worker nodes from a cluster config.
 */
export function getWorkerNodes(config: ClusterConfig): NodeConfig[] {
  return config.nodes.filter((n) => n.role === 'worker')
}
