# Review Action Items — Consolidated Tracker

> **Source:** architecture.review.md, console-product.review.md, contradictions.review.md, plugin-system.review.md  
> **Date:** 2026-04-12  
> **Last Updated:** 2026-04-12 (Phase 7 — Systematic Rework)

## P0 — Critical

| # | Issue | Source | Status |
|---|-------|--------|--------|
| 1 | Plugin env vars not injected into K8s Pod | plugin-system.review | ✅ Fixed |
| 2 | `resources` provider never called in pipeline | plugin-system.review | ✅ Fixed |
| 3 | `lifecycle.provision` never called | plugin-system.review | ✅ Fixed — lifecycle.ts + deploy.service.ts integration |
| 4 | `xcloud` stale CLI references | contradictions.review | ✅ Fixed |
| 5 | `c.ok` type error in SettingsPage | contradictions.review | ✅ Fixed |
| 6 | DeploymentDetailPage useEffect infinite loop | contradictions.review | ✅ Fixed |
| 7 | DeployWizardPage existingProviders unstable ref | contradictions.review | ✅ Fixed (prior session) |

## P1 — Important

| # | Issue | Source | Status |
|---|-------|--------|--------|
| 1 | PluginRegistry duplicate interface definition | plugin-system.review | ✅ Fixed |
| 2 | createToolPlugin deprecated but still exported | plugin-system.review | ✅ Fixed |
| 3 | `manifest as unknown as` type assertions | plugin-system.review | ✅ Fixed |
| 4 | Brand naming inconsistency (xcloud/shadowob/Shadow Cloud) | contradictions.review | ✅ Fixed |
| 5 | "community-maintained" misleading text | contradictions.review | ✅ Fixed |
| 6 | globalSearch state unused | contradictions.review | ✅ Fixed — removed from zustand store |
| 7 | Activity log in localStorage | contradictions.review | ✅ Fixed — server-side `/api/activity` + localStorage fallback |
| 8 | api.ts unknown return types | contradictions.review | ✅ Fixed |
| 9 | API_PRESETS duplicated in DeployWizard + Settings | contradictions.review | ✅ Fixed — extracted to lib/presets.ts |
| 10 | MonitoringPage healthScore NaN (division by zero) | contradictions.review | ✅ Fixed |
| 11 | ClustersPage NamespaceCard dead code | contradictions.review | ✅ Fixed |
| 12 | ConfigEditorPage plain textarea | console-product.review | ✅ Fixed — CodeEditor with line numbers, copy, YAML validation |
| 13 | Sidebar IA unstructured | console-product.review | ✅ Fixed — 4 groups (Deploy, Interact, Manage, System) |

## P2 — Improvements (all completed)

| # | Issue | Source | Status |
|---|-------|--------|--------|
| 1 | No Agent Interaction Panel | console-product.review | ✅ ChatPage — full chat with SSE streaming, conversation history |
| 2 | No Deployment Version History | console-product.review | ✅ Server-side activity log with `/api/activity` endpoints |
| 3 | No Post-Deploy Flow | console-product.review | ✅ "What's Next" 3-card panel (Chat, View, Monitor) |
| 4 | No Onboarding | console-product.review | ✅ OnboardingGuide — 4-step checklist on empty Overview |
| 5 | API endpoint naming (/api/generate/openclaw-config) | contradictions.review | Deferred |
| 6 | MCP packages not pre-installed in containers | plugin-system.review | Tracked — InitContainer support planned |
| 7 | Placeholder plugins (11 have no real capability) | plugin-system.review | ✅ Fixed — 8 removed, hume upgraded (MCP), postman-api fixed (CLI) |
| 8 | Plugin config no UI/CLI entry | plugin-system.review | ✅ SettingsPage Plugins tab — browse, toggle, configure secrets |
| 9 | shadowob plugin duplication | plugin-system.review | ✅ Migrated to createChannelPlugin factory |
| 10 | Plugin health checks not in Doctor | plugin-system.review | ✅ lifecycle.ts healthCheck integrated into /api/doctor |
| 11 | GitHub/Slack no lifecycle implementations | plugin-system.review | ✅ Added healthCheck (API validation) to both |
