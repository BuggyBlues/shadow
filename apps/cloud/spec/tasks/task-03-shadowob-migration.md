# Task 03: Shadowob Plugin Migration

> **Priority**: P0 (First plugin — validates the framework)  
> **Depends on**: Task 01 (types, registry), Task 02 (schema changes)  
> **Estimated**: ~500 lines  
> **Output**: `src/plugins/shadowob/` directory (5 files)

## Context

Read first:
- `spec/plugin-system-architecture.md` — Section 10 (Migration Path)
- `spec/plugin-development-guide.md` — Full guide
- `src/config/schema/shadow.schema.ts` — Current shadowob types (107 lines)
- `src/config/openclaw-builder.ts` — `buildShadowobChannels()` function
- `src/provisioning/index.ts` — `provisionShadowResources()` function

## Objective

Migrate the existing hardcoded shadowob integration into a proper plugin under `src/plugins/shadowob/`. This is the first real plugin and validates the entire framework.

## Current Architecture

Shadowob is currently spread across 3 files:
1. **Schema** (`shadow.schema.ts`): `ShadowobPluginConfig`, `ShadowServer`, `ShadowChannel`, `ShadowBuddy`, `ShadowBinding`, `ShadowReplyPolicy`
2. **Builder** (`openclaw-builder.ts`): `buildShadowobChannels()` — converts bindings into OpenClaw shadow channel config
3. **Provisioner** (`provisioning/index.ts`): `provisionShadowResources()` — creates servers, channels, buddies via Shadow API

## Deliverables

### 1. `src/plugins/shadowob/manifest.json`

```json
{
  "id": "shadowob",
  "name": "Shadow",
  "description": "Connect agents to Shadow chat platform with servers, channels, and buddy avatars",
  "version": "1.0.0",
  "category": "communication",
  "icon": "message-circle",
  "website": "https://shadow.com",

  "auth": {
    "type": "token",
    "fields": [
      {
        "key": "SHADOWOB_API_TOKEN",
        "label": "Shadow API Token",
        "description": "Your Shadow platform API token",
        "required": true,
        "sensitive": true
      },
      {
        "key": "SHADOWOB_SERVER_URL",
        "label": "Shadow Server URL",
        "description": "Shadow server base URL",
        "required": true,
        "sensitive": false,
        "placeholder": "https://shadow.example.com"
      }
    ]
  },

  "config": {
    "type": "object",
    "properties": {
      "servers": {
        "type": "array",
        "description": "Shadow servers to provision",
        "items": { "$ref": "#/$defs/ShadowServer" }
      },
      "buddies": {
        "type": "array",
        "description": "Buddy agents to create",
        "items": { "$ref": "#/$defs/ShadowBuddy" }
      },
      "bindings": {
        "type": "array",
        "description": "Binding rules connecting buddies to agents and channels",
        "items": { "$ref": "#/$defs/ShadowBinding" }
      }
    }
  },

  "capabilities": ["channel"],
  "tags": ["communication", "chat", "shadow", "built-in"],
  "popularity": 100
}
```

### 2. `src/plugins/shadowob/schema.ts`

Move all types from `src/config/schema/shadow.schema.ts`:

```typescript
// Re-export all types (these are the canonical definitions now)
export interface ShadowServer { ... }
export interface ShadowChannel { ... }
export interface ShadowBuddy { ... }
export type ShadowReplyPolicyMode = ...
export interface ShadowCustomReplyPolicy { ... }
export interface ShadowReplyPolicy { ... }
export interface ShadowBinding { ... }
export interface ShadowobPluginConfig { ... }
```

Update `src/config/schema/shadow.schema.ts` to re-export from the plugin:
```typescript
// Backward compatibility — re-export from plugin
export { type ShadowServer, type ShadowChannel, type ShadowBuddy, ... } from '../../plugins/shadowob/schema.js'
export type { ShadowobPluginConfig } from '../../plugins/shadowob/schema.js'
```

### 3. `src/plugins/shadowob/builder.ts`

Extract `buildShadowobChannels()` from `openclaw-builder.ts`:

