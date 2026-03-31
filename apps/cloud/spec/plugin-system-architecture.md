# Shadow Cloud Plugin System Architecture

> Version 2.0 — 2026-04-12  
> **Previous:** V1.0 (hooks-based) → **Current:** V2.0 (provider-based)

## 1. Overview

The plugin system provides a **universal, extensible integration layer** for connecting AI agents to external services (Slack, GitHub, Stripe, Notion, etc.). V2.0 adopts a **provider-based interface** with three factory functions and a **Skills + CLI first** paradigm.

Each plugin is created via one of three factories:

- **`createSkillPlugin`** — Plugins that contribute OpenClaw skills and CLI commands (primary pattern)
- **`createChannelPlugin`** — Plugins that create bidirectional message channels (Slack, Discord, Shadow)
- **`createProviderPlugin`** — Plugins that supply LLM/AI provider credentials (OpenAI, Anthropic)

Each plugin consists of up to **9 structured providers**:

| Provider | Purpose | Required |
|----------|---------|----------|
| `skills` | Declare OpenClaw skills for the agent | Factory-dependent |
| `cli` | Register CLI subcommands (`shadowob-cloud plugin:xxx`) | No |
| `mcp` | Declare MCP server tools (lightweight, not the primary pattern) | No |
| `channel` | Produce OpenClaw channel config fragments | `createChannelPlugin` only |
| `configBuilder` | Build OpenClaw config fragments at deploy time | Yes |
| `resources` | Emit extra K8s manifests (Ingress, CronJob, ConfigMap) | No |
| `env` | Produce env vars injected into K8s Pod containers | No |
| `lifecycle` | `provision()` and `healthCheck()` hooks | No |
| `validation` | Validate plugin config at `shadowob-cloud validate` time | No |

### Plugin Pipeline (V2.0)

```
shadowob-cloud.json
  ↓ parseConfigFile()
  ↓ validateCloudConfig()
  ↓
For each agent:
  1. validation.validate()          → check config correctness
  2. configBuilder.build()          → OpenClaw config fragments
  3. env.buildEnvVars()             → env vars → injected into K8s Pod spec
  4. resources.buildResources()     → extra K8s manifests (Ingress, CronJob, etc.)
  5. lifecycle.provision()          → create/verify external resources
  6. lifecycle.healthCheck()        → post-deploy health verification
  ↓
Merge all fragments → write agent config.json + K8s manifests
```

The existing `shadowob` integration was the first plugin migrated to this system.

---

## 2. Design Principles

1. **Skills + CLI first** — Plugins primarily contribute OpenClaw skills and CLI commands. MCP is available but not the primary pattern.
2. **Provider-based interface** — Plugins declare structured providers (not lifecycle hooks). Each provider has a single responsibility.
3. **Three factories** — `createSkillPlugin`, `createChannelPlugin`, `createProviderPlugin` enforce correct provider combinations.
4. **Zero coupling** — Plugins know nothing about each other. The plugin host orchestrates.
5. **Config-driven** — Everything is declarable in `shadowob-cloud.json`. No imperative plugin code at deploy time.
6. **Typed schema** — Each plugin declares its config shape (JSON Schema). Validated by typia at build time.
7. **Secret isolation** — Plugin secrets live in dedicated K8s Secrets, never in plaintext config.
8. **Build-time resolution** — Plugins produce OpenClaw config fragments at build time (not runtime).
9. **Infinite extensibility** — Adding a new plugin = adding a directory under `src/plugins/`. No core changes needed.

---

## 3. Plugin Directory Structure

```
src/plugins/
├── registry.ts                  # Plugin registry (auto-discovery)
├── types.ts                     # Core plugin interfaces
├── loader.ts                    # Plugin loader & validator
├── config-merger.ts             # Merge plugin configs into OpenClaw
│
├── shadowob/                    # Built-in: Shadow chat platform
│   ├── manifest.json
│   ├── index.ts                 # PluginDefinition export
│   ├── schema.ts                # Config types (migrated from shadow.schema.ts)
│   ├── provisioner.ts           # Shadow resource provisioning
│   └── builder.ts               # OpenClaw channels config builder
│
├── slack/
│   ├── manifest.json
│   ├── index.ts
│   ├── schema.ts
│   └── builder.ts
│
├── github/
│   ├── manifest.json
│   ├── index.ts
│   ├── schema.ts
│   └── builder.ts
│
├── notion/
│   ├── manifest.json
│   ├── index.ts
│   └── builder.ts
│
├── stripe/
│   ├── manifest.json
│   ├── index.ts
│   └── builder.ts
│
└── ... (100+ plugins)
```

