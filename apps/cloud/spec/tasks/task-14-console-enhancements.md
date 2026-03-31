# Task 14: Console Enhancements (Team Viz, Kanban, Config Export)

> **Priority**: P1 (Wave 2 — independent, no plugin dependency)  
> **Depends on**: Nothing (can run in Wave 1 or Wave 2)  
> **Estimated**: ~600 lines  
> **Output**: 3 new pages in `src/interfaces/dashboard/pages/`

## Context

Read first:
- `src/interfaces/dashboard/pages/` — Existing page components
- `src/interfaces/dashboard/router.tsx` — Route definitions
- `src/interfaces/http/server.ts` — API endpoints

## Objective

Create 3 new console features requested by the user: Team Visualization, Kanban Board, and Config Export (one-click bundling).

## Deliverables

### 1. `TeamVisualizationPage.tsx` (~250 lines) — Agent Connection Graph

**Route**: `/team`

**Purpose**: Visual graph showing how agents connect to each other, which plugins they use, and message flow.

**Layout**:
```
┌─────────────────────────────────────────────────────┐
│ Team Visualization                    [Layout: ▦ ⊙]│
├─────────────────────────────────────────────────────┤
│                                                      │
│    ┌──────┐                   ┌──────┐              │
│    │ Slack│──────────────────▸│ Asst │              │
│    └──────┘                   └──┬───┘              │
│                                  │                   │
│    ┌──────┐     ┌──────┐     ┌──▼───┐              │
│    │GitHub│────▸│Review│◂───▸│Coord.│              │
│    └──────┘     └──────┘     └──┬───┘              │
│                                  │                   │
│    ┌──────┐                   ┌──▼───┐              │
│    │Stripe│──────────────────▸│Metrcs│              │
│    └──────┘                   └──────┘              │
│                                                      │
├─────────────────────────────────────────────────────┤
│ Legend: 🟢 Healthy  🟡 Warning  🔴 Error            │
│ Agents: 4  Plugins: 3  Connections: 5               │
└─────────────────────────────────────────────────────┘
```

**Implementation**:
- **Graph rendering**: Use SVG with `<circle>`, `<line>`, `<text>` elements. No external graph library needed for a simple force-directed or hierarchical layout.
- **Data source**: Parse `cloudConfig.plugins` and `cloudConfig.deployments.agents` to build a graph:
  - Nodes: agents (circle) + plugins (rounded rect)
  - Edges: agent→plugin connections, agent→agent (via shared channels)
- **Interaction**: Click node to see details panel. Hover to highlight connections.
- **Layout modes**: Grid (default) and Force-directed (optional).

**API Calls**:
- `GET /api/config` — Get full cloud config to build graph
- `GET /api/deployments` — Get deployment status for health indicators

### 2. `KanbanPage.tsx` (~200 lines) — Agent Activity Kanban

**Route**: `/kanban`

**Purpose**: Track agent deployments and tasks in a kanban-style board.

**Layout**:
```
┌─────────────────────────────────────────────────────┐
│ Kanban Board                           [+ New Task] │
├─────────────────────────────────────────────────────┤
│ Pending        │ Deploying      │ Running   │ Done  │
│ ───────────    │ ───────────    │ ─────── │ ────── │
│ ┌───────────┐  │ ┌───────────┐  │ ┌───────┐│ ┌────┐│
│ │ code-rev  │  │ │ assistant │  │ │metrics││ │old ││
│ │ Waiting   │  │ │ Building..│  │ │3 pods ││ │ ✓  ││
│ │ 2 plugins │  │ │ 5 plugins │  │ │✅ ok  ││ │    ││
│ └───────────┘  │ └───────────┘  │ └───────┘│ └────┘│
│                │                │          │       │
└─────────────────────────────────────────────────────┘
```

**Implementation**:
- **Columns**: Pending (configured but not deployed), Deploying (in progress), Running (healthy pods), Error (failed), Done (scaled to 0 / terminated)
- **Cards**: Agent name, status, plugin count, pod count, last activity
- **Drag-and-drop**: Optional (nice to have). For v1, just display current state.
- **Data source**: `GET /api/deployments` provides deployment status

