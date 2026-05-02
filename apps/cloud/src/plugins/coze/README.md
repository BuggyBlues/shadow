# Coze Plugin

Coze supports agent-platform workflows for publishing business agents as MCP tools, managing spaces, connecting MCP services, bot workflows, and distributing agent capabilities.

## Configuration Keys

| Key | Required | Sensitive | Description |
| --- | --- | --- | --- |
| `COZE_API_TOKEN` | Yes | Yes | Coze Open API token. |
| `COZE_SPACE_ID` | No | No | Default Coze space ID. |
| `COZE_BOT_ID` | No | No | Default bot ID for bot-specific workflows. |

## Setup

1. Open the Coze developer console.
2. Create or copy an Open API token.
3. Paste the token into `COZE_API_TOKEN`.
4. Add `COZE_SPACE_ID` and `COZE_BOT_ID` when the Buddy should target one workspace or bot by default.
5. Deploy the Buddy.
6. Verify with a read-only space or bot lookup before publishing MCP tools or changing bot configuration.

## Runtime Assets

- Exposes connector metadata and prompt guidance for Coze agent distribution and MCP publishing workflows.
- Publishing and configuration changes should require explicit confirmation.

## References

- [Publish as MCP tool](https://www.coze.cn/open/docs/guides/publish_to_space)
- [Coze API overview](https://www.coze.cn/open/docs/developer_guides/coze_api_overview)
