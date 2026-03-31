# Task 07: Productivity Plugins

> **Priority**: P1 (Wave 2 — parallel with other plugin tasks)  
> **Depends on**: Task 01 (core framework)  
> **Estimated**: ~800 lines (10 plugins × ~80 lines each)  
> **Output**: `src/plugins/{notion,google-drive,google-calendar,outlook-calendar,dropbox,airtable,todoist,canva,webflow,wix}/`

## Context

Read first:
- `spec/plugin-system-architecture.md` — Section 4 (Core Interfaces)
- `spec/plugin-development-guide.md` — Quick Start + Hooks reference

## Objective

Create 10 productivity plugins. These primarily provide **tool** and **data-source** capabilities.

---

## Plugin Specifications

### 1. `notion` — Notion

**Capabilities**: tool, data-source  
**Auth**: token (Internal Integration Token)

**Auth Fields**:
- `NOTION_TOKEN` (required, sensitive) — Internal integration token

**Config Schema**:
```json
{
  "databases": { "type": "array", "items": { "type": "string" }, "description": "Database IDs to access" },
  "pages": { "type": "array", "items": { "type": "string" }, "description": "Page IDs to access" },
  "enableSearch": { "type": "boolean", "default": true }
}
```

---

### 2. `google-drive` — Google Drive

**Capabilities**: data-source, tool  
**Auth**: oauth2

**Auth Fields**:
- `GOOGLE_CLIENT_ID` (required, sensitive)
- `GOOGLE_CLIENT_SECRET` (required, sensitive)
- `GOOGLE_REFRESH_TOKEN` (required, sensitive)

**OAuth Config**:
```json
{
  "authorizationUrl": "https://accounts.google.com/o/oauth2/v2/auth",
  "tokenUrl": "https://oauth2.googleapis.com/token",
  "scopes": ["https://www.googleapis.com/auth/drive.readonly"]
}
```

**Config Schema**:
```json
{
  "folderId": { "type": "string", "description": "Root folder ID to access" },
  "mimeTypes": { "type": "array", "items": { "type": "string" }, "description": "File types to index" }
}
```

---

### 3. `google-calendar` — Google Calendar

**Capabilities**: tool  
**Auth**: oauth2

**Auth Fields**:
- `GOOGLE_CLIENT_ID` (required, sensitive)
- `GOOGLE_CLIENT_SECRET` (required, sensitive)
- `GOOGLE_REFRESH_TOKEN` (required, sensitive)

**OAuth Config**: Same as google-drive, scopes: `["https://www.googleapis.com/auth/calendar"]`

**Config Schema**:
```json
{
  "calendarId": { "type": "string", "default": "primary" },
  "enableScheduling": { "type": "boolean", "default": true }
}
```

---

### 4. `outlook-calendar` — Outlook Calendar

**Capabilities**: tool  
**Auth**: oauth2

**Auth Fields**:
- `OUTLOOK_CLIENT_ID` (required, sensitive)
- `OUTLOOK_CLIENT_SECRET` (required, sensitive)
- `OUTLOOK_TENANT_ID` (required, sensitive)
- `OUTLOOK_REFRESH_TOKEN` (required, sensitive)

**OAuth Config**: `https://login.microsoftonline.com/common/oauth2/v2.0/...`, scopes: `["Calendars.ReadWrite"]`

**Config Schema**:
```json
{
  "calendarId": { "type": "string" },
  "enableScheduling": { "type": "boolean", "default": true }
}
```

---

### 5. `dropbox` — Dropbox

**Capabilities**: data-source, tool  
**Auth**: oauth2

**Auth Fields**:
- `DROPBOX_ACCESS_TOKEN` (required, sensitive)

**Config Schema**:
```json
{
  "rootPath": { "type": "string", "default": "/", "description": "Root folder path" }
}
```

---

### 6. `airtable` — Airtable

**Capabilities**: tool, data-source  
**Auth**: api-key (Personal Access Token)

**Auth Fields**:
- `AIRTABLE_API_KEY` (required, sensitive) — Personal access token

**Config Schema**:
```json
{
  "baseId": { "type": "string", "description": "Airtable base ID" },
  "tables": { "type": "array", "items": { "type": "string" }, "description": "Table names to access" }
}
```

---

### 7. `todoist` — Todoist

**Capabilities**: tool  
**Auth**: api-key

**Auth Fields**:
- `TODOIST_API_TOKEN` (required, sensitive)

**Config Schema**:
```json
{
  "projectId": { "type": "string", "description": "Default project ID" },
  "labels": { "type": "array", "items": { "type": "string" }, "description": "Label filters" }
}
```

---

### 8. `canva` — Canva

**Capabilities**: tool, action  
**Auth**: oauth2

**Auth Fields**:
- `CANVA_CLIENT_ID` (required, sensitive)
- `CANVA_CLIENT_SECRET` (required, sensitive)

**Config Schema**:
```json
{
  "brandTemplateId": { "type": "string", "description": "Default brand template" }
}
```

---

### 9. `webflow` — Webflow

**Capabilities**: tool, action  
**Auth**: api-key

**Auth Fields**:
- `WEBFLOW_API_TOKEN` (required, sensitive)

**Config Schema**:
```json
{
  "siteId": { "type": "string", "description": "Webflow site ID" },
  "enablePublish": { "type": "boolean", "default": false, "description": "Allow agent to publish changes" }
}
```

---

### 10. `wix` — Wix

**Capabilities**: tool, action  
**Auth**: api-key

**Auth Fields**:
- `WIX_API_KEY` (required, sensitive)
- `WIX_SITE_ID` (required, not sensitive)

**Config Schema**:
```json
{
  "enableEditing": { "type": "boolean", "default": false, "description": "Allow agent to edit site content" }
}
```

---

## Acceptance Criteria

1. All 10 plugins have `manifest.json` + `index.ts`
2. OAuth plugins have complete `oauth` config in manifest
3. All `buildOpenClawConfig` return `plugins.entries.{name}` MCP tool config
4. Unit tests: `__tests__/plugins/productivity.test.ts` (~80 lines)

## Files Created

```
src/plugins/notion/manifest.json + index.ts
src/plugins/google-drive/manifest.json + index.ts
src/plugins/google-calendar/manifest.json + index.ts
src/plugins/outlook-calendar/manifest.json + index.ts
src/plugins/dropbox/manifest.json + index.ts
src/plugins/airtable/manifest.json + index.ts
src/plugins/todoist/manifest.json + index.ts
src/plugins/canva/manifest.json + index.ts
src/plugins/webflow/manifest.json + index.ts
src/plugins/wix/manifest.json + index.ts

__tests__/plugins/productivity.test.ts
```
