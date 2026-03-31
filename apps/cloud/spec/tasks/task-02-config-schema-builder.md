# Task 02: Config Schema + OpenClaw Builder Integration

> **Priority**: P0 (Foundation — must complete before plugin implementations)  
> **Depends on**: Nothing (parallel with Task 01, but Task 03 needs both)  
> **Estimated**: ~300 lines  
> **Output**: Modified `src/config/schema/cloud.schema.ts`, `src/config/schema/shadow.schema.ts`, `src/config/openclaw-builder.ts`

## Context

Read first:
- `spec/plugin-system-architecture.md` — Section 5 (Config Schema Changes), Section 6 (Build Pipeline)
- `spec/plugin-development-guide.md` — Section 4 (Config Resolution)

## Objective

Update the CloudConfig schema to support a generic plugin system instead of hardcoded shadowob, and integrate plugin hooks into the OpenClaw config builder pipeline.

## Current State

### `src/config/schema/shadow.schema.ts`
- Defines `ShadowobPluginConfig` with servers, buddies, bindings
- Exports `PluginsConfig` as `{ shadowob?: ShadowobPluginConfig }`

### `src/config/openclaw-builder.ts`
- `buildOpenClawConfig(agent, config)` — Main builder, ~500 lines
- Has hardcoded `buildShadowobChannels()` function for shadowob
- 16 builder steps, each returning partial OpenClawConfig

## Deliverables

### 1. Update `PluginsConfig` in `src/config/schema/shadow.schema.ts`

Change from hardcoded to generic:

```typescript
// Keep all Shadow* types unchanged (they move to shadowob plugin later)
// But update PluginsConfig to be generic:

import type { PluginInstanceConfig } from '../../plugins/types.js'

export interface PluginsConfig {
  [pluginId: string]: PluginInstanceConfig
}
```

**Backward compatibility**: The old `plugins.shadowob` object structure must still parse correctly. The `ShadowobPluginConfig` type stays in this file until Task 03 migrates it.

### 2. Add `PluginInstanceConfig` to `src/plugins/types.ts` (if not done by Task 01)

Ensure this type exists:

```typescript
export interface PluginInstanceConfig {
  enabled?: boolean
  config?: Record<string, unknown>
  secrets?: Record<string, string>
  agents?: Record<string, {
    enabled?: boolean
    config?: Record<string, unknown>
    role?: string
  }>
}
```

### 3. Update `src/config/openclaw-builder.ts`

Modify the main `buildOpenClawConfig()` function to:

1. **Import** the plugin registry and config-merger
2. **Add a new step** after all existing steps: `applyPluginConfigs()`
3. The new step iterates over `config.plugins`, looks up each plugin, calls its hooks, and merges fragments

```typescript
import { createPluginRegistry, loadAllPlugins } from '../plugins/loader.js'
import { mergePluginFragments, resolveAgentPluginConfig, resolvePluginSecrets } from '../plugins/config-merger.js'
import type { PluginBuildContext, PluginConfigFragment } from '../plugins/types.js'

// In buildOpenClawConfig():
// ... existing 16 steps ...

// Step 17: Apply plugin configs
const fragments = applyPluginConfigs(agent, config, namespace)
result = mergePluginFragments(result, fragments)
```

```typescript
function applyPluginConfigs(
  agent: AgentDeployment,
  config: CloudConfig,
  namespace: string,
): PluginConfigFragment[] {
  const registry = getPluginRegistry() // singleton
  const fragments: PluginConfigFragment[] = []

  if (!config.plugins) return fragments

  for (const [pluginId, pluginInstanceConfig] of Object.entries(config.plugins)) {
    if (pluginInstanceConfig.enabled === false) continue

    const plugin = registry.get(pluginId)
    if (!plugin) {
      // Unknown plugin — skip with warning (don't throw)
      console.warn(`Unknown plugin: ${pluginId} (skipping)`)
      continue
    }

    const agentPluginConfig = resolveAgentPluginConfig(pluginId, agent.id, config)
    if (!agentPluginConfig) continue // plugin not enabled for this agent

    const secrets = resolvePluginSecrets(pluginId, config, process.env)

    const context: PluginBuildContext = {
      agent,
      config,
      secrets,
      namespace,
      pluginRegistry: registry,
    }

    if (plugin.buildOpenClawConfig) {
      fragments.push(plugin.buildOpenClawConfig(agentPluginConfig, context))
    }
  }

  return fragments
}
```

### 4. Update `buildEnvVars` integration

Add a new function to collect env vars from all plugins:

```typescript
export function buildPluginEnvVars(
  agent: AgentDeployment,
  config: CloudConfig,
  namespace: string,
): Record<string, string> {
  const registry = getPluginRegistry()
  const envVars: Record<string, string> = {}

  if (!config.plugins) return envVars

  for (const [pluginId, pluginInstanceConfig] of Object.entries(config.plugins)) {
    if (pluginInstanceConfig.enabled === false) continue

    const plugin = registry.get(pluginId)
    if (!plugin?.buildEnvVars) continue

    const agentPluginConfig = resolveAgentPluginConfig(pluginId, agent.id, config)
    if (!agentPluginConfig) continue

    const secrets = resolvePluginSecrets(pluginId, config, process.env)
    const context: PluginBuildContext = { agent, config, secrets, namespace, pluginRegistry: registry }

    Object.assign(envVars, plugin.buildEnvVars(agentPluginConfig, context))
  }

  return envVars
}
```

### 5. Keep backward compatibility for `buildShadowobChannels()`

**Do NOT remove** the existing `buildShadowobChannels()` function yet. It stays until Task 03 migrates shadowob to a plugin. The new plugin pipeline runs _after_ the legacy shadowob builder, so both work simultaneously during migration.

## Acceptance Criteria

1. `PluginsConfig` is now generic `Record<string, PluginInstanceConfig>` with index signature
2. `buildOpenClawConfig()` calls plugin hooks and merges fragments
3. `buildPluginEnvVars()` collects env vars from all plugins
4. **Existing tests pass** — no breaking changes to the current shadowob flow
5. Unknown plugins are warned, not thrown
6. Unit test: `__tests__/config/openclaw-builder-plugins.test.ts` (~50 lines)
   - Test that plugin hooks are called during build
   - Test that fragments merge correctly
   - Test that unknown plugins are skipped gracefully

## Files Modified

```
src/config/schema/shadow.schema.ts    — Update PluginsConfig type
src/config/openclaw-builder.ts        — Add plugin pipeline step + buildPluginEnvVars
```

## Files Created

```
__tests__/config/openclaw-builder-plugins.test.ts  — Plugin integration tests
```
