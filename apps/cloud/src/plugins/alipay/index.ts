import { connectorField, connectorManifest } from '../connector-kit.js'
import { defineConnectorPlugin } from '../helpers.js'

const manifest = connectorManifest({
  id: 'alipay',
  name: 'Alipay',
  description:
    'Alipay payment operations for order creation, payment lookup, refunds, refund status checks, reconciliation, and after-sales payment support.',
  category: 'finance',
  icon: 'wallet-cards',
  website: 'https://opendocs.alipay.com',
  docs: 'https://opendocs.alipay.com/solution/0ilmhz',
  fields: [
    connectorField('ALIPAY_APP_ID', 'App ID', {
      description: 'Alipay application ID.',
      sensitive: false,
      placeholder: 'App ID',
    }),
    connectorField('ALIPAY_PRIVATE_KEY', 'Private key', {
      description: 'Private key for signing Alipay API requests.',
      placeholder: '-----BEGIN PRIVATE KEY-----...',
    }),
    connectorField('ALIPAY_PUBLIC_KEY', 'Alipay public key', {
      description: 'Alipay public key for response verification.',
      required: false,
      placeholder: '-----BEGIN PUBLIC KEY-----...',
    }),
    connectorField('ALIPAY_GATEWAY_URL', 'Gateway URL', {
      description: 'Alipay gateway URL.',
      required: false,
      sensitive: false,
      placeholder: 'https://openapi.alipay.com/gateway.do',
    }),
  ],
  capabilities: ['tool', 'data-source', 'action', 'mcp'],
  tags: ['alipay', 'payment', 'refund', 'reconciliation', 'mcp'],
  popularity: 96,
})

export default defineConnectorPlugin(manifest, {
  prompt:
    'Use Alipay for payment creation, payment status lookup, refunds, refund tracking, reconciliation, and after-sales payment support. Confirm write actions before creating orders, refunding, or changing payment state.',
})
