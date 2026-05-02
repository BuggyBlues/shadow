# Google Analytics Plugin

Google Analytics supports GA4 attribution checks, conversion discrepancy analysis, funnel review, audience reporting, ecommerce metrics, and ad-platform reconciliation.

## Configuration Keys

| Key | Required | Sensitive | Description |
| --- | --- | --- | --- |
| `GOOGLE_ANALYTICS_PROPERTY_ID` | Yes | No | Numeric GA4 property ID. |
| `GOOGLE_ANALYTICS_CREDENTIALS_JSON` | No | Yes | Google OAuth or service-account JSON for the Analytics Data API. |

## Setup

1. Open Google Analytics and copy the numeric GA4 property ID.
2. Put it in `GOOGLE_ANALYTICS_PROPERTY_ID`.
3. Configure credentials with access to the GA4 property.
4. Paste the credentials JSON into `GOOGLE_ANALYTICS_CREDENTIALS_JSON` if the runtime cannot use an existing provider profile.
5. Deploy the Buddy.
6. Verify with a small report query before running larger funnel or reconciliation workflows.

## Runtime Assets

- Registers `google-analytics-mcp` through `uvx`.
- Requires `GOOGLE_ANALYTICS_PROPERTY_ID` for runtime MCP calls.

## References

- [Google Analytics MCP server](https://developers.google.com/analytics/devguides/MCP)
- [GA4 Data API](https://developers.google.com/analytics/devguides/reporting/data/v1)
