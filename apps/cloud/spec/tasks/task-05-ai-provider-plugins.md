# Task 05: AI Provider Plugins

> **Priority**: P1 (Wave 2 — parallel with other plugin tasks)  
> **Depends on**: Task 01 (core framework)  
> **Estimated**: ~800 lines (8 plugins × ~100 lines each)  
> **Output**: `src/plugins/{openai,anthropic,google-gemini,cohere,perplexity,grok,openrouter,hugging-face}/`

## Context

Read first:
- `spec/plugin-system-architecture.md` — Section 4 (Core Interfaces)
- `spec/plugin-development-guide.md` — Hooks reference
- `src/plugins/types.ts` — Created by Task 01

## Objective

Create 8 AI provider plugins. These provide `auth-provider` capability — they configure API keys and model endpoints for LLM providers. They emit env vars and OpenClaw model/provider config.

## Key Difference from Other Plugins

AI provider plugins primarily:
1. Inject API key env vars
2. Configure OpenClaw `providers` / `models` sections
3. Do NOT create channels or bindings (they're not communication plugins)

Their `buildOpenClawConfig` returns model/provider configuration, and `buildEnvVars` returns the API key mappings.

---

## Plugin Specifications

### 1. `openai` — OpenAI

**Capabilities**: auth-provider, tool  
**Auth**: api-key

**Auth Fields**:
- `OPENAI_API_KEY` (required, sensitive)
- `OPENAI_ORG_ID` (optional, not sensitive)

**Config Schema**:
```json
{
  "defaultModel": { "type": "string", "default": "gpt-4o" },
  "baseUrl": { "type": "string", "description": "Custom base URL (for Azure OpenAI, proxies)" },
  "models": { "type": "array", "items": { "type": "string" }, "description": "Allowed models" }
}
```

**buildOpenClawConfig**: Returns `providers.openai` config with API key reference.

---

### 2. `anthropic` — Anthropic

**Capabilities**: auth-provider  
**Auth**: api-key

**Auth Fields**:
- `ANTHROPIC_API_KEY` (required, sensitive)

**Config Schema**:
```json
{
  "defaultModel": { "type": "string", "default": "claude-sonnet-4-20250514" },
  "models": { "type": "array", "items": { "type": "string" } }
}
```

**buildOpenClawConfig**: Returns `providers.anthropic` config.

---

### 3. `google-gemini` — Google Gemini

**Capabilities**: auth-provider  
**Auth**: api-key

**Auth Fields**:
- `GOOGLE_AI_API_KEY` (required, sensitive)
- `GOOGLE_CLOUD_PROJECT` (optional, not sensitive)

**Config Schema**:
```json
{
  "defaultModel": { "type": "string", "default": "gemini-2.0-flash" },
  "useVertexAI": { "type": "boolean", "default": false, "description": "Use Vertex AI instead of AI Studio" }
}
```

---

### 4. `cohere` — Cohere

**Capabilities**: auth-provider  
**Auth**: api-key

**Auth Fields**:
- `COHERE_API_KEY` (required, sensitive)

**Config Schema**:
```json
{
  "defaultModel": { "type": "string", "default": "command-r-plus" }
}
```

---

### 5. `perplexity` — Perplexity

**Capabilities**: auth-provider, tool  
**Auth**: api-key

**Auth Fields**:
- `PERPLEXITY_API_KEY` (required, sensitive)

**Config Schema**:
```json
{
  "defaultModel": { "type": "string", "default": "sonar-pro" },
  "enableSearch": { "type": "boolean", "default": true, "description": "Enable Perplexity search tool" }
}
```

**buildOpenClawConfig**: Can also return `plugins.entries.perplexity` for search tool.

---

### 6. `grok` — Grok (xAI)

**Capabilities**: auth-provider  
**Auth**: api-key

**Auth Fields**:
- `XAI_API_KEY` (required, sensitive)

**Config Schema**:
```json
{
  "defaultModel": { "type": "string", "default": "grok-2" }
}
```

---

### 7. `openrouter` — OpenRouter

**Capabilities**: auth-provider  
**Auth**: api-key

**Auth Fields**:
- `OPENROUTER_API_KEY` (required, sensitive)

**Config Schema**:
```json
{
  "defaultModel": { "type": "string", "default": "auto" },
  "siteUrl": { "type": "string", "description": "Your site URL for ranking" },
  "appName": { "type": "string", "description": "Your app name for ranking" }
}
```

**buildEnvVars**: `OPENROUTER_SITE_URL`, `OPENROUTER_APP_NAME`

---

### 8. `hugging-face` — Hugging Face

**Capabilities**: auth-provider, tool  
**Auth**: api-key

**Auth Fields**:
- `HF_TOKEN` (required, sensitive)

**Config Schema**:
```json
{
  "defaultModel": { "type": "string" },
  "inferenceEndpoint": { "type": "string", "description": "Custom inference endpoint URL" },
  "enableHub": { "type": "boolean", "default": false, "description": "Enable Hugging Face Hub tool" }
}
```

---

## Implementation Pattern

AI provider plugins share this pattern:

```typescript
import type { PluginDefinition } from '../types.js'
import manifest from './manifest.json' with { type: 'json' }

const plugin: PluginDefinition = {
  manifest,

  buildOpenClawConfig(agentConfig, context) {
    // Provider config — configures the LLM endpoint
    return {
      // Note: exact OpenClaw provider schema depends on OpenClaw's config format
      // This is a representative structure
      providers: {
        [manifest.id]: {
          apiKey: `\${env:${manifest.auth.fields[0].key}}`,
          ...(agentConfig.baseUrl ? { baseUrl: agentConfig.baseUrl } : {}),
        },
      },
    }
  },

  buildEnvVars(agentConfig, context) {
    const envVars: Record<string, string> = {}
    // Map secrets to env vars from manifest.auth.fields
    for (const field of manifest.auth.fields) {
      const value = context.secrets[field.key]
      if (value) envVars[field.key] = value
    }
    return envVars
  },

  validate(agentConfig, context) {
    const errors = []
    const apiKeyField = manifest.auth.fields.find(f => f.required)
    if (apiKeyField && !context.secrets[apiKeyField.key]) {
      errors.push({
        path: `secrets.${apiKeyField.key}`,
        message: `${apiKeyField.label} is required`,
        severity: 'error' as const,
      })
    }
    return { valid: errors.filter(e => e.severity === 'error').length === 0, errors }
  },
}

export default plugin
```

## Acceptance Criteria

1. All 8 plugins have `manifest.json` + `index.ts`
2. Each manifest has correct auth fields with appropriate env var names
3. `buildOpenClawConfig` returns valid provider config
4. `buildEnvVars` maps all secret fields to env vars
5. `validate` checks API key is set
6. Unit tests: `__tests__/plugins/ai-providers.test.ts` (~80 lines)
   - Test each plugin's env var output
   - Test validation catches missing API key

## Files Created

```
src/plugins/openai/manifest.json
src/plugins/openai/index.ts
src/plugins/anthropic/manifest.json
src/plugins/anthropic/index.ts
src/plugins/google-gemini/manifest.json
src/plugins/google-gemini/index.ts
src/plugins/cohere/manifest.json
src/plugins/cohere/index.ts
src/plugins/perplexity/manifest.json
src/plugins/perplexity/index.ts
src/plugins/grok/manifest.json
src/plugins/grok/index.ts
src/plugins/openrouter/manifest.json
src/plugins/openrouter/index.ts
src/plugins/hugging-face/manifest.json
src/plugins/hugging-face/index.ts

__tests__/plugins/ai-providers.test.ts
```
