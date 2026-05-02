# HubSpot Plugin

HubSpot supports CRM and Marketing Ops workflows for lead routing, deal hygiene, automation diagnostics, workflow review, sales operations, and lifecycle reporting.

## Configuration Keys

| Key | Required | Sensitive | Description |
| --- | --- | --- | --- |
| `HUBSPOT_ACCESS_TOKEN` | Yes | Yes | Private app access token with the needed CRM and automation scopes. |

## Setup

1. Open HubSpot private app settings.
2. Create a private app or use an existing one.
3. Grant the CRM, workflow, marketing, or sales scopes your Buddy needs.
4. Copy the private app token into `HUBSPOT_ACCESS_TOKEN`.
5. Deploy the Buddy.
6. Verify with read-only contact, company, deal, or workflow lookup before enabling updates.

## Runtime Assets

- Registers the hosted HubSpot MCP endpoint.
- Uses `HUBSPOT_ACCESS_TOKEN` for authenticated CRM and automation workflows.

## References

- [HubSpot MCP server](https://developers.hubspot.com/mcp)
- [HubSpot private apps](https://developers.hubspot.com/docs/apps/private-apps)
