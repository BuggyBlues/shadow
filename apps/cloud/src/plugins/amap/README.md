# AMap / Gaode Maps Plugin

AMap provides location workflows for geocoding, reverse geocoding, weather, POI search, route planning, local-life recommendations, travel planning, and store-location support.

## Configuration Keys

| Key | Required | Sensitive | Description |
| --- | --- | --- | --- |
| `AMAP_MAPS_API_KEY` | Yes | Yes | AMap Web Service API key. |

## Setup

1. Open the AMap Open Platform console.
2. Create an application and add a Web Service key.
3. Enable the APIs needed by the Buddy, such as geocoding, search, routing, and weather.
4. Paste the key into `AMAP_MAPS_API_KEY`.
5. Deploy the Buddy.
6. Verify with a small POI search or route-planning request.

## Runtime Assets

- Registers the official `@amap/amap-maps-mcp-server` MCP server through `npx`.
- Requires `AMAP_MAPS_API_KEY` for runtime MCP calls.

## References

- [AMap MCP server](https://lbs.amap.com/api/mcp-server/summary)
- [Create AMap project and key](https://lbs.amap.com/api/webservice/create-project-and-key)
