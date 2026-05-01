# Cloud Connector Runtime Assets

> Goal: let Cloud plugins describe connector capabilities once, then reuse the same model for Skills, CLI binaries, MCP servers, subagents, credentials, and verification.

## Connector Shape

A connector plugin can now emit these runtime asset groups through the plugin API:

| Asset | API | Runtime metadata field | Use case |
|---|---|---|---|
| CLI / binary / package dependency | `api.addRuntimeDependencies()` | `runtimeDependencies` | install `gws`, `gh`, domain CLIs, Python/R tooling, or helper binaries |
| Agent skills | `api.addSkillSources()` | `skillSources` | mount `SKILL.md` bundles from Git repos or future archives |
| Subagents | `api.addSubagentSources()` | `subagentSources` | mount Claude/Codex/OpenClaw subagent definitions without treating them as ad-hoc docs |
| MCP server | `api.addMCP()` | plugin static `mcp` declaration | declare a real stdio/SSE MCP server when the upstream package actually exposes one |
| Runtime artifact | `api.addRuntimeArtifacts()` | `artifacts` | expose generated indexes such as Shadow slash commands |
| Credential file | `api.addCredentialFiles()` | `credentialFiles` | materialize secret env values as files before the agent starts |
| Verification check | `api.addVerificationChecks()` | `verificationChecks` | certify install/auth/read/write smoke checks with risk labels |

`runtime-extensions.json` is intentionally outside `openclaw.json`. The runner consumes only generic metadata such as credential files and artifacts; plugin-specific install logic stays in plugin-owned K8s providers or shared runtime-asset helpers.

Templates should stay thin. A connector template normally needs only `{ "plugin": "<id>" }`; the plugin owns credential discovery, default service selection, installation, and verification metadata.

## Google Workspace Cross-Check

The `google-workspace` plugin is the first connector using the full shape:

- CLI dependency: `@googleworkspace/cli` installs a `gws` binary.
- Skills source: `https://github.com/googleworkspace/cli.git`, `skills/gws-*`.
- Credentials: `GOOGLE_WORKSPACE_CREDENTIALS_JSON`, `GOOGLE_WORKSPACE_ADC_JSON`, or `GOOGLE_WORKSPACE_ACCESS_TOKEN`. The plugin maps those friendly keys to the `gws` runtime env/file layout.
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
