# Notion Plugin

Notion KnowledgeOps connects a Buddy to pages, databases, workspace search, meeting notes, roadmap sync, and structured knowledge management.

## Configuration Keys

| Key | Required | Sensitive | Description |
| --- | --- | --- | --- |
| `NOTION_TOKEN` | Yes | Yes | Notion internal integration token. |

## Setup

1. Open Notion integrations.
2. Create an internal integration.
3. Copy the integration token into `NOTION_TOKEN`.
4. Share the target pages or databases with the integration.
5. Deploy the Buddy.
6. Run read-only page or database queries before enabling update workflows.

## Runtime Assets

- Exposes the bundled Notion skill.
- Registers `@notionhq/notion-mcp-server`.

## References

- [Notion API](https://developers.notion.com)
- [Notion MCP overview](https://developers.notion.com/guides/mcp/overview)
- [Notion integrations](https://www.notion.so/profile/integrations)
- [Notion MCP server package](https://www.npmjs.com/package/@notionhq/notion-mcp-server)
