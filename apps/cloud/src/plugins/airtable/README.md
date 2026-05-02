# Airtable Plugin

Airtable DataOps helps a Buddy inspect base schemas, query records and views, prepare bulk updates, debug webhooks, and keep creative or operations data clean.

## Configuration Keys

| Key | Required | Sensitive | Description |
| --- | --- | --- | --- |
| `AIRTABLE_API_KEY` | Yes | Yes | Airtable personal access token or service token. |
| `AIRTABLE_BASE_ID` | No | No | Optional default base ID. |

## Setup

1. Open Airtable developer settings.
2. Create a personal access token with the scopes needed by the Buddy, such as schema read, data read, data write, or webhook access.
3. Grant the token access to the target workspace or base.
4. Copy the token into `AIRTABLE_API_KEY`.
5. Copy a base ID from Airtable API docs or the base URL and set `AIRTABLE_BASE_ID` if a default base is useful.
6. Deploy the Buddy and verify that the Airtable skills are mounted.

## Runtime Assets

- Registers Airtable hosted MCP metadata.
- Mounts official Airtable skills from `Airtable/skills`.

## References

- [Airtable MCP server](https://support.airtable.com/docs/using-the-airtable-mcp-server)
- [Airtable personal access tokens](https://airtable.com/developers/web/guides/personal-access-tokens)
- [Airtable Web API](https://airtable.com/developers/web/api/introduction)
- [Airtable Webhooks API](https://www.airtable.com/developers/web/guides/webhooks-api)
- [Airtable skills repository](https://github.com/Airtable/skills)