**API Calls**:
- `GET /api/deployments` — Deployment status by namespace
- `GET /api/config` — Agent config for plugin counts

### 3. `ConfigExportPage.tsx` (~150 lines) — One-Click Config Bundling

**Route**: `/export` (or as a section in SettingsPage)

**Purpose**: Export the current configuration as a shareable bundle. This is the "one-click package config for the store" feature.

**Layout**:
```
┌─────────────────────────────────────────────────────┐
│ Export Configuration                                │
├─────────────────────────────────────────────────────┤
│                                                      │
│ Bundle Name:  [My Agent Pack         ]              │
│ Description:  [Production agent team  ]              │
│ Version:      [1.0.0                 ]              │
│                                                      │
│ Include:                                             │
│ ☑ Cloud config (shadowob-cloud.json)                │
│ ☑ Plugin configurations                             │
│ ☐ Secret keys (masked, for reference only)          │
│ ☑ Template format (reusable by others)              │
│                                                      │
│ Preview:                                             │
│ ┌──────────────────────────────────────────────────┐│
│ │ {                                                ││
│ │   "name": "My Agent Pack",                       ││
│ │   "version": "1.0.0",                           ││
│ │   "plugins": { "slack": {...}, "github": {...} } ││
│ │   "deployments": { ... }                         ││
│ │ }                                                ││
│ └──────────────────────────────────────────────────┘│
│                                                      │
│ [Download .json]  [Copy to Clipboard]  [Publish]    │
└─────────────────────────────────────────────────────┘
```

**Implementation**:
- Read current config via `GET /api/config`
- Strip secrets (or mask them as `${env:VAR_NAME}`)
- Convert to template format (compatible with `POST /api/init`)
- Allow download as `.template.json` file
- "Publish" button: future feature (saves to templates/ directory)

**API Calls**:
- `GET /api/config` — Current config
- `POST /api/init` — Verify template is valid (dry run)

### 4. Router & Sidebar Updates

Add routes:
```typescript
'/team': TeamVisualizationPage,
'/kanban': KanbanPage,
'/export': ConfigExportPage,
```

Add sidebar items:
- "Team" (users icon) → `/team`
- "Kanban" (kanban-square icon) → `/kanban`
- "Export" (package icon) → `/export`

### 5. API Endpoints (if needed)

```
GET /api/team/graph  — Pre-computed graph data (optional, can be computed client-side)
```

This endpoint is optional. The client can compute the graph from config + deployments data. Only add it if client-side computation becomes complex.

## Implementation Notes

- **SVG Graph**: Don't use D3 or heavy graph libraries. A simple SVG renderer with manual positioning is sufficient for v1. Agents in a column, plugins on the sides, lines between them.
- **Kanban**: Use CSS Grid with 4-5 columns. Cards are simple divs. No drag-drop library needed for v1.
- **Config Export**: The tricky part is stripping secrets while keeping the config valid. Replace all `${secret:...}` refs with `${env:VAR_NAME}` placeholders.

## Acceptance Criteria

1. `/team` page renders agent-plugin connection graph in SVG
2. Graph accurately reflects current config (agents, plugins, connections)
3. `/kanban` page shows agents in correct columns based on deployment status
4. `/export` page generates valid, downloadable template JSON
5. Exported config has secrets stripped/masked
6. New routes and sidebar items added
7. Pages match existing console design patterns
8. Unit tests: `__tests__/dashboard/team-viz.test.tsx` (~40 lines) — render test

## Files Created

```
src/interfaces/dashboard/pages/TeamVisualizationPage.tsx
src/interfaces/dashboard/pages/KanbanPage.tsx
src/interfaces/dashboard/pages/ConfigExportPage.tsx

__tests__/dashboard/team-viz.test.tsx
```

## Files Modified

```
src/interfaces/dashboard/router.tsx  — Add 3 routes
src/interfaces/dashboard/components/Layout.tsx  — Add 3 sidebar items
```
