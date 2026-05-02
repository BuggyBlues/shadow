# Atlassian Plugin

Atlassian ProjectOps supports Jira, Confluence, sprint summaries, PRD-to-ticket workflows, engineering planning, and Rovo-assisted project work.

## Configuration Keys

| Key | Required | Sensitive | Description |
| --- | --- | --- | --- |
| `ATLASSIAN_API_TOKEN` | Yes | Yes | Atlassian API token for Jira and Confluence API access. |
| `ATLASSIAN_EMAIL` | Yes | No | Atlassian account email paired with the API token. |
| `ATLASSIAN_SITE_URL` | Yes | No | Atlassian site URL, for example `https://example.atlassian.net`. |

## Setup

1. Open Atlassian account security settings.
2. Create an API token.
3. Add the token as `ATLASSIAN_API_TOKEN`.
4. Add the matching Atlassian account email as `ATLASSIAN_EMAIL`.
5. Add the Jira or Confluence site URL as `ATLASSIAN_SITE_URL`.
6. Deploy the Buddy.
7. Start with read-only Jira and Confluence tasks before enabling write workflows.

## Runtime Assets

- Registers Atlassian hosted MCP metadata.
- Exposes a connector skill entry for Jira, Confluence, sprint, and PRD-to-ticket workflows.

## References

- [Rovo Dev CLI](https://support.atlassian.com/rovo/docs/use-rovo-dev-cli/)
- [Atlassian API tokens](https://id.atlassian.com/manage-profile/security/api-tokens)
- [Atlassian developer platform](https://developer.atlassian.com/cloud/)
