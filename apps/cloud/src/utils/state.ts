/**
 * Provision state — persists provisioned Shadow resource IDs to disk.
 *
 * State is saved to `.shadowob/provision-state.json` relative to the config file.
 * This allows follow-up commands (status, logs, scale, down) to reference
 * real IDs without re-provisioning.
 *
 * State file is gitignored (.shadowob/).
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import type { ProvisionResult } from '../provisioning/index.js'

// ─── State Types ──────────────────────────────────────────────────────────────

export interface BuddyState {
  agentId: string
  userId: string
  /** Token is stored for reference — same token injected as K8s Secret */
  token: string
}

export interface ProvisionState {
  /** ISO timestamp of when provisioning ran */
  provisionedAt: string
  /** config ID → real Shadow server ID */
  servers: Record<string, string>
  /** config ID → real Shadow channel ID */
  channels: Record<string, string>
  /** config ID → buddy info { agentId, userId, token } */
  buddies: Record<string, BuddyState>
  /** Shadow server URL used during provisioning */
  shadowServerUrl: string
  /** Stack name used during deployment (if any) */
  stackName?: string
  /** K8s namespace deployed to (if any) */
  namespace?: string
}

// ─── Path Resolution ─────────────────────────────────────────────────────────

/**
 * Get the state directory for a given config file path.
 * Defaults to .shadowob/ next to the config file.
 */
export function getStateDir(configFilePath: string, stateSubdir = '.shadowob'): string {
  return join(dirname(resolve(configFilePath)), stateSubdir)
}

export function getStatePath(configFilePath: string, stateSubdir = '.shadowob'): string {
  return join(getStateDir(configFilePath, stateSubdir), 'provision-state.json')
}

// ─── Load / Save ──────────────────────────────────────────────────────────────

/**
 * Load provision state from disk. Returns null if file doesn't exist.
 */
export function loadProvisionState(
  configFilePath: string,
  stateSubdir = '.shadowob',
): ProvisionState | null {
  const statePath = getStatePath(configFilePath, stateSubdir)
  if (!existsSync(statePath)) return null

  try {
    const raw = readFileSync(statePath, 'utf-8')
    return JSON.parse(raw) as ProvisionState
  } catch {
    return null
  }
}

/**
 * Save provision state to disk. Creates directory if needed.
 */
export function saveProvisionState(
  configFilePath: string,
  state: ProvisionState,
  stateSubdir = '.shadowob',
): string {
  const stateDir = getStateDir(configFilePath, stateSubdir)
  const statePath = getStatePath(configFilePath, stateSubdir)

  mkdirSync(stateDir, { recursive: true })
  writeFileSync(statePath, `${JSON.stringify(state, null, 2)}\n`, 'utf-8')
  return statePath
}

/**
 * Convert ProvisionResult (Maps) to ProvisionState (plain objects for JSON).
 */
export function provisionResultToState(
  result: ProvisionResult,
  shadowServerUrl: string,
  opts?: { stackName?: string; namespace?: string },
): ProvisionState {
  return {
    provisionedAt: new Date().toISOString(),
    shadowServerUrl,
    servers: Object.fromEntries(result.servers),
    channels: Object.fromEntries(result.channels),
    buddies: Object.fromEntries(
      Array.from(result.buddies.entries()).map(([id, info]) => [
        id,
        {
          agentId: info.agentId,
          userId: info.userId,
          token: info.token,
        },
      ]),
    ),
    stackName: opts?.stackName,
    namespace: opts?.namespace,
  }
}

/**
 * Convert ProvisionState back to ProvisionResult (Maps).
 * Used when loading state for follow-up operations.
 */
export function stateToProvisionResult(state: ProvisionState): ProvisionResult {
  return {
    servers: new Map(Object.entries(state.servers)),
    channels: new Map(Object.entries(state.channels)),
    buddies: new Map(Object.entries(state.buddies)),
  }
}

/**
 * Merge new provision result into existing state.
 * New values overwrite existing keys; old provisioned resources are kept.
 */
export function mergeProvisionState(
  existing: ProvisionState | null,
  newState: ProvisionState,
): ProvisionState {
  if (!existing) return newState

  return {
    ...newState,
    servers: { ...existing.servers, ...newState.servers },
    channels: { ...existing.channels, ...newState.channels },
    buddies: { ...existing.buddies, ...newState.buddies },
  }
}

// ─── Display helpers ──────────────────────────────────────────────────────────

/**
 * Format provision state as a human-readable table of resource IDs.
 */
export function formatProvisionState(state: ProvisionState): string {
  const lines: string[] = []

  lines.push(`Shadow Server URL: ${state.shadowServerUrl}`)
  lines.push(`Provisioned at  : ${new Date(state.provisionedAt).toLocaleString()}`)
  if (state.namespace) lines.push(`K8s Namespace   : ${state.namespace}`)
  if (state.stackName) lines.push(`Pulumi Stack    : ${state.stackName}`)
  lines.push('')

  if (Object.keys(state.servers).length > 0) {
    lines.push('Servers:')
    for (const [configId, realId] of Object.entries(state.servers)) {
      lines.push(`  ${configId.padEnd(24)} → ${realId}`)
    }
  }

  if (Object.keys(state.channels).length > 0) {
    lines.push('Channels:')
    for (const [configId, realId] of Object.entries(state.channels)) {
      lines.push(`  ${configId.padEnd(24)} → ${realId}`)
    }
  }

  if (Object.keys(state.buddies).length > 0) {
    lines.push('Buddies:')
    for (const [configId, info] of Object.entries(state.buddies)) {
      lines.push(`  ${configId.padEnd(24)} → agent: ${info.agentId}  user: ${info.userId}`)
    }
  }

  return lines.join('\n')
}
