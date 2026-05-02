# Salesforce Plugin

Salesforce supports admin and DevOps workflows for metadata, Flow, Apex tests, LWC, CRM data hygiene, release diagnostics, and Salesforce org automation.

## Configuration Keys

| Key | Required | Sensitive | Description |
| --- | --- | --- | --- |
| `SALESFORCE_INSTANCE_URL` | Yes | No | Salesforce instance URL. |
| `SALESFORCE_ACCESS_TOKEN` | Yes | Yes | OAuth access token for Salesforce APIs. |
| `SALESFORCE_CLIENT_ID` | No | No | Connected app client ID for refresh-token flows. |
| `SALESFORCE_CLIENT_SECRET` | No | Yes | Connected app client secret for refresh-token flows. |
| `SALESFORCE_REFRESH_TOKEN` | No | Yes | Refresh token for long-running Salesforce access. |

## Setup

1. Create or select a Salesforce connected app.
2. Configure OAuth scopes for metadata, tooling, API, and CRM workflows the Buddy needs.
3. Copy the instance URL into `SALESFORCE_INSTANCE_URL`.
4. Add an access token to `SALESFORCE_ACCESS_TOKEN`.
5. Add client ID, client secret, and refresh token when using refresh-token access.
6. Deploy the Buddy.
7. Verify with `sf --version` and read-only org or metadata queries before deployment actions.

## Runtime Assets

- Installs `@salesforce/cli`.
- Registers `@salesforce/mcp` through `npx`.
- Adds a verification check for the Salesforce CLI.

## References

- [Salesforce DX MCP server](https://developer.salesforce.com/docs/atlas.en-us.sfdx_dev.meta/sfdx_dev/sfdx_dev_mcp.htm)
- [Salesforce CLI](https://developer.salesforce.com/tools/salesforcecli)
