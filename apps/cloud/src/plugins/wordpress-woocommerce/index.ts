import { connectorField, connectorManifest } from '../connector-kit.js'
import { defineConnectorPlugin } from '../helpers.js'

const manifest = connectorManifest({
  id: 'wordpress-woocommerce',
  name: 'WordPress + WooCommerce',
  description:
    'WordPress and WooCommerce operations for plugin conflict triage, performance review, checkout diagnosis, product and order analysis, and SEO maintenance.',
  category: 'automation',
  icon: 'panel-top',
  website: 'https://wordpress.org',
  docs: 'https://developer.wordpress.org/cli/commands/',
  fields: [
    connectorField('WORDPRESS_SITE_URL', 'WordPress site URL', {
      description: 'WordPress site URL.',
      sensitive: false,
      placeholder: 'https://example.com',
    }),
    connectorField('WORDPRESS_USERNAME', 'WordPress username', {
      description: 'WordPress username for REST API access.',
      sensitive: false,
      placeholder: 'admin',
    }),
    connectorField('WORDPRESS_APPLICATION_PASSWORD', 'Application password', {
      description: 'WordPress application password.',
      placeholder: 'xxxx xxxx xxxx xxxx xxxx xxxx',
    }),
    connectorField('WOOCOMMERCE_CONSUMER_KEY', 'WooCommerce consumer key', {
      description: 'WooCommerce REST API consumer key.',
      required: false,
      placeholder: 'ck_...',
      helpUrl: 'https://woocommerce.github.io/woocommerce-rest-api-docs/',
    }),
    connectorField('WOOCOMMERCE_CONSUMER_SECRET', 'WooCommerce consumer secret', {
      description: 'WooCommerce REST API consumer secret.',
      required: false,
      placeholder: 'cs_...',
      helpUrl: 'https://woocommerce.github.io/woocommerce-rest-api-docs/',
    }),
  ],
  capabilities: ['tool', 'data-source', 'action', 'cli'],
  tags: ['wordpress', 'woocommerce', 'wp-cli', 'checkout', 'plugins', 'seo'],
  popularity: 94,
})

export default defineConnectorPlugin(manifest, {
  prompt:
    'Use WordPress and WooCommerce for site health, plugin conflict triage, checkout and performance diagnosis, content SEO, and product or order analysis. Confirm writes before changing plugins, content, products, orders, or settings.',
})
