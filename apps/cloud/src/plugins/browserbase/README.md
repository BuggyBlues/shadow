# Browserbase Plugin

Browserbase BrowserOps provides cloud browser sessions, Stagehand-style web automation, extraction flows, QA runs, and persistent browser debugging.

## Configuration Keys

| Key | Required | Sensitive | Description |
| --- | --- | --- | --- |
| `BROWSERBASE_API_KEY` | Yes | Yes | Browserbase API key for cloud browser sessions and MCP automation. |
| `BROWSERBASE_PROJECT_ID` | Yes | No | Browserbase project ID that owns the browser sessions. |

## Setup

1. Sign in to Browserbase.
2. Open account settings and copy an API key.
3. Open the target project and copy its project ID.
4. Add `BROWSERBASE_API_KEY` and `BROWSERBASE_PROJECT_ID`.
5. Deploy the Buddy.
6. Run the verification check to confirm the Browserbase MCP server package is installed.

## Runtime Assets

- Installs `@browserbasehq/mcp-server-browserbase`.
- Registers Browserbase MCP metadata.

## References

- [Browserbase MCP docs](https://docs.browserbase.com/integrations/mcp/introduction)
- [Browserbase API keys](https://www.browserbase.com/settings/api)
- [Browserbase docs](https://docs.browserbase.com)
