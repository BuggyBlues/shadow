# Task 09: Automation & Project Management Plugins

> **Priority**: P1 (Wave 2 — parallel with other plugin tasks)  
> **Depends on**: Task 01 (core framework)  
> **Estimated**: ~800 lines (10 plugins × ~80 lines each)  
> **Output**: `src/plugins/{zapier,make,n8n,dify,asana,linear,clickup,monday,atlassian,jotform}/`

## Context

Read first:
- `spec/plugin-system-architecture.md` — Section 4 (Core Interfaces)
- `spec/plugin-development-guide.md` — Hooks reference

## Objective

Create 10 automation and project management plugins. Automation plugins provide **webhook** and **action** capabilities (receive/trigger external workflows). PM plugins provide **tool** capabilities for task management.

---

## Plugin Specifications

### 1. `zapier` — Zapier

**Capabilities**: webhook, action  
**Auth**: api-key

**Auth Fields**:
- `ZAPIER_NLA_API_KEY` (required, sensitive) — Natural Language Actions API key

**Config Schema**:
```json
{
  "enableNLA": { "type": "boolean", "default": true, "description": "Enable Natural Language Actions" },
  "allowedActions": { "type": "array", "items": { "type": "string" }, "description": "Allowed Zapier action IDs" }
}
```

---

### 2. `make` — Make (formerly Integromat)

**Capabilities**: webhook, action  
**Auth**: api-key

**Auth Fields**:
- `MAKE_API_TOKEN` (required, sensitive)

**Config Schema**:
```json
{
  "organizationId": { "type": "string" },
  "teamId": { "type": "string" },
  "webhookUrl": { "type": "string", "description": "Incoming webhook URL for triggering scenarios" }
}
```

---

### 3. `n8n` — n8n (Self-hosted Automation)

**Capabilities**: webhook, tool, action  
**Auth**: api-key

**Auth Fields**:
- `N8N_API_KEY` (required, sensitive)
- `N8N_BASE_URL` (required, not sensitive) — n8n instance URL

**Config Schema**:
```json
{
  "workflows": { "type": "array", "items": { "type": "string" }, "description": "Workflow IDs to expose as tools" },
  "enableWebhooks": { "type": "boolean", "default": true },
  "enableExecution": { "type": "boolean", "default": true, "description": "Allow agent to execute workflows" }
}
```

---

### 4. `dify` — Dify (AI Workflow Platform)

**Capabilities**: tool, action  
**Auth**: api-key

**Auth Fields**:
- `DIFY_API_KEY` (required, sensitive)
- `DIFY_BASE_URL` (required, not sensitive) — Dify instance URL (default: https://api.dify.ai)

**Config Schema**:
```json
{
  "appId": { "type": "string", "description": "Dify application ID" },
  "conversationMode": { "type": "string", "enum": ["chat", "completion"], "default": "chat" }
}
```

---

### 5. `asana` — Asana

**Capabilities**: tool, data-source  
**Auth**: token (Personal Access Token)

**Auth Fields**:
- `ASANA_ACCESS_TOKEN` (required, sensitive)

**Config Schema**:
```json
{
  "workspaceGid": { "type": "string", "description": "Asana workspace GID" },
  "projectGids": { "type": "array", "items": { "type": "string" }, "description": "Project GIDs to access" },
  "enableTaskCreation": { "type": "boolean", "default": true }
}
```

---

### 6. `linear` — Linear

**Capabilities**: tool, data-source, webhook  
**Auth**: api-key

**Auth Fields**:
- `LINEAR_API_KEY` (required, sensitive)

**Config Schema**:
```json
{
  "teamId": { "type": "string", "description": "Linear team ID" },
  "enableWebhooks": { "type": "boolean", "default": false },
  "defaultProject": { "type": "string", "description": "Default project for new issues" },
  "labels": { "type": "array", "items": { "type": "string" }, "description": "Default labels for created issues" }
}
```

---

### 7. `clickup` — ClickUp

**Capabilities**: tool, data-source  
**Auth**: api-key

**Auth Fields**:
- `CLICKUP_API_TOKEN` (required, sensitive)

**Config Schema**:
```json
{
  "workspaceId": { "type": "string" },
  "spaceIds": { "type": "array", "items": { "type": "string" }, "description": "Space IDs to access" },
  "folderIds": { "type": "array", "items": { "type": "string" }, "description": "Folder IDs to access" }
}
```

---

### 8. `monday` — monday.com

**Capabilities**: tool, data-source  
**Auth**: api-key

**Auth Fields**:
- `MONDAY_API_TOKEN` (required, sensitive)

**Config Schema**:
```json
{
  "boardIds": { "type": "array", "items": { "type": "number" }, "description": "Board IDs to access" },
  "enableUpdates": { "type": "boolean", "default": true, "description": "Allow agent to update items" }
}
```

---

### 9. `atlassian` — Atlassian (Jira + Confluence)

**Capabilities**: tool, data-source  
**Auth**: api-key

**Auth Fields**:
- `ATLASSIAN_API_TOKEN` (required, sensitive)
- `ATLASSIAN_EMAIL` (required, not sensitive) — Account email for basic auth
- `ATLASSIAN_DOMAIN` (required, not sensitive) — e.g., "mycompany.atlassian.net"

**Config Schema**:
```json
{
  "enableJira": { "type": "boolean", "default": true },
  "jiraProjects": { "type": "array", "items": { "type": "string" }, "description": "Jira project keys" },
  "enableConfluence": { "type": "boolean", "default": false },
  "confluenceSpaces": { "type": "array", "items": { "type": "string" }, "description": "Confluence space keys" }
}
```

---

### 10. `jotform` — Jotform

**Capabilities**: webhook, data-source  
**Auth**: api-key

**Auth Fields**:
- `JOTFORM_API_KEY` (required, sensitive)

**Config Schema**:
```json
{
  "formIds": { "type": "array", "items": { "type": "string" }, "description": "Form IDs to monitor" },
  "enableWebhook": { "type": "boolean", "default": true, "description": "Receive form submissions via webhook" }
}
```

---

## Implementation Notes

- **Automation plugins** (zapier, make, n8n, dify): These are "bridge" plugins — they connect agents to external workflow engines. The `buildOpenClawConfig` returns `plugins.entries` with the connection details. The workflows themselves run externally.
- **PM plugins** (asana, linear, clickup, monday, atlassian): These expose project/task management as MCP tools. Agents can create, update, and query tasks.
- **Webhook plugins** (linear, jotform, n8n): Implement `buildK8sResources` for webhook Ingress when webhooks are enabled.

## Acceptance Criteria

1. All 10 plugins have `manifest.json` + `index.ts`
2. Webhook-capable plugins implement `buildK8sResources`
3. All PM plugins return `plugins.entries` with correct tool config
4. Unit tests: `__tests__/plugins/automation-pm.test.ts` (~80 lines)

## Files Created

```
src/plugins/zapier/manifest.json + index.ts
src/plugins/make/manifest.json + index.ts
src/plugins/n8n/manifest.json + index.ts
src/plugins/dify/manifest.json + index.ts
src/plugins/asana/manifest.json + index.ts
src/plugins/linear/manifest.json + index.ts
src/plugins/clickup/manifest.json + index.ts
src/plugins/monday/manifest.json + index.ts
src/plugins/atlassian/manifest.json + index.ts
src/plugins/jotform/manifest.json + index.ts

__tests__/plugins/automation-pm.test.ts
```
