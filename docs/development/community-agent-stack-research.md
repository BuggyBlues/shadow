# Community Agent Stack Research

> Goal: turn high-signal community agent and skill repositories into Shadow Cloud templates without hardcoding repo-specific behavior inside the runtime.

## Findings

| Stack | Primary shape | Agent-pack support | Template |
| --- | --- | --- | --- |
| `obra/superpowers` | Agent Skills, Claude plugin, Codex plugin, root `commands/`, root `agents/` | Native through `standard` + `claude` + `codex` profiles after root Claude plugin agent support | `superpowers-buddy` |
| `affaan-m/everything-claude-code` | Claude plugin, Codex plugin, many shared skills, hooks, scripts, rules | Native profiles plus explicit docs/rules mounts; scripts opt-in | `everything-claude-code-buddy` |
| `garrytan/gstack` | Root skills, OpenClaw skills, scripts, setup, README methodology | Native profiles plus explicit OpenClaw/script mounts | `gstack-buddy` |
| `gsd-build/get-shit-done` | Root `commands/`, root `agents/`, hooks, bin/scripts, docs | Native Claude plugin-style root commands/agents plus explicit docs/files | `gsd-buddy` |
| `bmad-code-org/BMAD-METHOD` | Skills under `src/bmm-skills` and `src/core-skills`, docs | Explicit skill mounts; no new plugin required | `bmad-method-buddy` |
| `wshobson/agents` | Nested Claude plugin marketplace under `plugins/*` | Explicit nested `plugins` mounts for skills/commands/agents/docs | `agent-marketplace-buddy` |
| `coreyhaines31/marketingskills` | Standard `skills/` plus Claude plugin manifest | Native `standard` profile | `marketingskills-buddy` |
| `SuperClaude-Org/SuperClaude_Framework` | Packaged plugin under `plugins/superclaude`, root docs/scripts | Explicit packaged plugin mounts | `superclaude-buddy` |
| `K-Dense-AI/scientific-agent-skills` | Large `scientific-skills/**/SKILL.md` collection | Explicit skill mount; full Python package provisioning is a runtime-asset follow-up | `scientific-skills-buddy` |
| `TheCraigHewitt/seomachine` | `.claude/commands`, `.claude/agents`, `.claude/skills`, context docs | Native Claude profile plus explicit context docs | `seomachine-buddy` |
| `AgriciDaniel/claude-seo` | Claude plugin manifest, root `skills/`, root `agents/`, scripts, docs | Native profiles plus explicit docs/extensions | `claude-seo-buddy` |
| `AgriciDaniel/claude-ads` | Claude plugin manifest, root `skills/`, `ads/SKILL.md`, root `agents/`, scripts, references | Native profiles plus explicit ad reference docs | `claude-ads-buddy` |
| `googleworkspace/cli` | `gws` CLI, Workspace API command surface, `skills/gws-*`, OAuth/exported credentials | Dedicated `google-workspace` connector installs CLI, mounts skills, materializes credentials, and declares smoke checks. Current upstream no longer exposes `gws mcp`, so MCP is not enabled for this template. | `google-workspace-buddy` |

## Agent-Pack Changes

- `claude` auto-import now treats root `agents/` and root `hooks/` as Claude plugin-compatible assets, matching marketplace-style plugin packages.
- Existing explicit `mounts` remain the escape hatch for unusual layouts such as BMAD's `src/bmm-skills`, K-Dense's `scientific-skills`, and wshobson's nested `plugins/*` marketplace.
- Script import remains explicit through the `scripts` profile or per-template mounts, so arbitrary repositories do not expose helper scripts unless a template opts in.

## Plugin API Follow-Up

The reviewed stacks are usable as templates today. The Runtime Asset Plugin direction from `Shadow_Cloud_Plugin_API_与批量验收方案.md` is now the connector baseline:

- Google Workspace uses `runtimeDependencies`, `skillSources`, `credentialFiles`, and `verificationChecks` so the plugin can describe CLI install, skill mount, auth files, and smoke checks without runner-specific code.
- CLI/install ecosystems: SuperClaude, GSD, BMAD, and ECC include install or helper scripts that are useful as commands. Repeated install patterns should move into connector runtime assets instead of ad-hoc K8s shell.
- Scientific/runtime-heavy skills: `scientific-agent-skills` exposes high-quality skill docs, but many skills imply Python/R/database/package dependencies. Future scientific templates should declare those packages as runtime dependencies and add safe read-only verification checks.
- MCP and subagents are first-class connector concepts, but they must reflect real upstream support. For example, current `@googleworkspace/cli@0.22.5` has no `gws mcp` command, while agent-pack repositories that contain `.mcp.json` or `agents/` can still expose those assets through agent-pack mounts.

See [cloud-connector-runtime-assets.md](cloud-connector-runtime-assets.md) for the current API shape and Google Workspace cross-check evidence.

## Acceptance Strategy

1. Static: every template parses, has i18n metadata, and resolves agent-pack mounts.
2. Mount: unit tests assert the important mount paths per stack.
3. Runtime shape: agent-pack tests cover root Claude plugin agents/hooks, Codex TOML agents, scripts, nested skills, and slash command generation.
4. Container: docker-compose targeted tests run `agent-pack`, indexer, and template suites.
5. Future certification: add runtime asset checks for install scripts, credentials, safe read-only smoke tests, and optional write-risk smoke tests.
