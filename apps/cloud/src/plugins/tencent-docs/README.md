# Tencent Docs Plugin

Tencent Docs supports document and spreadsheet workflows for searching, reading, organizing, editing, reporting, and cross-document question answering.

## Configuration Keys

| Key | Required | Sensitive | Description |
| --- | --- | --- | --- |
| `TENCENT_DOCS_ACCESS_TOKEN` | Yes | Yes | Tencent Docs access token authorized through QQ or WeChat login. |
| `TENCENT_DOCS_CLIENT_ID` | No | No | Optional Tencent Docs application client ID. |
| `TENCENT_DOCS_CLIENT_SECRET` | No | Yes | Optional Tencent Docs application client secret. |

## Setup

1. Follow the Tencent Docs MCP authorization flow.
2. Obtain an access token for the account or application.
3. Paste it into `TENCENT_DOCS_ACCESS_TOKEN`.
4. Add client credentials only when your integration requires them.
5. Deploy the Buddy.
6. Verify with read-only document or spreadsheet lookup before enabling edits or sharing.

## Runtime Assets

- Exposes connector metadata and prompt guidance for Tencent Docs MCP workflows.
- Editing, moving, sharing, or deleting documents should require explicit confirmation.

## References

- [Tencent Docs MCP overview](https://docs.qq.com/open/document/mcp/)
- [Tencent Docs Open Platform](https://docs.qq.com/open)
