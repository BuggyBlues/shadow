/**
 * Config parser — reads shadowob-cloud.json, validates with typia,
 * expands 'extends' references, resolves template variables,
 * and builds official OpenClaw config format.
 */

import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { enrichAgentFromGitAgent, readGitAgentDir } from '../adapters/gitagent.js'
import type { AgentConfiguration, CloudConfig, Configuration } from './schema.js'
import { validateCloudConfig } from './schema.js'
import { resolveTemplates, type TemplateContext } from './template.js'

// Re-export buildOpenClawConfig from its dedicated module
export { buildOpenClawConfig } from './openclaw-builder.js'

/**
 * Deep merge two objects. Arrays are replaced, not merged.
 */
export function deepMerge<T extends Record<string, unknown>>(base: T, override: Partial<T>): T {
  const result = { ...base }
  for (const key of Object.keys(override) as Array<keyof T>) {
    const baseVal = result[key]
    const overVal = override[key]
    if (
      overVal !== undefined &&
      typeof baseVal === 'object' &&
      baseVal !== null &&
      !Array.isArray(baseVal) &&
      typeof overVal === 'object' &&
      overVal !== null &&
      !Array.isArray(overVal)
    ) {
      result[key] = deepMerge(
        baseVal as Record<string, unknown>,
        overVal as Record<string, unknown>,
      ) as T[keyof T]
    } else if (overVal !== undefined) {
      result[key] = overVal as T[keyof T]
    }
  }
  return result
}

/**
 * Expand the 'extends' field in an agent configuration by merging
 * with the referenced base configuration from registry.configurations.
 */
export function expandExtends(
  agentConfig: AgentConfiguration,
  configurations: Configuration[],
): AgentConfiguration {
  if (!agentConfig.extends) return agentConfig

  const baseId = agentConfig.extends
  const base = configurations.find((c) => c.id === baseId)
  if (!base) {
    throw new Error(
      `Configuration "${baseId}" not found in registry.configurations. ` +
        `Available: ${configurations.map((c) => c.id).join(', ')}`,
    )
  }

  // Remove the 'extends' and 'id' fields, merge remaining
  const { id: _id, ...baseFields } = base
  const { extends: _extends, ...agentFields } = agentConfig

  return deepMerge(baseFields, agentFields) as AgentConfiguration
}

/**
 * Parse and validate a cloud config file using typia.
 */
export function parseConfigFile(filePath: string): CloudConfig {
  const absPath = resolve(filePath)
  const raw = readFileSync(absPath, 'utf-8')

  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch (err) {
    throw new Error(`Invalid JSON in ${absPath}: ${(err as Error).message}`)
  }

  const result = validateCloudConfig(parsed)
  if (!result.success) {
    const issues = result.errors
      .map((e) => `  - ${e.path}: ${e.expected} (got ${typeof e.value})`)
      .join('\n')
    throw new Error(`Config validation failed:\n${issues}`)
  }

  return result.data
}

/**
 * Fully resolve a cloud config:
 * 1. Expand all 'extends' references
 * 2. Apply gitagent local source adapter (if agent.source.path is set)
 * 3. Resolve template variables
 * Returns a new config with all agents having their final configuration.
 */
export function resolveConfig(config: CloudConfig, templateCtx?: TemplateContext): CloudConfig {
  const configurations = config.registry?.configurations ?? []
  const resolved = { ...config }

  // Expand extends for each agent, then apply local gitagent sources
  if (resolved.deployments?.agents) {
    resolved.deployments = {
      ...resolved.deployments,
      agents: resolved.deployments.agents.map((agent) => {
        let a = {
          ...agent,
          configuration: expandExtends(agent.configuration, configurations),
        }

        // Apply local gitagent source adapter at resolve time
        // (git sources are applied at runtime via init container)
        if (a.source?.path) {
          const localPath = resolve(a.source.path)
          if (existsSync(localPath)) {
            const parsed = readGitAgentDir(localPath)
            a = enrichAgentFromGitAgent(a, parsed)
          }
        }

        return a
      }),
    }
  }

  // Resolve template variables
  return resolveTemplates(resolved, templateCtx)
}
