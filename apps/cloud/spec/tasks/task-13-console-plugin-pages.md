# Task 13: Console Plugin Pages (Store, Detail, Setup)

> **Priority**: P1 (Wave 2 — parallel with plugin tasks)  
> **Depends on**: Task 01 (core framework), Task 12 (secret API)  
> **Estimated**: ~800 lines  
> **Output**: New pages in `src/interfaces/dashboard/pages/`, updated router

## Context

Read first:
- `spec/plugin-system-architecture.md` — Section 8 (Console Pages)
- `src/interfaces/dashboard/pages/` — Existing page components (understand layout patterns)
- `src/interfaces/dashboard/router.tsx` — Current route definitions

Study the existing console pages (OverviewPage, StorePage, SettingsPage) to match the UI patterns:
- TanStack Router for routing
- TanStack Query for data fetching
- Tailwind CSS 4 for styling
- lucide-react for icons
- Existing Layout component for page chrome

## Objective

Create 3 new console pages for the plugin marketplace, plugin detail/setup, and a secrets management interface.

## Deliverables

### 1. `PluginsPage.tsx` (~250 lines) — Plugin Marketplace

**Route**: `/plugins`

**Layout**:
```
┌─────────────────────────────────────────────────────┐
│ Plugin Marketplace                        [Search]  │
├─────────────────────────────────────────────────────┤
│ Categories: All | Communication | AI | DevOps | ... │
├─────────────────────────────────────────────────────┤
│ ┌──────────┐ ┌──────────┐ ┌──────────┐             │
│ │ [icon]   │ │ [icon]   │ │ [icon]   │             │
│ │ Slack    │ │ GitHub   │ │ OpenAI   │             │
│ │ Connect..│ │ Code &.. │ │ AI prov. │             │
│ │ ✅ Active│ │ ⚙ Setup │ │ ⚠ Needs..│             │
│ └──────────┘ └──────────┘ └──────────┘             │
│ ... more cards ...                                  │
└─────────────────────────────────────────────────────┘
```

**Features**:
- Grid of plugin cards from `GET /api/plugins`
- Category filter tabs (all 16 categories)
- Search input (name, tags, description)
- Card shows: icon, name, description (truncated), status badge
- Status: "Active" (configured + secrets set), "Setup Required" (enabled but missing secrets), "Available" (not configured)
- Click card → navigate to `/plugins/:id`

**API Calls**:
- `GET /api/plugins` — All available plugins
- `GET /api/secrets` — Secret groups to determine status

### 2. `PluginDetailPage.tsx` (~300 lines) — Plugin Setup & Config

**Route**: `/plugins/:pluginId`

**Layout**:
```
┌─────────────────────────────────────────────────────┐
│ ← Back to Plugins                                   │
│                                                      │
│ [icon] Slack                              [Enable]  │
│ Connect agents to Slack workspaces                  │
│ Category: Communication | Caps: channel, webhook    │
├─────────────────────────────────────────────────────┤
│ Tabs: Setup | Configuration | Agents | Docs         │
├─────────────────────────────────────────────────────┤
│ Setup Tab:                                          │
│ ┌──────────────────────────────────────────────────┐│
│ │ 🔑 Authentication                               ││
│ │                                                   ││
│ │ Bot Token:  [xoxb-•••••••••] [👁] [Test]         ││
│ │ Signing Secret: [Not set]         [Paste]         ││
│ │                                                   ││
│ │ Status: ✅ Connected                              ││
│ └──────────────────────────────────────────────────┘│
│                                                      │
│ Configuration Tab:                                  │
│ ┌──────────────────────────────────────────────────┐│
│ │ Default Channel: [#general        ]              ││
│ │ Mention Only:    [✓]                             ││
│ └──────────────────────────────────────────────────┘│
│                                                      │
│ Agents Tab:                                         │
│ ┌──────────────────────────────────────────────────┐│
│ │ Agent          | Enabled | Channels | Role       ││
│ │ solo-assistant | ✓       | #general | listener   ││
│ │ solo-metrics   | ✓       | #metrics | sender     ││
│ └──────────────────────────────────────────────────┘│
│                                                      │
│ [Save Configuration]    [Test Connection]            │
└─────────────────────────────────────────────────────┘
```

