# Cloudflare Plugin

Cloudflare EdgeOps supports DNS, WAF, caching, Workers, R2, KV, D1, access rules, security review, and edge performance diagnostics.

## Configuration Keys

| Key | Required | Sensitive | Description |
| --- | --- | --- | --- |
| `CLOUDFLARE_API_TOKEN` | Yes | Yes | Cloudflare API token scoped to the account or zone tasks. |
| `CLOUDFLARE_ACCOUNT_ID` | No | No | Optional default account ID. |
| `CLOUDFLARE_ZONE_ID` | No | No | Optional default zone ID. |

## Setup

1. Open Cloudflare API token settings.
2. Create a custom API token with the minimum account and zone permissions needed.
3. Add the token as `CLOUDFLARE_API_TOKEN`.
4. Add `CLOUDFLARE_ACCOUNT_ID` for account-level operations.
5. Add `CLOUDFLARE_ZONE_ID` for DNS, WAF, cache, or zone-specific workflows.
6. Deploy the Buddy and verify `wrangler --version` plus the mounted Cloudflare skills.

## Runtime Assets

- Installs the `wrangler` CLI.
- Registers hosted Cloudflare MCP metadata.
- Mounts official Cloudflare skills from `cloudflare/skills`.

## References

- [Cloudflare MCP servers](https://developers.cloudflare.com/agents/model-context-protocol/mcp-servers-for-cloudflare/)
- [Wrangler CLI](https://developers.cloudflare.com/workers/wrangler/)
- [Cloudflare API tokens](https://developers.cloudflare.com/fundamentals/api/get-started/create-token/)
- [Cloudflare skills repository](https://github.com/cloudflare/skills)
