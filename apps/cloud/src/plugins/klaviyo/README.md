# Klaviyo Plugin

Klaviyo supports email and SMS marketing operations for flows, segments, abandoned cart recovery, campaign review, retention diagnostics, and reporting.

## Configuration Keys

| Key | Required | Sensitive | Description |
| --- | --- | --- | --- |
| `KLAVIYO_API_KEY` | Yes | Yes | Private API key with the scopes needed for flows, profiles, metrics, and campaigns. |

## Setup

1. Open Klaviyo API key settings.
2. Create a private API key with the minimum scopes needed by the Buddy.
3. Paste the key into `KLAVIYO_API_KEY`.
4. Deploy the Buddy.
5. Verify with read-only profile, flow, campaign, or metric lookup.
6. Require confirmation before launching, pausing, or editing flows and campaigns.

## Runtime Assets

- Registers the hosted Klaviyo MCP endpoint.
- Uses bearer-token authentication from `KLAVIYO_API_KEY`.

## References

- [Klaviyo MCP server](https://developers.klaviyo.com/en/docs/klaviyo_mcp_server)
- [Retrieve Klaviyo API credentials](https://developers.klaviyo.com/en/docs/retrieve_api_credentials)
