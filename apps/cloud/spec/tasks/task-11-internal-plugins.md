# Task 11: Internal & Long-Tail Plugins

> **Priority**: P2 (Wave 2 — parallel with other plugin tasks)  
> **Depends on**: Task 01 (core framework)  
> **Estimated**: ~400 lines (5+ plugins × ~80 lines each)  
> **Output**: `src/plugins/{hume,jsonbin-io,serena,postman-api,my-browser}/`

## Context

Read first:
- `spec/plugin-system-architecture.md` — Section 4 (Core Interfaces)
- `spec/plugin-development-guide.md` — Quick Start

## Objective

Create the remaining plugins from the user's original list that don't fit neatly into other categories. These are specialized, niche, or internal-use plugins.

---

## Plugin Specifications

### 1. `hume` — Hume AI (Emotion AI)

**Category**: ai-provider  
**Capabilities**: tool, data-source  
**Auth**: api-key

**Auth Fields**:
- `HUME_API_KEY` (required, sensitive)
- `HUME_SECRET_KEY` (optional, sensitive)

**Config Schema**:
```json
{
  "models": {
    "type": "array",
    "items": { "type": "string", "enum": ["language", "face", "speech-prosody", "evi"] },
    "default": ["language"],
    "description": "Hume models to enable"
  },
  "enableEVI": { "type": "boolean", "default": false, "description": "Enable Empathic Voice Interface" }
}
```

---

### 2. `jsonbin-io` — JSONBin.io (JSON Storage)

**Category**: database  
**Capabilities**: tool, data-source  
**Auth**: api-key

**Auth Fields**:
- `JSONBIN_API_KEY` (required, sensitive) — Master key or access key

**Config Schema**:
```json
{
  "collectionId": { "type": "string", "description": "Default collection ID" },
  "enableVersioning": { "type": "boolean", "default": true }
}
```

---

### 3. `serena` — Serena (Code Intelligence)

**Category**: code  
**Capabilities**: tool  
**Auth**: api-key

**Auth Fields**:
- `SERENA_API_KEY` (required, sensitive)

**Config Schema**:
```json
{
  "repoPath": { "type": "string", "description": "Repository path to analyze" },
  "language": { "type": "string", "description": "Primary programming language" }
}
```

---

### 4. `postman-api` — Postman API

**Category**: devops  
**Capabilities**: tool, data-source  
**Auth**: api-key

**Auth Fields**:
- `POSTMAN_API_KEY` (required, sensitive)

**Config Schema**:
```json
{
  "workspaceId": { "type": "string", "description": "Postman workspace ID" },
  "collectionIds": { "type": "array", "items": { "type": "string" }, "description": "Collection IDs to access" },
  "enableMonitors": { "type": "boolean", "default": false }
}
```

---

### 5. `my-browser` — Browser Automation (Generic)

**Category**: other  
**Capabilities**: tool  
**Auth**: none

**Config Schema**:
```json
{
  "browser": { "type": "string", "enum": ["chromium", "firefox"], "default": "chromium" },
  "headless": { "type": "boolean", "default": true },
  "proxy": { "type": "string", "description": "Proxy URL for browser requests" },
  "allowedDomains": { "type": "array", "items": { "type": "string" }, "description": "Restrict browsing to these domains" }
}
```

**Note**: Similar to the `playwright` plugin (Task 06) but provides a higher-level generic browser interface rather than Playwright-specific APIs.

---

## Adding New Plugins (Extension Guide)

This task also includes any additional plugins from the user's original list that weren't covered in Tasks 04-10. If during implementation you identify more services from the user's list, add them here following the same pattern.

The user's original list included ~100+ services. Tasks 04-10 cover ~70+ of them. Any remaining services should be added to this task. Common pattern for simple tool plugins:

```
1. Create manifest.json with id, name, description, auth, config, capabilities
2. Create index.ts using the simple-tool-plugin helper (from Task 10) or inline
3. Done — the registry auto-discovers it
```

## Acceptance Criteria

1. All 5 plugins have `manifest.json` + `index.ts`
2. No-auth plugins (my-browser) have `auth.type: "none"`
3. Categories are correctly assigned
4. Unit tests: `__tests__/plugins/internal.test.ts` (~50 lines)

## Files Created

```
src/plugins/hume/manifest.json + index.ts
src/plugins/jsonbin-io/manifest.json + index.ts
src/plugins/serena/manifest.json + index.ts
src/plugins/postman-api/manifest.json + index.ts
src/plugins/my-browser/manifest.json + index.ts

__tests__/plugins/internal.test.ts
```
