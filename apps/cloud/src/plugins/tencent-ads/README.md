# Tencent Ads Plugin

Tencent Ads supports campaign diagnostics, data queries, report interpretation, audience operations, creative management, and Marketing API workflows.

## Configuration Keys

| Key | Required | Sensitive | Description |
| --- | --- | --- | --- |
| `TENCENT_ADS_ACCESS_TOKEN` | Yes | Yes | Tencent Ads Marketing API access token. |
| `TENCENT_ADS_ACCOUNT_ID` | No | No | Default Tencent Ads account ID. |

## Setup

1. Open the Tencent Ads developer platform.
2. Create or select an application with Marketing API access.
3. Authorize the target ad account.
4. Paste the access token into `TENCENT_ADS_ACCESS_TOKEN`.
5. Add `TENCENT_ADS_ACCOUNT_ID` when the Buddy should default to one account.
6. Deploy the Buddy and verify with read-only report or campaign lookup.

## Runtime Assets

- Exposes connector metadata and prompt guidance for Tencent Ads and Marketing API workflows.
- Ad creation, budget, audience, and asset changes should require explicit confirmation.

## References

- [Tencent Ads developer site](https://developers.e.qq.com)
- [Tencent Ads getting started](https://developers.e.qq.com/docs/start)