---

## 4. Core Interfaces

### 4.1 PluginManifest (`manifest.json`)

```jsonc
{
  "id": "slack",                           // Unique plugin identifier
  "name": "Slack",                         // Display name
  "description": "Connect agents to Slack workspaces",
  "version": "1.0.0",                      // Plugin version
  "category": "communication",             // Category for store UI
  "icon": "slack",                         // Icon identifier (lucide or custom)
  "website": "https://slack.com",          // Service website
  "docs": "https://api.slack.com/docs",    // API documentation

  "auth": {                                // Authentication requirements
    "type": "oauth2" | "api-key" | "token" | "basic" | "none",
    "fields": [                            // Secret fields the plugin needs
      {
        "key": "SLACK_BOT_TOKEN",          // Env var name
        "label": "Bot Token",
        "description": "xoxb-... token from Slack app",
        "required": true,
        "sensitive": true                  // Stored in K8s Secret, not ConfigMap
      },
      {
        "key": "SLACK_SIGNING_SECRET",
        "label": "Signing Secret",
        "required": false,
        "sensitive": true
      }
    ],
    "oauth": {                             // OAuth config (if type=oauth2)
      "authorizationUrl": "https://slack.com/oauth/v2/authorize",
      "tokenUrl": "https://slack.com/api/oauth.v2.access",
      "scopes": ["chat:write", "channels:read", "users:read"]
    }
  },

  "config": {                              // Plugin-specific config schema
    "type": "object",
    "properties": {
      "channels": {
        "type": "array",
        "items": { "type": "string" },
        "description": "Slack channel IDs to listen on"
      },
      "defaultChannel": {
        "type": "string",
        "description": "Default channel for outbound messages"
      },
      "mentionOnly": {
        "type": "boolean",
        "default": true,
        "description": "Only respond when @mentioned"
      }
    }
  },

  "capabilities": [                        // What this plugin provides
    "channel",                             // Bidirectional message channel
    "notification",                        // Outbound notifications
    "webhook"                              // Inbound webhook receiver
  ],

  "tags": ["communication", "messaging", "team"],
  "popularity": 95                         // Store ranking hint
}
```

### 4.2 PluginDefinition (TypeScript — V2.0 Provider-Based)

