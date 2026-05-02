# WPS / Kingsoft Docs Plugin

WPS / Kingsoft Docs supports office workflows for cloud document search, meeting notes, task tracking, file organization, document generation, and collaborative editing.

## Configuration Keys

| Key | Required | Sensitive | Description |
| --- | --- | --- | --- |
| `WPS_ACCESS_TOKEN` | Yes | Yes | WPS Open Platform access token. |
| `WPS_APP_ID` | No | No | Optional WPS app ID. |
| `WPS_APP_SECRET` | No | Yes | Optional WPS app secret. |

## Setup

1. Open the WPS Open Platform.
2. Create or select the application used by the Buddy.
3. Obtain an access token for the account or app.
4. Paste it into `WPS_ACCESS_TOKEN`.
5. Add app ID and app secret only when your integration flow requires them.
6. Deploy the Buddy.
7. Verify with read-only file search or document lookup before editing or sharing.

## Runtime Assets

- Exposes connector metadata and prompt guidance for WPS MCP-style office workflows.
- Edits, moves, shares, and file deletion should require explicit confirmation.

## References

- [WPS MCP introduction](https://open.wps.cn/documents/app-integration-dev/mcp-server/introduction)
- [WPS Open Platform](https://open.wps.cn)
