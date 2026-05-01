# Cloud Connector Runtime Assets

> Goal: let Cloud plugins describe connector capabilities once, then reuse the same model for Skills, CLI binaries, MCP servers, subagents, credentials, and verification.

## Connector Shape

A connector plugin can now emit these runtime asset groups through the plugin API:

| Asset | API | Runtime metadata field | Use case |
|---|---|---|---|
| CLI / binary / package dependency | `api.addRuntimeDependencies()` | `runtimeDependencies` | install `gws`, `gh`, domain CLIs, Python/R tooling, or helper binaries |
| Agent skills | `api.addSkillSources()` | `skillSources` | mount `SKILL.md` bundles from Git repos or future archives |
| Subagents | `api.addSubagentSources()` | `subagentSources` | mount Claude/Codex/OpenClaw subagent definitions without treating them as ad-hoc docs |
| MCP server | `api.addMCP()` | plugin static `mcp` declaration | declare a real stdio/SSE/HTTP/streamable HTTP MCP server when the upstream package actually exposes one |
| Runtime artifact | `api.addRuntimeArtifacts()` | `artifacts` | expose generated indexes such as Shadow slash commands |
| Credential file | `api.addCredentialFiles()` | `credentialFiles` | materialize secret env values as files before the agent starts |
| Verification check | `api.addVerificationChecks()` | `verificationChecks` | certify install/auth/read/write smoke checks with risk labels |

`runtime-extensions.json` is intentionally outside `openclaw.json`. The runner consumes only generic metadata such as credential files and artifacts; plugin-specific install logic stays in plugin-owned K8s providers or shared runtime-asset helpers.

Templates should stay thin. A connector template normally needs only `{ "plugin": "<id>" }`; the plugin owns credential discovery, default service selection, installation, and verification metadata.

`defineConnectorPlugin()` is the standard factory for business connectors. It registers a default same-id skill entry, exposes declared auth fields to the deploy form, emits CLI/MCP/runtime metadata, and keeps OpenClaw config fragments schema-safe.

## Google Workspace Cross-Check

The `google-workspace` plugin is the first connector using the full shape:

- CLI dependency: `@googleworkspace/cli` installs a `gws` binary.
- Skills source: `https://github.com/googleworkspace/cli.git`, `skills/gws-*`.
- Credentials: `GOOGLE_WORKSPACE_CLI_CREDENTIALS_JSON` materializes to the `gws` runtime credentials file. Legacy ADC-style values are still tolerated by the runtime mapper, but the deploy form presents the long-running `gws auth export --unmasked` / service-account JSON path as the supported path.
- Verification: `gws --version`, `gws auth status`, `gws drive files list --params '{"pageSize": 1}'`, and `gws calendar +agenda`.

Cross-check result on 2026-05-01:

- `npm view @googleworkspace/cli` reported latest `0.22.5`, with `bin.gws = run.js`.
- `npx -y @googleworkspace/cli --version` returned `gws 0.22.5`.
- `npx -y @googleworkspace/cli --help` listed Drive, Sheets, Gmail, Calendar, Docs, Slides, Chat, Admin Reports, and other services.
- The cloned repository contained 95 `SKILL.md` files under `skills/gws-*`.
- Current `gws` no longer exposes an MCP subcommand. The changelog added `gws mcp` in `0.3.0` but removed it in `0.8.0`, so the Shadow plugin must not declare `gws mcp`.

## Extension Rules

1. Declare only real upstream capabilities. If a package does not expose MCP, do not add a fake MCP server for UI symmetry.
2. Keep installer details in `runtimeDependencies` / `skillSources`; keep auth proof in `credentialFiles` / `verificationChecks`.
3. Use `requiredEnv` when all env vars are needed, and `requiredEnvAny` when any one credential path is enough.
4. Mark verification risk as `safe`, `read`, or `write`; write checks should remain optional and approval-gated.
5. Prefer shared runtime-asset helpers for common Git skill source + CLI install cases, then graduate new repeated patterns into the helper instead of embedding one-off shell in each plugin.

## Business Connectors

The business connector set is intentionally plugin-first, not template-first. Each platform lives in its own `apps/cloud/src/plugins/<id>/index.ts` file and can be enabled independently from any template or deployment config.

Current connector coverage:

- Commerce and payments: `shopify`, `stripe`, `paypal`.
- Ads and analytics: `google-ads`, `meta-ads`, `google-analytics`.
- SEO and content systems: `seo-suite`, `wordpress-woocommerce`, `webflow`.
- Cloud and backend operations: `cloudflare`, `supabase`, `vercel`.
- CRM and lifecycle operations: `hubspot`, `klaviyo`, `salesforce`.

Capability policy:

- Prefer official CLI plus official skills when available. Shopify mounts Shopify AI Toolkit skills and installs `@shopify/cli`; Webflow mounts Webflow skills and installs `@webflow/webflow-cli`.
- Use remote MCP metadata for providers whose official integration is hosted, such as PayPal, Cloudflare, HubSpot, Klaviyo, Webflow, and Vercel.
- Keep connectors without confirmed official skills as credential/MCP/CLI declarations until the upstream source is verified.