```typescript
// src/plugins/types.ts

// ─── Factory Functions ────────────────────────────────────────
// The three factories enforce correct provider combinations:

export function createSkillPlugin(opts: {
  manifest: PluginManifest
  skills: SkillsProvider
  cli?: CliProvider
  mcp?: McpProvider
  configBuilder: ConfigBuilderProvider
  resources?: ResourcesProvider
  env?: EnvProvider
  lifecycle?: LifecycleProvider
  validation?: ValidationProvider
}): PluginDefinition

export function createChannelPlugin(opts: {
  manifest: PluginManifest
  channel: ChannelProvider       // Required for channel plugins
  cli?: CliProvider
  configBuilder: ConfigBuilderProvider
  resources?: ResourcesProvider
  env?: EnvProvider
  lifecycle?: LifecycleProvider
  validation?: ValidationProvider
}): PluginDefinition

export function createProviderPlugin(opts: {
  manifest: PluginManifest
  configBuilder: ConfigBuilderProvider
  env: EnvProvider               // Required — providers inject API keys
  validation?: ValidationProvider
}): PluginDefinition

// ─── Provider Interfaces ──────────────────────────────────────

export interface SkillsProvider {
  /** Declare skills contributed to the agent's OpenClaw config */
  getSkills(context: PluginBuildContext): OpenClawSkillConfig[]
}

export interface CliProvider {
  /** Register CLI subcommands under `shadowob-cloud plugin:<id>` */
  registerCommands(cli: CliRegistry): void
}

export interface McpProvider {
  /** Declare MCP tool servers (lightweight pattern) */
  getServers(context: PluginBuildContext): McpServerConfig[]
}

export interface ChannelProvider {
  /** Produce OpenClaw channel config fragment */
  buildChannel(agentConfig: Record<string, unknown>, context: PluginBuildContext): ChannelConfig
}

export interface ConfigBuilderProvider {
  /** Build OpenClaw config fragments at deploy time */
  build(agentConfig: Record<string, unknown>, context: PluginBuildContext): PluginConfigFragment
}

export interface ResourcesProvider {
  /** Emit extra K8s manifests (Ingress, CronJob, ConfigMap, etc.) */
  buildResources(agentConfig: Record<string, unknown>, context: PluginBuildContext): K8sResource[]
}

export interface EnvProvider {
  /** Produce env vars injected into K8s Pod spec containers */
  buildEnvVars(agentConfig: Record<string, unknown>, context: PluginBuildContext): Record<string, string>
}

export interface LifecycleProvider {
  /** Create/verify external resources during provision */
  provision?(agentConfig: Record<string, unknown>, context: PluginProvisionContext): Promise<PluginProvisionResult>
  /** Post-deploy health verification */
  healthCheck?(agentConfig: Record<string, unknown>, context: PluginProvisionContext): Promise<HealthCheckResult>
}

export interface ValidationProvider {
  /** Validate plugin config */
  validate(agentConfig: Record<string, unknown>, context: PluginValidateContext): PluginValidationResult
}

// ─── Unified PluginDefinition ─────────────────────────────────

export interface PluginDefinition {
  manifest: PluginManifest
  skills?: SkillsProvider
  cli?: CliProvider
  mcp?: McpProvider
  channel?: ChannelProvider
  configBuilder: ConfigBuilderProvider
  resources?: ResourcesProvider
  env?: EnvProvider
  lifecycle?: LifecycleProvider
  validation?: ValidationProvider
}

export type PluginCategory =
  | 'communication'      // Slack, Discord, Telegram, LINE
  | 'project-management' // Asana, Linear, ClickUp, monday.com
  | 'ai-provider'        // OpenAI, Anthropic, Google Gemini, Cohere
  | 'devops'             // Vercel, Cloudflare, Sentry, PostHog
  | 'database'           // Supabase, Neon, Prisma, Airtable
  | 'productivity'       // Notion, Google Drive, Dropbox, Todoist
  | 'automation'         // Zapier, Make, n8n, Dify
  | 'crm'               // HubSpot, Close, Intercom, Apollo
  | 'finance'            // Stripe, PayPal, Xero, RevenueCat
  | 'analytics'          // PostHog, Metabase, Ahrefs, Similarweb
  | 'media'              // ElevenLabs, HeyGen, Canva, Flux
  | 'email'              // Gmail, Outlook, Mailchimp
  | 'calendar'           // Google Calendar, Outlook Calendar
  | 'search'             // Perplexity, Firecrawl, Google
  | 'code'               // GitHub, Phabricator, Code Search
  | 'other'

export type PluginCapability =
  | 'channel'            // Bidirectional message channel (OpenClaw channel plugin)
  | 'tool'               // Provides MCP tools to agents
  | 'notification'       // Outbound notification delivery
  | 'webhook'            // Inbound webhook receiver
  | 'data-source'        // Read-only data fetching
  | 'action'             // Execute actions on external service
  | 'auth-provider'      // Provides auth tokens to other plugins

export type PluginAuthType = 'oauth2' | 'api-key' | 'token' | 'basic' | 'none'

export interface PluginAuthField {
  key: string            // Env var name (e.g., SLACK_BOT_TOKEN)
  label: string          // Human-readable label
  description?: string
  required: boolean
  sensitive: boolean     // true = K8s Secret, false = ConfigMap
  placeholder?: string   // Input placeholder hint
  validation?: string    // Regex pattern for validation
}

export interface PluginOAuthConfig {
  authorizationUrl: string
  tokenUrl: string
  scopes: string[]
  pkce?: boolean
}

export interface PluginAuth {
  type: PluginAuthType
  fields: PluginAuthField[]
  oauth?: PluginOAuthConfig
}

/**
 * Plugin definition — the main export from each plugin's index.ts.
 */
export interface PluginDefinition {
  /** Plugin manifest (metadata) */
  manifest: PluginManifest

  /**
   * Build-time hook: produce OpenClaw config fragments for this plugin.
   * Called once per agent that has this plugin enabled.
   *
   * @param agentConfig - The agent's plugin-specific config
   * @param context - Build context with secrets, agent info, cloud config
   * @returns Partial OpenClaw config to merge
   */
  buildOpenClawConfig?(
    agentConfig: Record<string, unknown>,
    context: PluginBuildContext,
  ): PluginConfigFragment

  /**
   * Build-time hook: produce extra env vars for the agent container.
   * Secrets referenced here will be sourced from the K8s Secret.
   */
  buildEnvVars?(
    agentConfig: Record<string, unknown>,
    context: PluginBuildContext,
  ): Record<string, string>

  /**
   * Build-time hook: produce extra K8s manifest resources.
   * E.g., webhook ingress, CronJob for polling, etc.
   */
  buildK8sResources?(
    agentConfig: Record<string, unknown>,
    context: PluginBuildContext,
  ): K8sResource[]

  /**
   * Provisioning hook: create/verify external resources.
   * Called during `shadowob-cloud provision` or `shadowob-cloud up`.
   * E.g., create Slack channels, register webhooks, etc.
   */
  provision?(
    agentConfig: Record<string, unknown>,
    context: PluginProvisionContext,
  ): Promise<PluginProvisionResult>

  /**
   * Validation hook: check if the plugin config is valid.
   * Called during `shadowob-cloud validate`.
   */
  validate?(
    agentConfig: Record<string, unknown>,
    context: PluginValidateContext,
  ): PluginValidationResult
}

export interface PluginBuildContext {
  agent: AgentDeployment
  config: CloudConfig
  secrets: Record<string, string>   // Resolved secret values (env-substituted)
  namespace: string
  pluginRegistry: PluginRegistry    // Access other plugins if needed
}

export interface PluginProvisionContext {
  agent: AgentDeployment
  config: CloudConfig
  secrets: Record<string, string>
  logger: Logger
  dryRun: boolean
  existingState: Record<string, unknown> | null
}

export interface PluginProvisionResult {
  state: Record<string, unknown>    // State to persist in provision-state.json
  secrets?: Record<string, string>  // Additional secrets discovered during provisioning
}

export interface PluginConfigFragment {
  /** OpenClaw channels config */
  channels?: Record<string, unknown>
  /** OpenClaw bindings */
  bindings?: Array<Record<string, unknown>>
  /** OpenClaw plugins (MCP tools, etc.) */
  plugins?: Record<string, unknown>
  /** OpenClaw skills */
  skills?: Record<string, unknown>
  /** OpenClaw tools config */
  tools?: Record<string, unknown>
  /** Any additional top-level OpenClaw config */
  [key: string]: unknown
}

export interface PluginValidationResult {
  valid: boolean
  errors: Array<{
    path: string
    message: string
    severity: 'error' | 'warning'
  }>
}
```

