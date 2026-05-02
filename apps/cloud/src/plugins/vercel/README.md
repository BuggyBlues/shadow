# Vercel Plugin

Vercel LaunchOps supports preview deploys, deployment logs, domain configuration, project settings, environment variables, and Next.js production diagnostics.

## Configuration Keys

| Key | Required | Sensitive | Description |
| --- | --- | --- | --- |
| `VERCEL_TOKEN` | Yes | Yes | Vercel access token for project and deployment operations. |
| `VERCEL_TEAM_ID` | No | No | Optional default Vercel team ID. |
| `VERCEL_PROJECT_ID` | No | No | Optional default Vercel project ID. |

## Setup

1. Open Vercel account settings.
2. Create an access token.
3. Add the token as `VERCEL_TOKEN`.
4. Copy `VERCEL_TEAM_ID` from team settings if the Buddy should operate under a team.
5. Copy `VERCEL_PROJECT_ID` from project settings if the Buddy should default to one project.
6. Deploy the Buddy and verify `vercel --version`.

## Runtime Assets

- Installs the `vercel` CLI.
- Registers hosted Vercel MCP metadata.

## References

- [Vercel Agent Resources](https://vercel.com/docs/agent-resources)
- [Vercel MCP](https://vercel.com/docs/agent-resources/vercel-mcp)
- [Vercel CLI](https://vercel.com/docs/cli)
- [Creating a Vercel access token](https://vercel.com/docs/rest-api#creating-an-access-token)
