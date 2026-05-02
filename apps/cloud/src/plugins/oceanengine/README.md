# OceanEngine Plugin

OceanEngine supports advertising workflows for campaign diagnosis, spend anomalies, creative review, report analysis, CRM leads, and marketing operations.

## Configuration Keys

| Key | Required | Sensitive | Description |
| --- | --- | --- | --- |
| `OCEANENGINE_ACCESS_TOKEN` | Yes | Yes | OceanEngine OpenAPI access token. |
| `OCEANENGINE_ADVERTISER_ID` | No | No | Default advertiser ID. |

## Setup

1. Open the OceanEngine developer platform.
2. Create or select an app with advertising API access.
3. Complete authorization for the advertiser account.
4. Paste the access token into `OCEANENGINE_ACCESS_TOKEN`.
5. Add `OCEANENGINE_ADVERTISER_ID` when the Buddy should default to one advertiser.
6. Deploy the Buddy and verify with read-only report or campaign queries.

## Runtime Assets

- Exposes connector metadata and prompt guidance for OceanEngine advertising workflows.
- Campaign, creative, and CRM writes should require explicit confirmation.

## References

- [OceanEngine MCP](https://open.oceanengine.com/mcp)
- [OceanEngine Open Platform](https://open.oceanengine.com)