```typescript
import type { PluginBuildContext, PluginConfigFragment } from '../types.js'
import type { ShadowobPluginConfig, ShadowBinding } from './schema.js'

export function buildShadowobConfig(
  agentConfig: Record<string, unknown>,
  context: PluginBuildContext,
): PluginConfigFragment {
  const shadowConfig = agentConfig as ShadowobPluginConfig
  if (!shadowConfig.bindings?.length) return {}

  // Find bindings for this agent
  const agentBindings = shadowConfig.bindings.filter(
    (b) => b.agentId === context.agent.id,
  )
  if (!agentBindings.length) return {}

  // Build OpenClaw shadow channel config (same logic as current buildShadowobChannels)
  return {
    channels: {
      shadow: {
        enabled: true,
        accounts: buildAccountsFromBindings(agentBindings, shadowConfig, context),
      },
    },
    bindings: buildBindingsFromConfig(agentBindings, context),
  }
}

function buildAccountsFromBindings(...) { ... }
function buildBindingsFromConfig(...) { ... }
```

### 4. `src/plugins/shadowob/provisioner.ts`

Extract provisioning logic from `src/provisioning/index.ts`:

```typescript
import type { PluginProvisionContext, PluginProvisionResult } from '../types.js'
import type { ShadowobPluginConfig } from './schema.js'

export async function provisionShadowob(
  agentConfig: Record<string, unknown>,
  context: PluginProvisionContext,
): Promise<PluginProvisionResult> {
  const shadowConfig = agentConfig as ShadowobPluginConfig
  // Same logic as current provisionShadowResources, but using PluginProvisionContext
  // ...
}
```

### 5. `src/plugins/shadowob/index.ts`

Wire it all together:

```typescript
import type { PluginDefinition } from '../types.js'
import manifest from './manifest.json' with { type: 'json' }
import { buildShadowobConfig } from './builder.js'
import { provisionShadowob } from './provisioner.js'

const plugin: PluginDefinition = {
  manifest,

  buildOpenClawConfig(agentConfig, context) {
    return buildShadowobConfig(agentConfig, context)
  },

  buildEnvVars(agentConfig, context) {
    return {
      SHADOWOB_SERVER_URL: context.secrets.SHADOWOB_SERVER_URL ?? '',
    }
  },

  async provision(agentConfig, context) {
    return provisionShadowob(agentConfig, context)
  },

  validate(agentConfig, context) {
    const errors = []
    const config = agentConfig as Record<string, unknown>

    if (!context.secrets.SHADOWOB_API_TOKEN) {
      errors.push({
        path: 'secrets.SHADOWOB_API_TOKEN',
        message: 'Shadow API token is required',
        severity: 'error' as const,
      })
    }

    return { valid: errors.filter(e => e.severity === 'error').length === 0, errors }
  },
}

export default plugin
```

## Migration Steps

1. Create `src/plugins/shadowob/` directory and all 5 files
2. Update `src/config/schema/shadow.schema.ts` to re-export from plugin
3. Update `src/config/openclaw-builder.ts`:
   - Remove `buildShadowobChannels()` (now in plugin)
   - Import plugin pipeline handles it now
4. Update `src/provisioning/index.ts`:
   - Extract shadowob-specific logic to plugin
   - The main provisioner orchestrates all plugins
5. Ensure all existing imports of `ShadowobPluginConfig` etc. still work via re-exports

## Acceptance Criteria

1. All Shadow types live in `src/plugins/shadowob/schema.ts`
2. `src/config/schema/shadow.schema.ts` re-exports everything (backward compat)
3. `buildOpenClawConfig()` produces identical output via plugin pipeline
4. `provisionShadowResources()` delegates to the plugin provisioner
5. All existing unit tests pass unchanged
6. New unit test: `__tests__/plugins/shadowob.test.ts` (~80 lines)
   - Test `buildShadowobConfig()` produces correct channel config
   - Test `validate()` catches missing token
   - Test backward compatibility with old config format

## Files Created

```
src/plugins/shadowob/
├── manifest.json
├── index.ts
├── schema.ts
├── builder.ts
└── provisioner.ts

__tests__/plugins/shadowob.test.ts
```

## Files Modified

```
src/config/schema/shadow.schema.ts    — Re-export from plugin
src/config/openclaw-builder.ts        — Remove buildShadowobChannels, use plugin pipeline
src/provisioning/index.ts             — Delegate to plugin provisioner
```
