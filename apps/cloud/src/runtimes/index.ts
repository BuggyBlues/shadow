/**
 * Runtime Adapter — plugin-based abstraction for agent runtime types.
 *
 * Each runtime (openclaw, claude-code, codex, gemini, opencode) is a separate
 * adapter that provides:
 * - Default container image
 * - OpenClaw config generation (ACP + plugins)
 * - Container environment variables
 * - npm package for the Dockerfile
 * - Validation
 *
 * The architecture follows openclaw → ACP → CLI pattern:
 *   openclaw gateway → ACPX plugin → CLI harness process
 *
 * The "openclaw" runtime is the baseline — no ACP, just a plain gateway.
 * All other runtimes use ACP to bridge to an external coding CLI.
 */

import type {
  AgentDeployment,
  OpenClawAcpRuntime,
  OpenClawAgentConfig,
  OpenClawConfig,
} from '../config/schema.js'

/**
 * Runtime adapter interface — one per supported runtime type.
 */
export interface RuntimeAdapter {
  /** Runtime identifier (matches AgentRuntime type) */
  readonly id: string

  /** Human-readable name */
  readonly name: string

  /** Default container image when not overridden by user */
  readonly defaultImage: string

  /** npm package(s) to install in the Dockerfile (empty for openclaw base) */
  readonly packages: string[]

  /** Whether this runtime requires git in the container image */
  readonly requiresGit: boolean

  /**
   * ACP harness configuration for this runtime.
   * Returns null for the baseline openclaw runtime (no ACP).
   */
  acpRuntime(agent: AgentDeployment): OpenClawAcpRuntime | null

  /**
   * Apply runtime-specific config to the OpenClaw config object.
   * Called after the base config is built by the parser.
   */
  applyConfig(agent: AgentDeployment, agentEntry: OpenClawAgentConfig, config: OpenClawConfig): void

  /**
   * Extra environment variables needed by this runtime.
   * Merged into the container env.
   */
  extraEnv(agent: AgentDeployment): Record<string, string>
}

// ─── Adapter Registry ─────────────────────────────────────────────────────

const registry = new Map<string, RuntimeAdapter>()

/**
 * Register a runtime adapter. Called by each adapter module at import time.
 */
export function registerRuntime(adapter: RuntimeAdapter): void {
  if (registry.has(adapter.id)) {
    throw new Error(`Runtime adapter "${adapter.id}" already registered`)
  }
  registry.set(adapter.id, adapter)
}

/**
 * Get a runtime adapter by ID. Throws if not found.
 */
export function getRuntime(id: string): RuntimeAdapter {
  const adapter = registry.get(id)
  if (!adapter) {
    const available = [...registry.keys()].join(', ')
    throw new Error(`Unknown runtime "${id}". Available: ${available}`)
  }
  return adapter
}

/**
 * Get all registered runtime adapters.
 */
export function getAllRuntimes(): RuntimeAdapter[] {
  return [...registry.values()]
}

/**
 * Get all registered runtime IDs.
 */
export function getRuntimeIds(): string[] {
  return [...registry.keys()]
}
