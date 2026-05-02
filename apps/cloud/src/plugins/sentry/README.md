# Sentry Plugin

Sentry DebugOps turns production issues into root-cause analysis, observability setup, SDK fixes, code-review checks, and patch plans.

## Configuration Keys

| Key | Required | Sensitive | Description |
| --- | --- | --- | --- |
| `SENTRY_AUTH_TOKEN` | Yes | Yes | Sentry auth token for issues, projects, traces, releases, and MCP workflows. |
| `SENTRY_ORG` | No | No | Optional default organization slug. |
| `SENTRY_PROJECT` | No | No | Optional default project slug. |

## Setup

1. Open Sentry account or organization settings.
2. Create an auth token with the scopes required for the Buddy, such as project read, issue read, release read, and write scopes only when needed.
3. Add the token as `SENTRY_AUTH_TOKEN`.
4. Add `SENTRY_ORG` and `SENTRY_PROJECT` if most workflows should target one project.
5. Deploy the Buddy.
6. Run the verification check to confirm `sentry-cli --version` works and Sentry skills are mounted.

## Runtime Assets

- Installs `@sentry/cli`.
- Registers `@sentry/mcp-server`.
- Mounts official Sentry agent skills from `getsentry/agent-skills`.

## References

- [Sentry Agent Skills](https://docs.sentry.io/ai/agent-skills/)
- [Sentry CLI](https://docs.sentry.io/ai/sentry-cli/)
- [Sentry MCP server](https://docs.sentry.io/ai/mcp/)
- [Sentry API auth](https://docs.sentry.io/api/auth/)
- [Sentry agent skills repository](https://github.com/getsentry/agent-skills)
