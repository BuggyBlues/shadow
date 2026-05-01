import { connectorField, connectorManifest } from '../connector-kit.js'
import { defineConnectorPlugin } from '../helpers.js'

const manifest = connectorManifest({
  id: 'tencent-ads',
  name: 'Tencent Ads',
  description:
    'Tencent Ads workflows for campaign creation support, data queries, report interpretation, audience operations, creative management, and Marketing API diagnostics.',
  category: 'analytics',
  icon: 'chart-no-axes-combined',
  website: 'https://developers.e.qq.com',
  docs: 'https://developers.e.qq.com',
  fields: [
    connectorField('TENCENT_ADS_ACCESS_TOKEN', 'Access token', {
      description: 'Tencent Ads Marketing API access token.',
      placeholder: 'Access token',
      helpUrl: 'https://developers.e.qq.com/docs/start',
    }),
    connectorField('TENCENT_ADS_ACCOUNT_ID', 'Account ID', {
      description: 'Default Tencent Ads account ID.',
      required: false,
      sensitive: false,
      placeholder: 'Account ID',
    }),
  ],
  capabilities: ['tool', 'data-source', 'action'],
  tags: ['tencent-ads', 'marketing-api', 'ads', 'campaigns', 'audience', 'reports'],
  popularity: 89,
})

export default defineConnectorPlugin(manifest, {
  prompt:
    'Use Tencent Ads for campaign diagnostics, data queries, report interpretation, audience and creative management, and ad creation support. Confirm write actions before creating or changing ads, audiences, or assets.',
})
