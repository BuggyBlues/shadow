# Task 06: DevOps & Code Plugins

> **Priority**: P1 (Wave 2 — parallel with other plugin tasks)  
> **Depends on**: Task 01 (core framework)  
> **Estimated**: ~900 lines (9 plugins × ~100 lines each)  
> **Output**: `src/plugins/{github,vercel,cloudflare,sentry,posthog,playwright,neon,supabase,prisma-postgres}/`

## Context

Read first:
- `spec/plugin-system-architecture.md` — Section 4 (Core Interfaces)
- `spec/plugin-development-guide.md` — Hooks reference (especially `buildK8sResources`)
- `src/plugins/types.ts` — Created by Task 01

## Objective

Create 9 DevOps and code-related plugins. These primarily provide **tool** and **data-source** capabilities, giving agents access to development infrastructure.

---

## Plugin Specifications

### 1. `github` — GitHub

**Capabilities**: tool, webhook, action  
**Auth**: token

**Auth Fields**:
- `GITHUB_TOKEN` (required, sensitive) — Personal access token or GitHub App token
- `GITHUB_WEBHOOK_SECRET` (optional, sensitive) — For webhook verification

**Config Schema**:
```json
{
  "org": { "type": "string", "description": "GitHub organization" },
  "repos": { "type": "array", "items": { "type": "string" }, "description": "Repository names to access" },
  "autoReview": { "type": "boolean", "default": false, "description": "Auto-review pull requests" },
  "webhookEvents": { "type": "array", "items": { "type": "string" }, "default": ["push", "pull_request"] }
}
```

**buildOpenClawConfig**: Returns `plugins.entries.github` MCP tool config.

**buildK8sResources**: If webhookEvents is set, create webhook Ingress.

---

### 2. `vercel` — Vercel

**Capabilities**: tool, action  
**Auth**: api-key

**Auth Fields**:
- `VERCEL_TOKEN` (required, sensitive)
- `VERCEL_TEAM_ID` (optional, not sensitive)

**Config Schema**:
```json
{
  "projects": { "type": "array", "items": { "type": "string" }, "description": "Vercel project IDs" },
  "autoPromote": { "type": "boolean", "default": false, "description": "Auto-promote preview to production" }
}
```

**buildOpenClawConfig**: Returns `plugins.entries.vercel` MCP tool config.

---

### 3. `cloudflare` — Cloudflare

**Capabilities**: tool, action  
**Auth**: api-key

**Auth Fields**:
- `CLOUDFLARE_API_TOKEN` (required, sensitive)
- `CLOUDFLARE_ACCOUNT_ID` (required, not sensitive)

**Config Schema**:
```json
{
  "zones": { "type": "array", "items": { "type": "string" }, "description": "Zone IDs to manage" },
  "enableWorkers": { "type": "boolean", "default": false },
  "enableR2": { "type": "boolean", "default": false }
}
```

---

### 4. `sentry` — Sentry

**Capabilities**: data-source, tool, webhook  
**Auth**: api-key

**Auth Fields**:
- `SENTRY_AUTH_TOKEN` (required, sensitive)
- `SENTRY_DSN` (optional, sensitive) — For automatic error reporting

**Config Schema**:
```json
{
  "org": { "type": "string", "description": "Sentry organization slug" },
  "projects": { "type": "array", "items": { "type": "string" } },
  "alertOnNewIssue": { "type": "boolean", "default": true }
}
```

---

### 5. `posthog` — PostHog

**Capabilities**: data-source, tool  
**Auth**: api-key

**Auth Fields**:
- `POSTHOG_API_KEY` (required, sensitive)
- `POSTHOG_PROJECT_ID` (required, not sensitive)

**Config Schema**:
```json
{
  "host": { "type": "string", "default": "https://app.posthog.com", "description": "PostHog instance URL" },
  "trackEvents": { "type": "boolean", "default": true, "description": "Track agent events" }
}
```

---

### 6. `playwright` — Playwright (Browser Automation)

**Capabilities**: tool  
**Auth**: none

**Config Schema**:
```json
{
  "browser": { "type": "string", "enum": ["chromium", "firefox", "webkit"], "default": "chromium" },
  "headless": { "type": "boolean", "default": true },
  "maxPages": { "type": "number", "default": 5, "description": "Max concurrent pages" }
}
```

**Note**: No auth needed — Playwright runs as a sidecar or built-in browser in the agent container.

---

### 7. `neon` — Neon (Serverless Postgres)

**Capabilities**: tool, data-source  
**Auth**: api-key

**Auth Fields**:
- `NEON_API_KEY` (required, sensitive)
- `DATABASE_URL` (required, sensitive) — Neon connection string

**Config Schema**:
```json
{
  "projectId": { "type": "string", "description": "Neon project ID" },
  "branchId": { "type": "string", "description": "Default branch" },
  "enableBranching": { "type": "boolean", "default": false, "description": "Allow agent to create branches" }
}
```

---

### 8. `supabase` — Supabase

**Capabilities**: tool, data-source  
**Auth**: api-key

**Auth Fields**:
- `SUPABASE_URL` (required, not sensitive) — Project URL
- `SUPABASE_SERVICE_ROLE_KEY` (required, sensitive)
- `SUPABASE_ANON_KEY` (optional, sensitive)

**Config Schema**:
```json
{
  "projectRef": { "type": "string", "description": "Supabase project reference" },
  "enableStorage": { "type": "boolean", "default": false },
  "enableEdgeFunctions": { "type": "boolean", "default": false }
}
```

---

### 9. `prisma-postgres` — Prisma Postgres

**Capabilities**: tool, data-source  
**Auth**: api-key

**Auth Fields**:
- `DATABASE_URL` (required, sensitive) — Prisma Postgres connection string
- `PRISMA_ACCELERATE_KEY` (optional, sensitive)

**Config Schema**:
```json
{
  "enableAccelerate": { "type": "boolean", "default": false, "description": "Use Prisma Accelerate" }
}
```

---

## Implementation Notes

- **Tool plugins pattern**: Most of these return `plugins.entries.{name}` in `buildOpenClawConfig` (MCP tools).
- **Data-source plugins**: Also return `plugins.entries`, but the tool configuration is read-only.
- **Webhook plugins** (github, sentry): Implement `buildK8sResources` to create Ingress for webhook endpoints.
- **No-auth plugins** (playwright): Skip auth validation entirely.

## Acceptance Criteria

1. All 9 plugins have `manifest.json` + `index.ts`
2. Webhook plugins (github, sentry) include `buildK8sResources`
3. No-auth plugins (playwright) have `auth.type: "none"` and skip secret validation
4. Unit tests: `__tests__/plugins/devops.test.ts` (~100 lines)

## Files Created

```
src/plugins/github/manifest.json
src/plugins/github/index.ts
src/plugins/vercel/manifest.json
src/plugins/vercel/index.ts
src/plugins/cloudflare/manifest.json
src/plugins/cloudflare/index.ts
src/plugins/sentry/manifest.json
src/plugins/sentry/index.ts
src/plugins/posthog/manifest.json
src/plugins/posthog/index.ts
src/plugins/playwright/manifest.json
src/plugins/playwright/index.ts
src/plugins/neon/manifest.json
src/plugins/neon/index.ts
src/plugins/supabase/manifest.json
src/plugins/supabase/index.ts
src/plugins/prisma-postgres/manifest.json
src/plugins/prisma-postgres/index.ts

__tests__/plugins/devops.test.ts
```
