# Task 01: Core Plugin Framework

> **Priority**: P0 (Foundation — must complete before plugin implementations)  
> **Depends on**: Nothing  
> **Estimated**: ~400 lines  
> **Output**: `src/plugins/types.ts`, `src/plugins/registry.ts`, `src/plugins/loader.ts`, `src/plugins/config-merger.ts`

## Context

Read first:
- `spec/plugin-system-architecture.md` — Full architecture design
- `spec/plugin-development-guide.md` — Plugin API reference

## Objective

Create the core plugin framework that all plugins depend on. This is the foundation layer.

## Deliverables

### 1. `src/plugins/types.ts` (~150 lines)

Define all core TypeScript interfaces:

```typescript
// Plugin metadata types
export interface PluginManifest { ... }
export type PluginCategory = 'communication' | 'project-management' | ... (16 categories)
export type PluginCapability = 'channel' | 'tool' | ... (7 capabilities)
export type PluginAuthType = 'oauth2' | 'api-key' | 'token' | 'basic' | 'none'
export interface PluginAuthField { key, label, description?, required, sensitive, placeholder?, validation? }
export interface PluginOAuthConfig { authorizationUrl, tokenUrl, scopes, pkce? }
export interface PluginAuth { type, fields, oauth? }

// Plugin definition (what each plugin exports)
export interface PluginDefinition {
  manifest: PluginManifest
  buildOpenClawConfig?(agentConfig, context): PluginConfigFragment
  buildEnvVars?(agentConfig, context): Record<string, string>
  buildK8sResources?(agentConfig, context): K8sResource[]
  provision?(agentConfig, context): Promise<PluginProvisionResult>
  validate?(agentConfig, context): PluginValidationResult
}

// Build context
export interface PluginBuildContext { agent, config, secrets, namespace, pluginRegistry }
export interface PluginProvisionContext { agent, config, secrets, logger, dryRun, existingState }
export interface PluginProvisionResult { state, secrets? }
export interface PluginConfigFragment { channels?, bindings?, plugins?, skills?, tools? }
export interface PluginValidationResult { valid, errors[] }

// Instance config (what goes in shadowob-cloud.json)
export interface PluginInstanceConfig {
  enabled?: boolean
  config?: Record<string, unknown>
  secrets?: Record<string, string>
  agents?: Record<string, { enabled?, config?, role? }>
}
```

Import types from existing codebase:
- `AgentDeployment` from `../config/schema/agent.schema.js`
- `CloudConfig` from `../config/schema/cloud.schema.js`
- `Logger` from `../utils/logger.js`

### 2. `src/plugins/registry.ts` (~100 lines)

Plugin registry that holds all registered plugins:

```typescript
export interface PluginRegistry {
  getAll(): PluginDefinition[]
  get(id: string): PluginDefinition | undefined
  getByCategory(category: PluginCategory): PluginDefinition[]
  getByCapability(cap: PluginCapability): PluginDefinition[]
  search(query: string): PluginDefinition[]
  register(plugin: PluginDefinition): void
}

export function createPluginRegistry(): PluginRegistry { ... }
```

The registry stores plugins in a `Map<string, PluginDefinition>`. The `search()` method matches against `manifest.name`, `manifest.description`, and `manifest.tags`.

### 3. `src/plugins/loader.ts` (~80 lines)

Auto-discovers and loads plugins from `src/plugins/*/index.ts`:

```typescript
export async function loadAllPlugins(registry: PluginRegistry): Promise<void>
export async function loadPlugin(pluginDir: string): Promise<PluginDefinition>
export function validateManifest(manifest: unknown): manifest is PluginManifest
```

Implementation approach:
- Use `fs.readdirSync` to find subdirectories of `src/plugins/`
- Skip `types.ts`, `registry.ts`, `loader.ts`, `config-merger.ts` (framework files)
- For each directory, dynamically `import()` the `index.ts` (or `index.js` at runtime)
- Validate the manifest schema
- Register in the registry

For production (bundled CLI), plugins are statically imported. Create a `src/plugins/all.ts` barrel that explicitly imports each plugin. The loader falls back to this when dynamic import isn't available.

### 4. `src/plugins/config-merger.ts` (~70 lines)

Merges plugin config fragments into the final OpenClaw config:

```typescript
export function mergePluginFragments(
  base: OpenClawConfig,
  fragments: PluginConfigFragment[],
): OpenClawConfig

export function resolveAgentPluginConfig(
  pluginId: string,
  agentId: string,
  config: CloudConfig,
): Record<string, unknown> | null

export function resolvePluginSecrets(
  pluginId: string,
  config: CloudConfig,
  processEnv: Record<string, string | undefined>,
): Record<string, string>
```

Merge rules:
- `channels`: deep merge (each plugin owns its channel namespace)
- `bindings`: append (array concat)
- `plugins.entries`: deep merge
- `skills`: deep merge
- `tools`: deep merge

## Acceptance Criteria

1. All types exported from `src/plugins/types.ts`
2. `createPluginRegistry()` returns a working registry
3. `loadAllPlugins()` discovers and loads plugins from the directory
4. `mergePluginFragments()` correctly merges multiple plugin outputs
5. `resolveAgentPluginConfig()` correctly merges global + per-agent config
6. Add to `src/config/schema/index.ts` re-exports if needed
7. Unit tests in `__tests__/plugins/registry.test.ts` (~50 lines)

## File Locations

All new files go under `src/plugins/`:
```
src/plugins/
├── types.ts
├── registry.ts
├── loader.ts
└── config-merger.ts
```
