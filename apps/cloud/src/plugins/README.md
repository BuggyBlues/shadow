# Cloud Plugin Directory

This directory contains built-in Shadow Cloud plugins. Each plugin is a small, independently enabled connector that can contribute credentials, skills, CLI tools, MCP metadata, runtime assets, verification checks, and deployment configuration.

## How To Read A Plugin

Every plugin should keep the operational contract close to the implementation:

- `index.ts` registers the plugin manifest, runtime assets, skills, MCP servers, CLI tools, and verification checks.
- `manifest.json` is used by legacy skill plugins that still load their manifest from JSON.
- `README.md` explains user-facing keys, setup steps, runtime assets, and upstream references.

When adding or changing a plugin, keep the README in sync with the keys declared in `index.ts` or `manifest.json`.

## Connector README Coverage

| Plugin | Main keys | Primary setup docs |
| --- | --- | --- |
| [Agent Browser](./agent-browser/README.md) | `AGENT_BROWSER_PROVIDER`, provider API keys | Agent Browser, Browserbase, Browserless, Browser Use, Kernel |
| [Skill Discovery](./skill-discovery/README.md) | None | skills.sh and `skills` CLI |
| [inference.sh](./inference-sh/README.md) | `INFSH_API_KEY` | inference.sh CLI and auth docs |
| [AI Image Generation](./inference-ai-image-generation/README.md) | `INFSH_API_KEY` | inference.sh image skills |
| [Wonda](./wonda/README.md) | `WONDA_API_KEY` | Wonda CLI skill |
| [Figma](./figma/README.md) | `FIGMA_ACCESS_TOKEN`, `FIGMA_TEAM_ID` | Figma MCP, Figma REST API, Code Connect |
| [Canva](./canva/README.md) | `CANVA_ACCESS_TOKEN`, `CANVA_BRAND_TEMPLATE_ID` | Canva CLI and Connect API |
| [Airtable](./airtable/README.md) | `AIRTABLE_API_KEY`, `AIRTABLE_BASE_ID` | Airtable MCP, PATs, Web API |
| [Hugging Face](./huggingface/README.md) | `HF_TOKEN`, `HF_ORG` | Hugging Face agent skills, CLI, MCP |
| [GitHub](./github/README.md) | `GITHUB_PERSONAL_ACCESS_TOKEN` | GitHub CLI, MCP, PATs |
| [Vercel](./vercel/README.md) | `VERCEL_TOKEN`, `VERCEL_TEAM_ID`, `VERCEL_PROJECT_ID` | Vercel MCP and CLI |
| [Supabase](./supabase/README.md) | `SUPABASE_ACCESS_TOKEN`, `SUPABASE_PROJECT_REF`, `SUPABASE_DB_PASSWORD` | Supabase MCP, skills, CLI |
| [Stripe](./stripe/README.md) | `STRIPE_SECRET_KEY` | Stripe CLI, MCP, Agent Toolkit |
| [Shopify](./shopify/README.md) | `SHOPIFY_STORE_DOMAIN`, `SHOPIFY_ADMIN_ACCESS_TOKEN` | Shopify AI Toolkit and Admin API |
| [Notion](./notion/README.md) | `NOTION_TOKEN` | Notion MCP and integrations |
| [Linear](./linear/README.md) | `LINEAR_API_KEY`, `LINEAR_WORKSPACE_ID`, `LINEAR_TEAM_ID` | Linear MCP and API |
| [Atlassian](./atlassian/README.md) | `ATLASSIAN_API_TOKEN`, `ATLASSIAN_EMAIL`, `ATLASSIAN_SITE_URL` | Rovo Dev, Jira, Confluence |
| [Sentry](./sentry/README.md) | `SENTRY_AUTH_TOKEN`, `SENTRY_ORG`, `SENTRY_PROJECT` | Sentry skills, CLI, MCP |
| [PostHog](./posthog/README.md) | `POSTHOG_API_KEY`, `POSTHOG_PROJECT_ID`, `POSTHOG_HOST` | PostHog MCP and CLI |
| [Cloudflare](./cloudflare/README.md) | `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`, `CLOUDFLARE_ZONE_ID` | Cloudflare MCP, Wrangler, skills |
| [Firebase](./firebase/README.md) | `FIREBASE_TOKEN`, `FIREBASE_PROJECT_ID` | Firebase skills, CLI, MCP |
| [Firecrawl](./firecrawl/README.md) | `FIRECRAWL_API_KEY` | Firecrawl CLI and MCP |
| [Playwright](./playwright/README.md) | None | Playwright CLI and MCP |
| [Browserbase](./browserbase/README.md) | `BROWSERBASE_API_KEY`, `BROWSERBASE_PROJECT_ID` | Browserbase MCP |
| [Google Workspace](./google-workspace/README.md) | `GOOGLE_WORKSPACE_CLI_CREDENTIALS_JSON`, `GOOGLE_APPLICATION_CREDENTIALS_JSON` | Google Workspace CLI auth |
| [PayPal](./paypal/README.md) | `PAYPAL_CLIENT_ID`, `PAYPAL_CLIENT_SECRET`, `PAYPAL_ENVIRONMENT` | PayPal MCP and REST apps |

## Development Checklist

1. Add one plugin per platform or service. Do not combine unrelated services into a single plugin.
2. Prefer official Skills plus official CLI when both exist.
3. Register MCP metadata when the upstream service documents a stable MCP endpoint or package.
4. Add `PluginAuthField` entries with clear `label`, `description`, `required`, `sensitive`, `placeholder`, and `helpUrl` values.
5. Add verification checks for installed CLI tools and mounted skill files.
6. Document every key and setup path in the plugin README.
7. Update `loader.ts`, plugin tests, and this directory index when a new built-in plugin is added.

## Verification

For connector changes, run:

```bash
pnpm --filter @shadowob/cloud typecheck
pnpm --filter @shadowob/cloud exec vitest run __tests__/plugins/plugins.test.ts __tests__/infra/runtime-package.test.ts scripts/generate-schema.test.ts
pnpm lint
```
