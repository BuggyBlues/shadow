import { connectorField, connectorManifest } from '../connector-kit.js'
import { defineConnectorPlugin } from '../helpers.js'

const manifest = connectorManifest({
  id: 'wechat-pay',
  name: 'WeChat Pay',
  description:
    'WeChat Pay transaction workflows for creating orders, checking payment state, refund support, chargeback handling, and Mini Program or Official Account commerce.',
  category: 'finance',
  icon: 'badge-yuan',
  website: 'https://pay.weixin.qq.com',
  docs: 'https://yuanqi.tencent.com/guide/wechat-pay-mcp-plugin',
  fields: [
    connectorField('WECHAT_PAY_MCH_ID', 'Merchant ID', {
      description: 'WeChat Pay merchant ID.',
      sensitive: false,
      placeholder: 'Merchant ID',
    }),
    connectorField('WECHAT_PAY_API_V3_KEY', 'API v3 key', {
      description: 'WeChat Pay API v3 key.',
      placeholder: 'API v3 key',
    }),
    connectorField('WECHAT_PAY_PRIVATE_KEY', 'Merchant private key', {
      description: 'Merchant private key for WeChat Pay requests.',
      placeholder: '-----BEGIN PRIVATE KEY-----...',
    }),
    connectorField('WECHAT_PAY_SERIAL_NO', 'Certificate serial number', {
      description: 'Merchant certificate serial number.',
      required: false,
      sensitive: false,
      placeholder: 'Certificate serial number',
    }),
  ],
  capabilities: ['tool', 'data-source', 'action', 'mcp'],
  tags: ['wechat-pay', 'payment', 'refund', 'mini-program', 'orders', 'mcp'],
  popularity: 94,
})

export default defineConnectorPlugin(manifest, {
  prompt:
    'Use WeChat Pay for Mini Program and Official Account payment workflows, order creation, payment lookup, refund support, and dispute triage. Confirm write actions before creating orders or initiating refunds.',
})
