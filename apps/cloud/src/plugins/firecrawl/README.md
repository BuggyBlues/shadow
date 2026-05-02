# Firecrawl Plugin

Firecrawl BrowserOps supports crawling, search, structured extraction, markdown conversion, competitive monitoring, and web-data pipelines.

## Configuration Keys

| Key | Required | Sensitive | Description |
| --- | --- | --- | --- |
| `FIRECRAWL_API_KEY` | Yes | Yes | Firecrawl API key for scrape, crawl, search, and extraction workflows. |

## Setup

1. Sign in to Firecrawl.
2. Open API key settings and create or copy an API key.
3. Add the key as `FIRECRAWL_API_KEY`.
4. Deploy the Buddy.
5. Run the verification check to confirm the `firecrawl` CLI is installed.
6. Start with small crawl limits before enabling broad monitoring jobs.

## Runtime Assets

- Installs `firecrawl-cli`.
- Installs `firecrawl-mcp`.
- Registers Firecrawl MCP metadata.

## References

- [Firecrawl docs](https://docs.firecrawl.dev/introduction)
- [Firecrawl CLI](https://docs.firecrawl.dev/sdks/cli)
- [Firecrawl MCP server](https://docs.firecrawl.dev/mcp-server)
- [Firecrawl authentication](https://docs.firecrawl.dev/api-reference/authentication)
