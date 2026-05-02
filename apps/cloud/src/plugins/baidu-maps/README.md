# Baidu Maps Plugin

Baidu Maps provides geocoding, reverse geocoding, POI search, place details, distance matrices, route planning, weather, traffic checks, and local service lookup.

## Configuration Keys

| Key | Required | Sensitive | Description |
| --- | --- | --- | --- |
| `BAIDU_MAP_API_KEY` | Yes | Yes | Baidu Maps Web Service API key. |

## Setup

1. Open the Baidu Maps Open Platform console.
2. Create an application and obtain a server-side API key.
3. Enable the map services your Buddy will use.
4. Paste the key into `BAIDU_MAP_API_KEY`.
5. Deploy the Buddy.
6. Verify with a small geocoding, POI, or route request.

## Runtime Assets

- Registers the official `@baidumap/mcp-server-baidu-map` MCP server through `npx`.
- Requires `BAIDU_MAP_API_KEY` for runtime calls.

## References

- [Baidu Maps MCP quickstart](https://lbsyun.baidu.com/faq/api?title=mcpserver/quickstart)
- [Baidu Maps key help](https://lbsyun.baidu.com/faq/search?id=299&title=677)
