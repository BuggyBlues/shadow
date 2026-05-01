import { connectorField, connectorManifest } from '../connector-kit.js'
import { defineConnectorPlugin } from '../helpers.js'

const manifest = connectorManifest({
  id: 'paypal',
  name: 'PayPal',
  description:
    'PayPal commerce operations for transaction reconciliation, account risk triage, disputes, refunds, and chargeback workflows.',
  category: 'finance',
  icon: 'wallet-cards',
  website: 'https://developer.paypal.com',
  docs: 'https://docs.paypal.ai/developer/tools/ai/mcp-quickstart',
  fields: [
    connectorField('PAYPAL_CLIENT_ID', 'PayPal client ID', {
      description: 'REST app client ID.',
      sensitive: false,
      placeholder: 'Client ID',
    }),
    connectorField('PAYPAL_CLIENT_SECRET', 'PayPal client secret', {
      description: 'REST app client secret.',
      placeholder: 'Client secret',
    }),
    connectorField('PAYPAL_ENVIRONMENT', 'PayPal environment', {
      description: 'Use sandbox for testing or live for production.',
      required: false,
      sensitive: false,
      placeholder: 'sandbox',
    }),
  ],
  capabilities: ['tool', 'data-source', 'action', 'mcp'],
  tags: ['payments', 'paypal', 'disputes', 'refunds', 'risk', 'mcp'],
  popularity: 97,
})

export default defineConnectorPlugin(manifest, {
  mcp: {
    id: 'paypal-mcp',
    transport: 'streamable-http',
    url: 'https://mcp.paypal.com/http',
    description: 'PayPal MCP server for PayPal commerce APIs',
    auth: { type: 'oauth2' },
    requiredEnv: ['PAYPAL_CLIENT_ID', 'PAYPAL_CLIENT_SECRET'],
  },
  prompt:
    'Use PayPal for payment reconciliation, dispute and chargeback investigation, refund review, and account-risk triage. Ask for approval before refunds, captures, or dispute responses.',
})
