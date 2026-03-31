# Shadow Cloud Plugin System — Task Index

> Master task list for the plugin system implementation.  
> Each task is a self-contained document that can be assigned to an agent for parallel execution.  
> All tasks share the same architecture defined in `plugin-system-architecture.md` and the same plugin API defined in `plugin-development-guide.md`.

## Prerequisites (Read First)

Every agent MUST read these before starting:
- `spec/plugin-system-architecture.md` — Core interfaces, config schema, build pipeline
- `spec/plugin-development-guide.md` — Plugin structure, hooks, manifest reference

## Task Dependency Graph

```
[Task 01: Core Plugin Framework] ──┬──► [Task 03: Shadowob Migration]
                                   ├──► [Task 04: Communication Plugins]
                                   ├──► [Task 05: AI Provider Plugins]
                                   ├──► [Task 06: DevOps Plugins]
                                   ├──► [Task 07: Productivity Plugins]
                                   ├──► [Task 08: Finance/CRM Plugins]
                                   ├──► [Task 09: Automation Plugins]
                                   ├──► [Task 10: Media/Analytics Plugins]
                                   └──► [Task 11: Long Tail Plugins]
                                   
[Task 02: Config Schema + Builder] ──► [Task 03] (schema must exist for shadowob migration)

[Task 12: Secret Management API] ──┐
[Task 13: Console Plugin Pages]  ──┤
[Task 14: Console Enhancements]  ──┘──► Independent of each other

[Task 15: Template Migration] ──► Depends on Task 03 + Task 04-11 (plugin implementations)
[Task 16: E2E Tests]          ──► Depends on all above
```

## Tasks

### Foundation (sequential — must complete first)

| # | Task | Est. Lines | Depends On | File |
|---|------|-----------|------------|------|
| 01 | Core Plugin Framework — types, registry, loader | ~400 | None | `task-01-plugin-framework.md` |
| 02 | Config Schema + OpenClaw Builder Integration | ~300 | None | `task-02-config-schema-builder.md` |

### Plugin Implementation (fully parallel after Task 01)

| # | Task | Plugins | Est. Lines | File |
|---|------|---------|-----------|------|
| 03 | Shadowob Plugin Migration | shadowob | ~500 | `task-03-shadowob-migration.md` |
| 04 | Communication Plugins | slack, discord, telegram, line, gmail, outlook-mail, google-chat | ~1200 | `task-04-communication-plugins.md` |
| 05 | AI Provider Plugins | openai, anthropic, google-gemini, cohere, perplexity, grok, openrouter, hugging-face | ~800 | `task-05-ai-provider-plugins.md` |
| 06 | DevOps & Code Plugins | github, vercel, cloudflare, sentry, posthog, playwright, neon, supabase, prisma-postgres | ~900 | `task-06-devops-plugins.md` |
| 07 | Productivity Plugins | notion, google-drive, google-calendar, outlook-calendar, dropbox, airtable, todoist, canva, webflow, wix | ~800 | `task-07-productivity-plugins.md` |
| 08 | Finance & CRM Plugins | stripe, paypal, xero, revenucat, hubspot, intercom, close, apollo, mailchimp | ~700 | `task-08-finance-crm-plugins.md` |
| 09 | Automation & PM Plugins | zapier, make, n8n, dify, asana, linear, clickup, monday, atlassian, jotform | ~800 | `task-09-automation-plugins.md` |
| 10 | Media, Analytics & Search Plugins | elevenlabs, heygen, flux, kling, tripo-ai, metabase, ahrefs, similarweb, polygon-io, zoominfo, firecrawl, explorium, granola, fireflies, tldv, jam | ~1000 | `task-10-media-analytics-plugins.md` |
| 11 | Internal/Meta Plugins | hume, jsonbin-io, serena, postman-api, my-browser + remaining from user list | ~400 | `task-11-internal-plugins.md` |

### Console & API (parallel with plugin tasks)

| # | Task | Est. Lines | Depends On | File |
|---|------|-----------|------------|------|
| 12 | Secret Management API + Storage | ~500 | Task 01 | `task-12-secret-management.md` |
| 13 | Console Plugin Pages (Store, Detail, Setup) | ~800 | Task 01, 12 | `task-13-console-plugin-pages.md` |
| 14 | Console Enhancements (Team Viz, Kanban, Config Export) | ~600 | None | `task-14-console-enhancements.md` |

### Integration (after plugins)

| # | Task | Est. Lines | Depends On | File |
|---|------|-----------|------------|------|
| 15 | Template Migration to Plugin Config | ~300 | Task 03, 04-11 | `task-15-template-migration.md` |
| 16 | E2E Tests for Plugin System | ~500 | All above | `task-16-e2e-tests.md` |

## Total Estimate

- **~9,300 lines** of new plugin system code
- **~100 plugin manifests** (JSON files, ~50 lines each = ~5,000 lines)
- **Grand total**: ~14,300 lines of new code

## Parallelization Strategy

**Wave 1** (2 agents, sequential):
- Agent A: Task 01 (framework) → Task 02 (schema)
- Agent B: Task 14 (console enhancements, no plugin dependency)

**Wave 2** (9 agents, fully parallel):
- Tasks 03–11 (all plugin groups)
- Task 12 (secret management)
- Task 13 (console plugin pages)

**Wave 3** (2 agents):
- Task 15 (template migration)
- Task 16 (E2E tests)
