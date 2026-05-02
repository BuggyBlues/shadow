# Shopify Plugin

Shopify CommerceOps supports product catalog work, orders, themes, subscriptions, app stack review, Hydrogen, metafields, and store diagnostics.

## Configuration Keys

| Key | Required | Sensitive | Description |
| --- | --- | --- | --- |
| `SHOPIFY_STORE_DOMAIN` | Yes | No | Shopify store domain, usually `example.myshopify.com`. |
| `SHOPIFY_ADMIN_ACCESS_TOKEN` | Yes | Yes | Admin API access token with the scopes the Buddy needs. |

## Setup

1. Open Shopify admin for the target store.
2. Create or open a custom app.
3. Grant only the Admin API scopes needed by the Buddy.
4. Install the app to the store.
5. Copy the Admin API access token into `SHOPIFY_ADMIN_ACCESS_TOKEN`.
6. Add the store domain as `SHOPIFY_STORE_DOMAIN`.
7. Deploy the Buddy and verify the Shopify CLI plus mounted Shopify skills.

## Runtime Assets

- Installs `@shopify/cli`.
- Registers Shopify Dev MCP metadata.
- Mounts Shopify AI Toolkit skills from `Shopify/shopify-ai-toolkit`.

## References

- [Shopify AI Toolkit](https://shopify.dev/docs/apps/build/ai-toolkit)
- [Shopify CLI authentication](https://shopify.dev/docs/apps/build/cli-for-apps/authentication)
- [Shopify Admin API authentication](https://shopify.dev/docs/api/admin-rest#authentication)
- [Shopify AI Toolkit repository](https://github.com/Shopify/shopify-ai-toolkit)
