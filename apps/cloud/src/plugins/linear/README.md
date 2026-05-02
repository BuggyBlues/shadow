# Linear Plugin

Linear ProjectOps helps a Buddy create and triage issues, summarize cycles, connect PRs to work, and keep engineering roadmaps moving.

## Configuration Keys

| Key | Required | Sensitive | Description |
| --- | --- | --- | --- |
| `LINEAR_API_KEY` | Yes | Yes | Linear API key for issue and workspace operations. |
| `LINEAR_WORKSPACE_ID` | No | No | Optional default workspace ID. |
| `LINEAR_TEAM_ID` | No | No | Optional default team ID. |

## Setup

1. Open Linear API settings.
2. Create or copy a personal API key.
3. Add the key as `LINEAR_API_KEY`.
4. Copy the workspace ID and team ID if the Buddy should default to a specific workspace or team.
5. Deploy the Buddy.
6. Use read-only prompts first to confirm the Buddy can see the expected teams, projects, cycles, and issues.

## Runtime Assets

- Registers Linear hosted MCP metadata.
- Exposes a connector skill entry for issue, project, cycle, and roadmap workflows.

## References

- [Linear MCP server](https://linear.app/docs/mcp)
- [Agents in Linear](https://linear.app/docs/agents-in-linear)
- [Linear API and webhooks](https://linear.app/docs/api-and-webhooks)
