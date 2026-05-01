import { connectorField, connectorManifest } from '../connector-kit.js'
import { defineConnectorPlugin } from '../helpers.js'

const manifest = connectorManifest({
  id: 'oceanengine',
  name: 'OceanEngine',
  description:
    'OceanEngine advertising workflows for campaign diagnosis, spend anomalies, creative review, report analysis, CRM leads, and marketing operations.',
  category: 'analytics',
  icon: 'megaphone',
  website: 'https://open.oceanengine.com',
  docs: 'https://open.oceanengine.com/mcp',
  fields: [
    connectorField('OCEANENGINE_ACCESS_TOKEN', 'Access token', {
      description: 'OceanEngine OpenAPI access token.',
      placeholder: 'Access token',
      helpUrl: 'https://open.oceanengine.com/mcp',
    }),
    connectorField('OCEANENGINE_ADVERTISER_ID', 'Advertiser ID', {
      description: 'Default advertiser ID.',
      required: false,
      sensitive: false,
      placeholder: 'Advertiser ID',
    }),
  ],
  capabilities: ['tool', 'data-source', 'action', 'mcp'],
  tags: ['oceanengine', 'ads', 'campaigns', 'creative', 'crm', 'reports', 'mcp'],
  popularity: 92,
})

export default defineConnectorPlugin(manifest, {
  prompt:
    'Use OceanEngine for campaign audits, budget anomalies, creative review, lead analysis, reports, and marketing operations. Confirm write actions before creating or changing campaigns, assets, or CRM data.',
})
