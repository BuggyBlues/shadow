# Task 10: Media, Analytics & Search Plugins

> **Priority**: P1 (Wave 2 — parallel with other plugin tasks)  
> **Depends on**: Task 01 (core framework)  
> **Estimated**: ~1000 lines (16 plugins × ~63 lines each)  
> **Output**: `src/plugins/{elevenlabs,heygen,flux,kling,tripo-ai,metabase,ahrefs,similarweb,polygon-io,zoominfo,firecrawl,explorium,granola,fireflies,tldv,jam}/`

## Context

Read first:
- `spec/plugin-system-architecture.md` — Section 4 (Core Interfaces)
- `spec/plugin-development-guide.md` — Quick Start

## Objective

Create 16 media, analytics, and search plugins. This is the largest batch, but each plugin is relatively simple (tool-only, no channels).

---

## Plugin Specifications

### Media Plugins

#### 1. `elevenlabs` — ElevenLabs (Voice AI)
**Capabilities**: tool, action  
**Auth**: api-key → `ELEVENLABS_API_KEY`  
**Config**: `{ "voiceId": string, "model": string (default: "eleven_turbo_v2") }`

#### 2. `heygen` — HeyGen (AI Video)
**Capabilities**: tool, action  
**Auth**: api-key → `HEYGEN_API_KEY`  
**Config**: `{ "avatarId": string, "templateId": string }`

#### 3. `flux` — Flux (Image Generation)
**Capabilities**: tool  
**Auth**: api-key → `FLUX_API_KEY`  
**Config**: `{ "model": string (default: "flux-pro"), "defaultSize": string (default: "1024x1024") }`

#### 4. `kling` — Kling (Video Generation)
**Capabilities**: tool  
**Auth**: api-key → `KLING_API_KEY`  
**Config**: `{ "model": string, "quality": string (enum: ["standard", "high"], default: "standard") }`

#### 5. `tripo-ai` — Tripo AI (3D Generation)
**Capabilities**: tool  
**Auth**: api-key → `TRIPO_API_KEY`  
**Config**: `{ "outputFormat": string (enum: ["glb", "obj", "fbx"], default: "glb") }`

### Analytics Plugins

#### 6. `metabase` — Metabase
**Capabilities**: data-source, tool  
**Auth**: api-key → `METABASE_API_KEY` + `METABASE_URL` (not sensitive)  
**Config**: `{ "dashboardIds": number[], "questionIds": number[] }`

#### 7. `ahrefs` — Ahrefs (SEO)
**Capabilities**: data-source, tool  
**Auth**: api-key → `AHREFS_API_TOKEN`  
**Config**: `{ "targets": string[] (domains to track), "metrics": string[] }`

#### 8. `similarweb` — Similarweb (Web Analytics)
**Capabilities**: data-source  
**Auth**: api-key → `SIMILARWEB_API_KEY`  
**Config**: `{ "domains": string[] }`

#### 9. `polygon-io` — Polygon.io (Financial Data)
**Capabilities**: data-source, tool  
**Auth**: api-key → `POLYGON_API_KEY`  
**Config**: `{ "tickers": string[], "enableRealtime": boolean (default: false) }`

#### 10. `zoominfo` — ZoomInfo (B2B Data)
**Capabilities**: data-source, tool  
**Auth**: api-key → `ZOOMINFO_API_KEY`  
**Config**: `{ "enableEnrichment": boolean (default: true) }`

### Search & Data Extraction Plugins

#### 11. `firecrawl` — Firecrawl (Web Scraping)
**Capabilities**: tool, data-source  
**Auth**: api-key → `FIRECRAWL_API_KEY`  
**Config**: `{ "maxPages": number (default: 100), "excludePatterns": string[] }`

#### 12. `explorium` — Explorium (Data Enrichment)
**Capabilities**: data-source, tool  
**Auth**: api-key → `EXPLORIUM_API_KEY`  
**Config**: `{ "datasets": string[] }`

### Meeting & Collaboration Plugins

