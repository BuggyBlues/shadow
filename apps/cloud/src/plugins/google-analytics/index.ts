import { connectorField, connectorManifest } from '../connector-kit.js'
import { defineConnectorPlugin } from '../helpers.js'

const manifest = connectorManifest({
  id: 'google-analytics',
  name: 'Google Analytics',
  description:
    'GA4 diagnostics for attribution, conversion discrepancies, funnels, audiences, ecommerce reporting, and ad-platform reconciliation.',
  category: 'analytics',
  icon: 'chart-no-axes-combined',
  website: 'https://developers.google.com/analytics',
  docs: 'https://developers.google.com/analytics/devguides/MCP',
  fields: [
    connectorField('GOOGLE_ANALYTICS_PROPERTY_ID', 'GA4 property ID', {
      description: 'Numeric GA4 property ID.',
      sensitive: false,
      placeholder: '123456789',
    }),
    connectorField('GOOGLE_ANALYTICS_CREDENTIALS_JSON', 'Analytics credentials JSON', {
      description: 'Google OAuth or service-account JSON for Analytics Data API.',
      required: false,
      placeholder: '{"type":"service_account","project_id":"..."}',
    }),
  ],
  capabilities: ['tool', 'data-source', 'mcp'],
  tags: ['analytics', 'ga4', 'attribution', 'funnels', 'conversions', 'mcp'],
  popularity: 92,
})

export default defineConnectorPlugin(manifest, {
  mcp: {
    id: 'google-analytics-mcp',
    transport: 'stdio',
    command: 'uvx',
    args: ['google-analytics-mcp'],
    description: 'Google Analytics MCP server for GA4 reporting workflows',
    requiredEnv: ['GOOGLE_ANALYTICS_PROPERTY_ID'],
  },
  prompt:
    'Use Google Analytics for GA4 attribution, conversion discrepancy analysis, funnel review, audience reporting, ecommerce metrics, and ad-platform reconciliation.',
})
