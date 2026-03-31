/**
 * Plugin factory helpers — create plugins with minimal boilerplate.
 *
 * Three primary patterns (industry paradigm order):
 * 1. createSkillPlugin  — skill-based plugin (most common, skills+CLI first)
 * 2. createChannelPlugin — communication channel plugin
 * 3. createProviderPlugin — AI model provider plugin
 *
 * Legacy compatibility:
 * - createToolPlugin — MCP-style tool plugin (deprecated, use createSkillPlugin)
 */

import type {
  PluginBuildContext,
  PluginConfigFragment,
  PluginDefinition,
  PluginManifest,
  PluginSkillsProvider,
  PluginCLIProvider,
  PluginMCPProvider,
  PluginValidationResult,
} from './types.js'

// ─── Manifest Loader ────────────────────────────────────────────────────────

/** Type-safe manifest loader — avoids `as unknown as` casts in plugins. */
export function loadManifest(raw: Record<string, unknown>): PluginManifest {
  return raw as unknown as PluginManifest
}

// ─── Shared Helpers ─────────────────────────────────────────────────────────

function buildDefaultEnvVars(
  manifest: PluginManifest,
  context: PluginBuildContext,
): Record<string, string> {
  const envVars: Record<string, string> = {}
  for (const field of manifest.auth.fields) {
    const value = context.secrets[field.key]
    if (value) envVars[field.key] = value
  }
  return envVars
}

function buildDefaultValidation(
  manifest: PluginManifest,
  context: PluginBuildContext,
): PluginValidationResult {
  const errors = []
  for (const field of manifest.auth.fields) {
    if (field.required && !context.secrets[field.key]) {
      errors.push({
        path: `secrets.${field.key}`,
        message: `${field.label} is required`,
        severity: 'error' as const,
      })
    }
  }
  return { valid: errors.filter((e) => e.severity === 'error').length === 0, errors }
}

// ─── Skill Plugin Factory ───────────────────────────────────────────────────

/**
 * Create a skill-based plugin (the industry-standard pattern).
 *
 * Skills are bundled agent procedures + CLI tools that agents can invoke.
 * This is preferred over MCP for most integrations.
 *
 * @example
 * createSkillPlugin(manifest, {
 *   skills: { bundled: ['github'], entries: [{ id: 'github', name: 'GitHub', ... }] },
 *   cli: { tools: [{ name: 'gh', command: 'gh', description: 'GitHub CLI' }] },
 * })
 */
export function createSkillPlugin(
  rawManifest: PluginManifest | Record<string, unknown>,
  options: {
    skills?: PluginSkillsProvider
    cli?: PluginCLIProvider
    mcp?: PluginMCPProvider
  },
): PluginDefinition {
  const manifest = rawManifest as PluginManifest
  return {
    manifest,

    // ── Capability Providers ──
    skills: options.skills,
    cli: options.cli,
    mcp: options.mcp,

    // ── Config Builder (auto-derived from skills+CLI+MCP) ──
    configBuilder: {
      build(
        agentConfig: Record<string, unknown>,
        context: PluginBuildContext,
      ): PluginConfigFragment {
        const fragment: PluginConfigFragment = {}

        // Skills → skills.allowBundled + skills.entries
        if (options.skills) {
          const skillsConfig: Record<string, unknown> = {}
          if (options.skills.bundled?.length) {
            skillsConfig.allowBundled = options.skills.bundled
          }
          if (options.skills.entries?.length) {
            const entries: Record<string, unknown> = {}
            for (const skill of options.skills.entries) {
              entries[skill.id] = {
                enabled: true,
                ...(skill.apiKey ? { apiKey: skill.apiKey } : {}),
                ...(skill.env ? { env: skill.env } : {}),
              }
            }
            skillsConfig.entries = entries
          }
          if (options.skills.install) {
            skillsConfig.install = options.skills.install
          }
          fragment.skills = skillsConfig
        }

        // CLI tools → tools.allow
        if (options.cli?.tools.length) {
          fragment.tools = {
            allow: options.cli.tools.map((t) => t.name),
          }
        }

        // MCP server (fallback for plugins that genuinely need it)
        if (options.mcp?.server) {
          const { server } = options.mcp
          fragment.plugins = {
            entries: {
              [manifest.id]: {
                enabled: true,
                transport: server.transport,
                command: server.command,
                ...(server.args ? { args: server.args } : {}),
                ...(server.env ? { env: server.env } : {}),
              },
            },
          }
        }

        return fragment
      },
    },

    // ── Env Provider ──
    env: {
      build: (_agentConfig, context) => buildDefaultEnvVars(manifest, context),
    },

    // ── Validation Provider ──
    validation: {
      validate: (_agentConfig, context) => buildDefaultValidation(manifest, context),
    },

    // ── Legacy compat (auto-delegate to new providers) ──
    buildOpenClawConfig(agentConfig, context) {
      return this.configBuilder!.build(agentConfig, context)
    },
    buildEnvVars(_agentConfig, context) {
      return buildDefaultEnvVars(manifest, context)
    },
    validate(_agentConfig, context) {
      return buildDefaultValidation(manifest, context)
    },
  }
}