### 4.3 Plugin Registry

```typescript
// src/plugins/registry.ts

export interface PluginRegistry {
  /** Get all registered plugins */
  getAll(): PluginDefinition[]

  /** Get a plugin by ID */
  get(id: string): PluginDefinition | undefined

  /** Get plugins by category */
  getByCategory(category: PluginCategory): PluginDefinition[]

  /** Get plugins by capability */
  getByCapability(cap: PluginCapability): PluginDefinition[]

  /** Search plugins */
  search(query: string): PluginDefinition[]

  /** Register a plugin */
  register(plugin: PluginDefinition): void
}
```

---

## 5. Config Schema Changes

### 5.1 New `plugins` section in CloudConfig

```typescript
// Before (hardcoded shadowob):
interface PluginsConfig {
  shadowob?: ShadowobPluginConfig
}

// After (universal plugin system):
interface PluginsConfig {
  [pluginId: string]: PluginInstanceConfig
}

interface PluginInstanceConfig {
  /** Whether this plugin is enabled (default: true) */
  enabled?: boolean
  /** Plugin-specific configuration (validated against plugin's config schema) */
  config?: Record<string, unknown>
  /** Secret references — ${env:VAR} or ${secret:k8s/name/key} */
  secrets?: Record<string, string>
  /** Per-agent overrides */
  agents?: Record<string, {
    enabled?: boolean
    config?: Record<string, unknown>
    role?: string  // Plugin-specific role (e.g., "listener", "sender")
  }>
}
```

