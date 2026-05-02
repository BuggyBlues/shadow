# WordPress + WooCommerce Plugin

WordPress + WooCommerce supports site health, plugin conflict triage, checkout and performance diagnosis, content SEO, product analysis, order analysis, and store maintenance workflows.

## Configuration Keys

| Key | Required | Sensitive | Description |
| --- | --- | --- | --- |
| `WORDPRESS_SITE_URL` | Yes | No | WordPress site URL. |
| `WORDPRESS_USERNAME` | Yes | No | WordPress username for REST API access. |
| `WORDPRESS_APPLICATION_PASSWORD` | Yes | Yes | WordPress application password. |
| `WOOCOMMERCE_CONSUMER_KEY` | No | Yes | WooCommerce REST API consumer key. |
| `WOOCOMMERCE_CONSUMER_SECRET` | No | Yes | WooCommerce REST API consumer secret. |

## Setup

1. Open the WordPress user profile for the API user.
2. Create an application password.
3. Add the site URL, username, and application password.
4. In WooCommerce settings, create REST API keys when product or order workflows are needed.
5. Paste the WooCommerce consumer key and secret into the optional fields.
6. Deploy the Buddy.
7. Verify with read-only site, product, or order lookup before changing content, plugins, products, orders, or settings.

## Runtime Assets

- Exposes connector metadata and prompt guidance for WordPress, WooCommerce, and WP-CLI style workflows.

## References

- [WP-CLI command reference](https://developer.wordpress.org/cli/commands/)
- [WordPress application passwords](https://wordpress.org/documentation/article/application-passwords/)
- [WooCommerce REST API](https://woocommerce.github.io/woocommerce-rest-api-docs/)
