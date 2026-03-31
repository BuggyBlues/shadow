/**
 * GitAgent source and manifest types.
 * Based on the gitagent standard (MIT): https://github.com/open-gitagent/gitagent
 */

import type { tags } from 'typia'

/**
 * Git repository reference for an agent source.
 */
export interface GitSource {
  /** Repository URL (https or ssh) */
  url: string
  /** Branch, tag, or full SHA. Defaults to "main" */
  ref?: string
  /**
   * Subdirectory inside the repository that contains the agent definition
   * (e.g. "agents/my-agent" in a monorepo). Defaults to repo root.
   */
  dir?: string
  /** Shallow clone depth. Defaults to 1 */
  depth?: number & tags.Type<'uint32'>
  /**
   * Name of a K8s Secret that contains an SSH private key for private repos.
   * The secret must have a key named `ssh-privatekey`.
   */
  sshKeySecret?: string
  /**
   * Name of a K8s Secret (or literal token via ${env:VAR}) for HTTPS auth.
   * Used as: git clone https://<token>@host/repo
   */
  tokenSecret?: string
}

/**
 * How the agent source overlay is handled.
 * - "init-container": At pod startup, an init container clones the repo and
 *   copies files to a shared EmptyDir volume. No build step required.
 * - "build-image": Files are baked into the container image at `shadowob-cloud build` time
 *   using a multi-stage Dockerfile (no runtime git access in K8s).
 */
export type AgentSourceStrategy = 'init-container' | 'build-image'

/**
 * Agent file source specification.
 * Points the agent at a git repository (or local path) that follows the
 * gitagent directory layout: SOUL.md, RULES.md, agent.yaml, skills/, tools/,
 * hooks/, skillflows/, memory/, compliance/, etc.
 */
export interface AgentSource {
  /** Git repository source */
  git?: GitSource
  /**
   * Local filesystem path (dev/CI mode).
   * Resolved at `shadowob-cloud up` time and baked into a ConfigMap or
   * used for local adapter pre-population.
   */
  path?: string
  /**
   * Strategy for delivering source files into the container.
   * Default: "init-container"
   */
  strategy?: AgentSourceStrategy
  /**
   * Path inside the container where the agent source is mounted.
   * OpenClaw reads SOUL.md, RULES.md, skills/, etc. from this directory.
   * Default: "/agent"
   */
  mountPath?: string
  /**
   * Specific file/directory patterns to copy from the source.
   * Default: all standard gitagent files (SOUL.md, RULES.md, skills/, etc.)
   * Use this to limit what gets overlaid.
   */
  include?: string[]
  /**
   * When true, the mounted directory is treated as a gitagent standard layout.
   * The adapter will:
   *   - set OpenClaw's agentDir to mountPath (reads SOUL.md, RULES.md automatically)
   *   - parse agent.yaml model config and merge into agent.model
   *   - parse hooks/hooks.yaml and map to OpenClaw hooks
   *   - enumerate skillflows/*.yaml and map to agent.workflows
   *   - configure compliance from compliance/regulatory-map.yaml
   * Default: true
   */
  gitagent?: boolean
  /**
   * When strategy is "build-image": Docker registry to push the built image to.
   * e.g. "ghcr.io/my-org/my-agent:latest"
   * If omitted, uses a local image name based on agentId.
   */
  imageTag?: string
}

/**
 * Parsed gitagent agent.yaml manifest (v0.2.0).
 * Used internally by the gitagent adapter.
 */
export interface GitAgentManifest {
  name: string
  version?: string
  description?: string
  model?: {
    preferred: string
    fallbacks?: string[]
    constraints?: {
      temperature?: number
      max_tokens?: number
      top_p?: number
      thinking_level?: string
    }
  }
  skills?: string[]
  tools?: string[]
  runtime?: {
    type?: string
    framework?: string
    executor?: string
    cwd?: string
  }
  compliance?: {
    risk_tier?: 'low' | 'standard' | 'high' | 'critical'
    frameworks?: string[]
    supervision?: {
      human_in_the_loop?: 'always' | 'conditional' | 'advisory' | 'none'
    }
    recordkeeping?: {
      audit_logging?: boolean
      retention_period?: string
    }
    model_risk?: {
      validation_required?: boolean
      quarterly_reviews?: boolean
    }
  }
  dependencies?: Record<string, string>
  agents?: string[]
  delegation?: {
    strategy?: 'explicit' | 'auto'
    allowed?: string[]
  }
  exports?: Record<string, unknown>
}

/**
 * Hooks configuration parsed from hooks/hooks.yaml.
 */
export interface GitAgentHooksConfig {
  lifecycle?: {
    on_start?: string
    on_stop?: string
    on_error?: string
    on_reset?: string
  }
  events?: Array<{
    name: string
    trigger: string
    skill?: string
    tool?: string
    prompt?: string
  }>
  bootstrap?: string
  teardown?: string
}

/**
 * Scheduler configuration parsed from scheduler.yml.
 */
export interface GitAgentSchedulerConfig {
  schedules?: Array<{
    name: string
    cron?: string
    interval?: string
    skill?: string
    tool?: string
    prompt?: string
    enabled?: boolean
  }>
}