### 5.2 Example: shadowob-cloud.json with plugins

```jsonc
{
  "version": "1.0.0",
  "name": "Solopreneur Pack",
  "plugins": {
    "shadowob": {
      "enabled": true,
      "config": {
        "servers": [{ "id": "solo-hq", "name": "Solo HQ", ... }],
        "buddies": [{ "id": "metrics-bot", "name": "Metrics" }],
        "bindings": [{ "targetId": "metrics-bot", "agentId": "solo-metrics", ... }]
      }
    },
    "slack": {
      "enabled": true,
      "secrets": {
        "SLACK_BOT_TOKEN": "${env:SLACK_BOT_TOKEN}"
      },
      "config": {
        "defaultChannel": "#agent-updates"
      },
      "agents": {
        "solo-assistant": {
          "config": { "channels": ["#general", "#support"], "mentionOnly": true }
        },
        "solo-metrics": {
          "config": { "channels": ["#metrics"], "mentionOnly": false }
        }
      }
    },
    "github": {
      "enabled": true,
      "secrets": {
        "GITHUB_TOKEN": "${env:GITHUB_TOKEN}"
      },
      "config": {
        "org": "mycompany",
        "repos": ["frontend", "backend"]
      },
      "agents": {
        "code-reviewer": {
          "config": { "autoReview": true, "reviewStyle": "thorough" }
        }
      }
    },
    "stripe": {
      "enabled": true,
      "secrets": {
        "STRIPE_SECRET_KEY": "${env:STRIPE_SECRET_KEY}",
        "STRIPE_WEBHOOK_SECRET": "${env:STRIPE_WEBHOOK_SECRET}"
      },
      "config": {
        "webhookEvents": ["payment_intent.succeeded", "subscription.created"]
      }
    },
    "notion": {
      "enabled": true,
      "secrets": {
        "NOTION_TOKEN": "${env:NOTION_INTERNAL_TOKEN}"
      },
      "config": {
        "databases": ["tasks", "wiki"]
      }
    }
  },
  "deployments": { ... }
}
```

---

## 6. Build Pipeline Integration

### 6.1 Plugin Config Resolution Flow (V2.0)

```
shadowob-cloud.json (user config)
  ↓ parseConfigFile()
  ↓ validateCloudConfig() — validates plugins generically
  ↓
For each agent in deployments.agents:
  ↓
  For each plugin in config.plugins (if enabled):
    1. validation.validate()                → early config validation
    2. configBuilder.build()                → PluginConfigFragment
    3. env.buildEnvVars()                   → Record<string,string>
    4. resources.buildResources()           → K8sResource[]
    5. lifecycle.provision()                → create external resources
  ↓
  Merge all PluginConfigFragments → final OpenClawConfig
  Inject all env vars → K8s Pod container spec (env: / envFrom:)
  Append all K8s resources → deployment manifests
  ↓
Write agent config.json + K8s manifests
  ↓
Post-deploy: lifecycle.healthCheck() for each plugin
```

**Critical pipeline steps (fixed in V2.0):**
- `env.buildEnvVars()` output is now **injected into K8s Pod container `env:`** (was missing in V1.0)
- `resources.buildResources()` is now **called and appended to manifests** (was defined but never invoked in V1.0)
- `lifecycle.provision()` is now **called during `shadowob-cloud up`** (was defined but never invoked in V1.0)

### 6.2 Merge Strategy

Plugin config fragments are merged in **registration order** with later plugins winning conflicts:

