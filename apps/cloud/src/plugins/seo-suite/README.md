# SEO Suite Plugin

SEO Suite covers SEO and AEO research across Google Search Console, Semrush, and Ahrefs for ranking drops, content gaps, keywords, backlinks, competitor reports, and search performance diagnostics.

## Configuration Keys

| Key | Required | Sensitive | Description |
| --- | --- | --- | --- |
| `GOOGLE_SEARCH_CONSOLE_SITE_URL` | Yes | No | Search Console site URL or `sc-domain:` property. |
| `GOOGLE_SEARCH_CONSOLE_CREDENTIALS_JSON` | No | Yes | Google OAuth or service-account JSON for Search Console APIs. |
| `SEMRUSH_API_KEY` | No | Yes | Semrush API key for keyword and domain reports. |
| `AHREFS_API_KEY` | No | Yes | Ahrefs API token for Site Explorer and keyword data. |

## Setup

1. Add the target site to Google Search Console.
2. Copy the exact property string into `GOOGLE_SEARCH_CONSOLE_SITE_URL`.
3. Add Google credentials JSON if the runtime does not already have access.
4. Add `SEMRUSH_API_KEY` and `AHREFS_API_KEY` only for workflows that need those data sources.
5. Deploy the Buddy.
6. Verify with a small Search Console query before running audits or competitor reports.

## Runtime Assets

- Exposes connector metadata and prompt guidance for search diagnostics and content research.

## References

- [Search Console API](https://developers.google.com/webmaster-tools)
- [Search Analytics API](https://developers.google.com/webmaster-tools/v1/how-tos/search_analytics)
- [Semrush API](https://developer.semrush.com/api/)
- [Ahrefs API docs](https://docs.ahrefs.com/)