**Features**:
- **Setup tab**: Auth fields from manifest rendered as form inputs. Sensitive fields are masked with reveal toggle. "Test Connection" button calls `POST /api/secrets/test`.
- **Configuration tab**: Dynamic form generated from manifest `config` JSON Schema. Supports string, number, boolean, array inputs.
- **Agents tab**: Per-agent enablement and config overrides.
- **Docs tab**: Plugin description, capabilities, website link, API docs link.

**API Calls**:
- `GET /api/plugins/:id` — Plugin manifest + current config
- `PUT /api/secrets/:pluginId` — Save secrets
- `POST /api/secrets/test` — Test connection
- `PUT /api/config` — Save plugin config in shadowob-cloud.json

### 3. `SecretsPage.tsx` (~200 lines) — Global Secrets Manager

**Route**: `/secrets`

**Layout**:
```
┌─────────────────────────────────────────────────────┐
│ Secrets Manager                                     │
├─────────────────────────────────────────────────────┤
│ Plugin        │ Secrets                   │ Status  │
│───────────────┼───────────────────────────┼─────────│
│ Slack         │ BOT_TOKEN, SIGNING_SECRET │ ✅ Set  │
│ GitHub        │ GITHUB_TOKEN              │ ✅ Set  │
│ Stripe        │ SECRET_KEY, WEBHOOK_SEC   │ ⚠ 1/2  │
│ OpenAI        │ OPENAI_API_KEY            │ ❌ None │
├─────────────────────────────────────────────────────┤
│ 💡 Click a plugin row to configure its secrets      │
│    Secrets are encrypted and stored locally.         │
│    They sync to K8s Secrets during deployment.       │
└─────────────────────────────────────────────────────┘
```

**Features**:
- Table of all plugins with secret status
- Click row → navigate to `/plugins/:id` (Setup tab)
- Summary: how many plugins fully configured vs. partial vs. none
- "Sync to K8s" status indicator (last deploy time vs. secret modification time)

### 4. Router Updates

Add new routes to `src/interfaces/dashboard/router.tsx`:

```typescript
// New routes
'/plugins': PluginsPage,
'/plugins/$pluginId': PluginDetailPage,
'/secrets': SecretsPage,
```

Add sidebar navigation items for "Plugins" and "Secrets".

### 5. API Routes (if not done in Task 12)

Ensure these plugin API routes exist in `src/interfaces/http/server.ts`:

```
GET  /api/plugins         — List all plugins from registry (manifest + enabled status)
GET  /api/plugins/:id     — Get single plugin manifest + current config from cloud config
```

## Implementation Notes

- **JSON Schema → Form**: For the config tab, you need a simple JSON Schema to form renderer. Support these types only: `string`, `number`, `boolean`, `array` (of strings). Don't use a full JSON Schema form library — keep it simple.
- **Masked inputs**: Use `type="password"` for sensitive fields, with an eye icon to toggle visibility.
- **Optimistic updates**: Use TanStack Query mutations with optimistic updates for save operations.
- **Match existing style**: Look at `SettingsPage.tsx` and `DeployWizardPage.tsx` for form patterns.

## Acceptance Criteria

1. `/plugins` page shows all plugins with category filters and search
2. `/plugins/:id` page has functional Setup, Configuration, Agents, Docs tabs
3. Secret fields are masked and can be revealed
4. "Test Connection" calls `POST /api/secrets/test` and shows result
5. Configuration form is generated from manifest JSON Schema
6. `/secrets` page shows overview of all plugin secret status
7. New routes added to router, sidebar navigation updated
8. UI matches existing console design patterns (Tailwind, Layout)
9. Unit tests: `__tests__/dashboard/plugins-page.test.tsx` (~60 lines) — render test

## Files Created

```
src/interfaces/dashboard/pages/PluginsPage.tsx
src/interfaces/dashboard/pages/PluginDetailPage.tsx
src/interfaces/dashboard/pages/SecretsPage.tsx

__tests__/dashboard/plugins-page.test.tsx
```

## Files Modified

```
src/interfaces/dashboard/router.tsx   — Add 3 new routes
src/interfaces/dashboard/components/Layout.tsx  — Add sidebar nav items
src/interfaces/http/server.ts        — Add plugin API endpoints (if not in Task 12)
```