#### 13. `granola` — Granola (Meeting Notes)
**Capabilities**: tool, data-source  
**Auth**: api-key → `GRANOLA_API_KEY`  
**Config**: `{ "enableAutoCapture": boolean (default: true), "workspaceId": string }`

#### 14. `fireflies` — Fireflies.ai (Meeting Transcription)
**Capabilities**: tool, data-source  
**Auth**: api-key → `FIREFLIES_API_KEY`  
**Config**: `{ "enableAutoJoin": boolean (default: false), "language": string (default: "en") }`

#### 15. `tldv` — tl;dv (Meeting Recorder)
**Capabilities**: tool, data-source  
**Auth**: api-key → `TLDV_API_KEY`  
**Config**: `{ "enableAutoRecording": boolean (default: false) }`

#### 16. `jam` — Jam (Bug Reporting)
**Capabilities**: tool, webhook  
**Auth**: api-key → `JAM_API_KEY`  
**Config**: `{ "projectId": string, "enableAutoCapture": boolean (default: false) }`

---

## Implementation Pattern

Since these are all simple tool/data-source plugins, they share a minimal pattern:

```typescript
import type { PluginDefinition } from '../types.js'
import manifest from './manifest.json' with { type: 'json' }

const plugin: PluginDefinition = {
  manifest,

  buildOpenClawConfig(agentConfig, context) {
    return {
      plugins: {
        entries: {
          [manifest.id]: {
            enabled: true,
            config: {
              ...agentConfig,
              apiKey: `\${env:${manifest.auth.fields[0].key}}`,
            },
          },
        },
      },
    }
  },

  buildEnvVars(agentConfig, context) {
    const envVars: Record<string, string> = {}
    for (const field of manifest.auth.fields) {
      if (context.secrets[field.key]) envVars[field.key] = context.secrets[field.key]
    }
    return envVars
  },

  validate(agentConfig, context) {
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
    return { valid: errors.filter(e => e.severity === 'error').length === 0, errors }
  },
}

export default plugin
```

**Tip**: For plugins with identical `index.ts` logic, consider creating a shared helper:

```typescript
// src/plugins/_helpers/simple-tool-plugin.ts
import type { PluginDefinition, PluginManifest } from '../types.js'

export function createSimpleToolPlugin(manifest: PluginManifest): PluginDefinition {
  return { manifest, buildOpenClawConfig(...), buildEnvVars(...), validate(...) }
}
```

Then each plugin's `index.ts` becomes:
```typescript
import { createSimpleToolPlugin } from '../_helpers/simple-tool-plugin.js'
import manifest from './manifest.json' with { type: 'json' }
export default createSimpleToolPlugin(manifest)
```

## Acceptance Criteria

1. All 16 plugins have `manifest.json` + `index.ts`
2. Each manifest has correct auth fields, config schema, capabilities, and category
3. Simple tool helper is used to reduce boilerplate (optional but recommended)
4. Categories are correct: media (5), analytics (5), search (2), collaboration (4)
5. Unit tests: `__tests__/plugins/media-analytics.test.ts` (~80 lines)

## Files Created

```
src/plugins/elevenlabs/manifest.json + index.ts
src/plugins/heygen/manifest.json + index.ts
src/plugins/flux/manifest.json + index.ts
src/plugins/kling/manifest.json + index.ts
src/plugins/tripo-ai/manifest.json + index.ts
src/plugins/metabase/manifest.json + index.ts
src/plugins/ahrefs/manifest.json + index.ts
src/plugins/similarweb/manifest.json + index.ts
src/plugins/polygon-io/manifest.json + index.ts
src/plugins/zoominfo/manifest.json + index.ts
src/plugins/firecrawl/manifest.json + index.ts
src/plugins/explorium/manifest.json + index.ts
src/plugins/granola/manifest.json + index.ts
src/plugins/fireflies/manifest.json + index.ts
src/plugins/tldv/manifest.json + index.ts
src/plugins/jam/manifest.json + index.ts

src/plugins/_helpers/simple-tool-plugin.ts  (optional shared helper)
__tests__/plugins/media-analytics.test.ts
```