```typescript
function mergePluginFragments(
  base: OpenClawConfig,
  fragments: PluginConfigFragment[],
): OpenClawConfig {
  for (const fragment of fragments) {
    // Channels: deep merge (each plugin owns its channel namespace)
    if (fragment.channels) {
      base.channels = { ...base.channels, ...fragment.channels }
    }
    // Bindings: append
    if (fragment.bindings) {
      base.bindings = [...(base.bindings ?? []), ...fragment.bindings]
    }
    // Plugins/MCP: deep merge
    if (fragment.plugins) {
      base.plugins = deepMerge(base.plugins ?? {}, fragment.plugins)
    }
    // Skills: deep merge
    if (fragment.skills) {
      base.skills = deepMerge(base.skills ?? {}, fragment.skills)
    }
  }
  return base
}
```

---

## 7. Secret Management

### 7.1 Console Secret Manager

The console provides a **Secret Manager** page for managing plugin credentials:

```
Console → Settings → Secrets
  ├── Per-plugin secret groups
  │   ├── Slack: SLACK_BOT_TOKEN, SLACK_SIGNING_SECRET
  │   ├── GitHub: GITHUB_TOKEN
  │   ├── Stripe: STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET
  │   └── Notion: NOTION_TOKEN
  ├── Global secrets (shared across plugins)
  └── K8s Secret sync status
```

**Storage:**
- Secrets stored in `~/.shadowob/secrets.json` (encrypted at rest with OS keychain)
- On deploy: injected as K8s Secrets, mapped to env vars per plugin manifest
- Console API: `GET/PUT /api/secrets` (bearer auth required)

### 7.2 API Endpoints

```
GET  /api/secrets               — List all secret groups (keys only, no values)
PUT  /api/secrets/:pluginId     — Set secrets for a plugin
GET  /api/plugins               — List all available plugins
GET  /api/plugins/:id           — Get plugin details + manifest
GET  /api/plugins/:id/status    — Check if plugin is configured (secrets set, config valid)
POST /api/plugins/:id/validate  — Validate plugin config + test connection
```

---

## 8. Console Pages (New)

### 8.1 Plugins Marketplace (`/plugins`)
- Browse all available plugins by category
- Search, filter, install/enable
- Shows auth requirements and setup instructions
- One-click enable + secret configuration

### 8.2 Plugin Detail (`/plugins/:id`)
- Plugin description, capabilities, config reference
- Setup wizard (enter secrets, configure per-agent)
- Connection test button
- Usage instructions + code samples

### 8.3 Secrets Manager (`/secrets`)
- Manage API keys and tokens for all plugins
- Per-plugin secret groups
- Show which agents use which secrets
- K8s Secret sync status

### 8.4 Team Visualization (`/team`)
- Visual graph of agents, their plugins, and connections
- Shows message flow between agents via channels
- Plugin health indicators per agent

### 8.5 Kanban Board (`/kanban`)
- Agent task tracking dashboard
- Columns: Pending → In Progress → Done
- Powered by agent activity data

---

## 9. Plugin Categories & Initial Set

### Phase 1 — Core (migrate existing + essential)

| Plugin | Category | Capability | Priority |
|--------|----------|------------|----------|
| `shadowob` | communication | channel | P0 (migrate) |
| `slack` | communication | channel, tool | P0 |
| `github` | code | tool, webhook | P0 |
| `notion` | productivity | tool, data-source | P0 |
| `openai` | ai-provider | auth-provider | P0 |
| `anthropic` | ai-provider | auth-provider | P0 |
| `stripe` | finance | tool, webhook | P1 |
| `discord` | communication | channel | P1 |

### Phase 2 — Extended Platform

| Plugin | Category | Capability |
|--------|----------|------------|
| `linear` | project-management | tool |
| `asana` | project-management | tool |
| `clickup` | project-management | tool |
| `monday` | project-management | tool |
| `zapier` | automation | webhook |
| `make` | automation | webhook |
| `n8n` | automation | webhook, tool |
| `dify` | automation | tool |
| `vercel` | devops | tool, action |
| `cloudflare` | devops | tool, action |
| `sentry` | devops | data-source |
| `posthog` | analytics | data-source, tool |
| `supabase` | database | tool, data-source |
| `neon` | database | tool |
| `gmail` | email | channel, tool |
| `google-calendar` | calendar | tool |
| `google-drive` | productivity | data-source |
| `hubspot` | crm | tool, data-source |
| `intercom` | crm | channel, tool |