// ─── Channel Plugin Factory ─────────────────────────────────────────────────

/**
 * Create a channel plugin for communication integrations.
 *
 * Channel plugins configure OpenClaw channels (Slack, Discord, Telegram, etc.)
 * and create agent routing bindings.
 */
export function createChannelPlugin(
  rawManifest: PluginManifest | Record<string, unknown>,
  channelBuilder: (
    agentConfig: Record<string, unknown>,
    context: PluginBuildContext,
  ) => PluginConfigFragment,
): PluginDefinition {
  const manifest = rawManifest as PluginManifest
  const channelType = manifest.id

  return {
    manifest,

    // ── Channel Provider ──
    channel: {
      type: channelType,
      buildChannel: channelBuilder,
    },

    // ── Config Builder (delegates to channel) ──
    configBuilder: {
      build: channelBuilder,
    },

    // ── Env Provider ──
    env: {
      build: (_agentConfig, context) => buildDefaultEnvVars(manifest, context),
    },

    // ── Validation Provider ──
    validation: {
      validate: (_agentConfig, context) => buildDefaultValidation(manifest, context),
    },

    // ── Legacy compat ──
    buildOpenClawConfig: channelBuilder,
    buildEnvVars(_agentConfig, context) {
      return buildDefaultEnvVars(manifest, context)
    },
    validate(_agentConfig, context) {
      return buildDefaultValidation(manifest, context)
    },
  }
}

// ─── Provider Plugin Factory ────────────────────────────────────────────────

/**
 * Create an AI model provider plugin.
 *
 * Provider plugins configure model providers (OpenAI, Anthropic, etc.)
 * in the OpenClaw config.
 */
export function createProviderPlugin(
  rawManifest: PluginManifest | Record<string, unknown>,
  options: {
    provider: { id: string; api: string; baseUrl?: string }
    defaultModel?: string
  },
): PluginDefinition {
  const manifest = rawManifest as PluginManifest
  return {
    manifest,

    // ── Config Builder ──
    configBuilder: {
      build(agentConfig: Record<string, unknown>, _context: PluginBuildContext): PluginConfigFragment {
        const apiKeyField = manifest.auth.fields.find((f) => f.required && f.sensitive)
        const config: Record<string, unknown> = {
          ...(apiKeyField ? { apiKey: `\${env:${apiKeyField.key}}` } : {}),
          defaultModel: agentConfig.defaultModel ?? options.defaultModel,
        }
        if (agentConfig.baseUrl || options.provider.baseUrl) {
          config.baseUrl = agentConfig.baseUrl ?? options.provider.baseUrl
        }
        if (agentConfig.models) config.models = agentConfig.models

        return {
          plugins: {
            entries: {
              [manifest.id]: { enabled: true, config },
            },
          },
        }
      },
    },

    // ── Env Provider ──
    env: {
      build: (_agentConfig, context) => buildDefaultEnvVars(manifest, context),
    },

    // ── Validation Provider ──
    validation: {
      validate: (_agentConfig, context) => buildDefaultValidation(manifest, context),
    },

    // ── Legacy compat ──
    buildOpenClawConfig(agentConfig, context) {
      return this.configBuilder!.build(agentConfig, context)
    },
    buildEnvVars(_agentConfig, context) {
      return buildDefaultEnvVars(manifest, context)
    },
    validate(_agentConfig, context) {
      return buildDefaultValidation(manifest, context)
    },
  }
}

// ─── Legacy Factory (deprecated) ────────────────────────────────────────────

/**
 * @deprecated Use createSkillPlugin instead. This creates an MCP-based tool plugin.
 */
export function createToolPlugin(rawManifest: PluginManifest | Record<string, unknown>): PluginDefinition {
  const manifest = rawManifest as PluginManifest
  return {
    manifest,

    buildOpenClawConfig(
      agentConfig: Record<string, unknown>,
      _context: PluginBuildContext,
    ): PluginConfigFragment {
      const entry: Record<string, unknown> = {
        enabled: true,
        config: { ...agentConfig },
      }

      const apiKeyField = manifest.auth.fields.find((f) => f.required && f.sensitive)
      if (apiKeyField) {
        entry.config = {
          ...(entry.config as Record<string, unknown>),
          apiKey: `\${env:${apiKeyField.key}}`,
        }
      }

      return {
        plugins: {
          entries: {
            [manifest.id]: entry,
          },
        },
      }
    },

    buildEnvVars(_agentConfig, context) {
      return buildDefaultEnvVars(manifest, context)
    },

    validate(_agentConfig, context) {
      return buildDefaultValidation(manifest, context)
    },
  }
}
