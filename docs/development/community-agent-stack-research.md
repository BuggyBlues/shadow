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
| `googleworkspace/cli` | `gws` CLI, Workspace API command surface, `skills/gws-*`, OAuth/exported credentials | Dedicated `google-workspace` plugin installs CLI, mounts skills, materializes credentials, and declares smoke checks | `google-workspace-buddy` |

## Agent-Pack Changes

- `claude` auto-import now treats root `agents/` and root `hooks/` as Claude plugin-compatible assets, matching marketplace-style plugin packages.
- Existing explicit `mounts` remain the escape hatch for unusual layouts such as BMAD's `src/bmm-skills`, K-Dense's `scientific-skills`, and wshobson's nested `plugins/*` marketplace.
- Script import remains explicit through the `scripts` profile or per-template mounts, so arbitrary repositories do not expose helper scripts unless a template opts in.

## Plugin API Follow-Up

The reviewed stacks are usable as templates today, but two categories still need the Runtime Asset Plugin direction from `Shadow_Cloud_Plugin_API_与批量验收方案.md`:

- Google Workspace now has the first concrete runtime-asset slice: `credentialFiles` and `verificationChecks` can be emitted through `onBuildRuntime`, and the OpenClaw runner materializes credential files before startup. The plugin still uses a custom K8s provider for CLI install and skill mounting; the next step is promoting that pattern into declarative `runtimeDeps` and `skillSources`.
- CLI/install ecosystems: SuperClaude, GSD, BMAD, and ECC include install or helper scripts that are useful as commands, but Cloud cannot yet declaratively install npm/python binaries or verify CLI readiness.
- Scientific/runtime-heavy skills: `scientific-agent-skills` exposes high-quality skill docs, but many skills imply Python/R/database/package dependencies. A future runtime asset layer should declare `runtimeDeps`, `skillSources`, `credentialFiles`, and `verificationChecks` so templates can be certified beyond static mount validation.

## Acceptance Strategy

1. Static: every template parses, has i18n metadata, and resolves agent-pack mounts.
2. Mount: unit tests assert the important mount paths per stack.
3. Runtime shape: agent-pack tests cover root Claude plugin agents/hooks, Codex TOML agents, scripts, nested skills, and slash command generation.
4. Container: docker-compose targeted tests run `agent-pack`, indexer, and template suites.
5. Future certification: add runtime asset checks for install scripts, credentials, safe read-only smoke tests, and optional write-risk smoke tests.
