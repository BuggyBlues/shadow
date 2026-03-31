/**
 * Top-level CloudConfig — the root shadowob-cloud.json schema.
 */

import typia from 'typia'
import type {
  CloudSkillsConfig,
  DeploymentsConfig,
  RegistryConfig,
  SharedWorkspaceConfig,
  TeamConfig,
} from './agent.schema.js'
import type { VaultConfig } from './managed-agents.schema.js'
import type { PluginsConfig } from './shadow.schema.js'

/**
 * Top-level shadowob-cloud.json config.
 *
 * @title Shadow Cloud Configuration
 * @description Configuration file for deploying OpenClaw AI agents to Kubernetes.
 */
export interface CloudConfig {
  /** Config version */
  version: string
  /** Human-readable name for this deployment config (shown in console) */
  name?: string
  /** Description of what this agent team does */
  description?: string
  /** Deployment environment */
  environment?: 'development' | 'staging' | 'production'
  /**
   * Team / agent pack definition.
   * Groups agents with shared defaults — model, compliance, workspace.
   * Inspired by CrewClaw's "Agent Packs" concept.
   */
  team?: TeamConfig
  /** Shadow resource plugins */
  plugins?: PluginsConfig
  /** Reusable provider/configuration registry */
  registry?: RegistryConfig
  /** K8s deployment definitions */
  deployments?: DeploymentsConfig
  /** Shared workspace (distributed filesystem across agents) */
  workspace?: SharedWorkspaceConfig
  /** Cloud-level skills registry */
  skills?: CloudSkillsConfig
  /**
   * Vault definitions for secret isolation.
   * Each agent references a vault by name (default: "default").
   * Per-agent K8s Secrets are generated with only the relevant keys.
   */
  vaults?: Record<string, VaultConfig>
}

// ─── Typia Validators ───────────────────────────────────────────────────────

/**
 * Validate a CloudConfig object.
 * Uses typia AOT compilation — zero runtime schema overhead.
 */
export const validateCloudConfig: (input: unknown) => typia.IValidation<CloudConfig> =
  typia.createValidate<CloudConfig>()

/**
 * Assert a CloudConfig object (throws on failure).
 */
export const assertCloudConfig: (input: unknown) => CloudConfig = typia.createAssert<CloudConfig>()
