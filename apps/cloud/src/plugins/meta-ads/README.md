# Meta Ads Plugin

Meta Ads supports Pixel and Conversions API troubleshooting, creative and audience analysis, attribution review, ROAS monitoring, campaign reporting, and budget diagnostics.

## Configuration Keys

| Key | Required | Sensitive | Description |
| --- | --- | --- | --- |
| `META_ACCESS_TOKEN` | Yes | Yes | Meta Marketing API access token. |
| `META_AD_ACCOUNT_ID` | No | No | Default ad account ID, usually in `act_...` format. |

## Setup

1. Open Meta for Developers and create or select an app.
2. Configure Marketing API permissions for the ad accounts the Buddy can inspect.
3. Generate a system user or access token with the required scopes.
4. Paste the token into `META_ACCESS_TOKEN`.
5. Add `META_AD_ACCOUNT_ID` when the Buddy should default to one account.
6. Deploy the Buddy and verify with read-only campaign, insight, or pixel checks.

## Runtime Assets

- Exposes connector metadata and prompt guidance for Meta Ads diagnostics.
- Campaign, budget, audience, and creative mutations should require explicit confirmation.

## References

- [Meta Ads AI Connectors](https://www.facebook.com/business/news/meta-ads-ai-connectors)
- [Meta Marketing APIs](https://developers.facebook.com/docs/marketing-apis/)