### Phase 3 — Long Tail

All remaining plugins from the requested list (Dropbox, Airtable, ElevenLabs, HeyGen, Canva, Perplexity, Cohere, etc.) follow the same pattern.

---

## 10. Migration Path (shadowob → plugin)

### Current code locations:
```
src/config/schema/shadow.schema.ts   → src/plugins/shadowob/schema.ts
src/provisioning/index.ts            → src/plugins/shadowob/provisioner.ts
src/config/openclaw-builder.ts       → src/plugins/shadowob/builder.ts (extracted)
```

### Steps:
1. Create `src/plugins/types.ts` with all core interfaces
2. Create `src/plugins/registry.ts` with auto-discovery
3. Migrate `shadowob` to `src/plugins/shadowob/` (extract from schema + builder)
4. Update `PluginsConfig` to use generic `Record<string, PluginInstanceConfig>`
5. Update `buildOpenClawConfig` to iterate over plugin registry
6. Update provisioning to delegate to plugin provisioners
7. Keep backward compatibility: old `plugins.shadowob` format still works

---

## 11. HTTP API Changes

### New Endpoints

```
GET    /api/plugins                    — List available plugins (from registry)
GET    /api/plugins/:id                — Get plugin manifest + status
POST   /api/plugins/:id/validate       — Validate plugin config + test connection
POST   /api/plugins/:id/provision      — Provision plugin resources

GET    /api/secrets                     — List secret groups (no values)
PUT    /api/secrets/:pluginId           — Update secrets for a plugin
DELETE /api/secrets/:pluginId           — Remove secrets for a plugin
POST   /api/secrets/test               — Test if secrets work (dry connect)

GET    /api/team/graph                  — Agent-plugin connection graph for visualization
GET    /api/activity                    — Activity log events
```

### Updated Endpoints

```
POST   /api/deploy                     — Now runs plugin provisioners before deploy
POST   /api/validate                   — Now validates plugin configs too
GET    /api/config                     — Now includes resolved plugin state
```

---

## 12. Plugin Development Guide (Summary)

To create a new plugin:

1. Create `src/plugins/{name}/manifest.json` with metadata
2. Create `src/plugins/{name}/index.ts` exporting `PluginDefinition`
3. Optionally create `schema.ts` for TypeScript types
4. Optionally create `builder.ts` if the plugin modifies OpenClaw config
5. Register automatically via directory convention (no manual registration)

See `spec/plugin-development-guide.md` for the full guide.

---

## 13. Known Gaps Being Fixed

> Documented from expert review (2026-04-12). See `spec/review-action-items.md` for full tracker.

### P0 — Pipeline Breakage (Fixed)

| Issue | Root Cause | Fix |
|-------|-----------|-----|
| Plugin env vars not injected into K8s Pod | `env.buildEnvVars()` output was collected but never written to Pod `container.env` | Pipeline now injects env vars into K8s Pod container spec |
| `resources` provider never called | `resources.buildResources()` was defined in interface but no call site existed in deploy pipeline | Pipeline now calls resources provider and appends manifests |
| `lifecycle.provision()` never called | Provision step was defined but the deploy command skipped it | `shadowob-cloud up` now invokes `lifecycle.provision()` before deploying |

### P1 — Code Quality (Fixed)

| Issue | Fix |
|-------|-----|
| `PluginRegistry` interface defined twice (types.ts + registry.ts) | Consolidated to single definition in `types.ts`, re-exported from registry |
| `createToolPlugin` deprecated but still exported | Removed export, internal usages migrated to `createSkillPlugin` |
| `manifest as unknown as PluginManifest` type assertions | Fixed manifest types to be structurally compatible, removed unsafe casts |

### P2 — Tracked for Future

| Issue | Timeline |
|-------|----------|
| MCP packages not pre-installed in containers | Phase 2 |
| 11 placeholder plugins have no real capability implementation | Phase 2 |
| Plugin config has no UI or CLI entry point for end users | Phase 2 |
