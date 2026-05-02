# Tencent Maps Plugin

Tencent Maps supports Web maps, Mini Program maps, store location, geocoding, route planning, POI search, overlays, layers, and map UI guidance.

## Configuration Keys

| Key | Required | Sensitive | Description |
| --- | --- | --- | --- |
| `TENCENT_MAPS_KEY` | Yes | Yes | Tencent Location Service API key. |

## Setup

1. Open Tencent Location Service.
2. Create an application and API key.
3. Enable the services required by the Buddy, such as geocoding, search, routing, and map rendering.
4. Paste the key into `TENCENT_MAPS_KEY`.
5. Deploy the Buddy.
6. Verify with a small POI, geocoding, or route request.

## Runtime Assets

- Exposes connector metadata and prompt guidance for Tencent Location Service MCP and map-development workflows.

## References

- [Tencent Location Service MCP](https://lbs.qq.com/service/MCPServer/MCPServerGuide/overview)
- [Tencent Maps key management](https://lbs.qq.com/dev/console/key/manage)
