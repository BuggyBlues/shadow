# Google Ads Plugin

Google Ads supports campaign audits, Performance Max diagnosis, search term analysis, conversion tracking checks, spend anomaly detection, ROAS review, and read-oriented reporting.

## Configuration Keys

| Key | Required | Sensitive | Description |
| --- | --- | --- | --- |
| `GOOGLE_PROJECT_ID` | Yes | No | Google Cloud project used by the Google Ads MCP server. |
| `GOOGLE_ADS_DEVELOPER_TOKEN` | Yes | Yes | Google Ads API developer token. |
| `GOOGLE_ADS_MCP_OAUTH_CLIENT_ID` | No | No | OAuth client ID for installed-app access. |
| `GOOGLE_ADS_MCP_OAUTH_CLIENT_SECRET` | No | Yes | OAuth client secret for installed-app access. |
| `GOOGLE_APPLICATION_CREDENTIALS_JSON` | No | Yes | Service-account or application-default credentials JSON for Google APIs. |
| `GOOGLE_ADS_LOGIN_CUSTOMER_ID` | No | No | Manager account customer ID when needed. |

## Setup

1. Create or select a Google Cloud project.
2. Enable the Google Ads API.
3. Create or obtain a Google Ads API developer token.
4. Configure OAuth credentials or service-account credentials according to your Google Ads account model.
5. Add `GOOGLE_PROJECT_ID` and `GOOGLE_ADS_DEVELOPER_TOKEN`.
6. Add the OAuth, credentials JSON, and login customer ID fields when your account requires them.
7. Deploy the Buddy and verify with read-only account or campaign queries.

## Runtime Assets

- Runs the official Google Ads MCP server through `pipx` from `googleads/google-ads-mcp`.
- Writes `GOOGLE_APPLICATION_CREDENTIALS_JSON` to a private credentials file when provided.

## References

- [Google Ads MCP server](https://developers.google.com/google-ads/api/docs/developer-toolkit/mcp-server)
- [Google Ads API](https://developers.google.com/google-ads/api/docs/start)
