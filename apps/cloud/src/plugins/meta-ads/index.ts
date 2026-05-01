import { connectorField, connectorManifest } from '../connector-kit.js'
import { defineConnectorPlugin } from '../helpers.js'

const manifest = connectorManifest({
  id: 'meta-ads',
  name: 'Meta Ads',
  description:
    'Meta Ads diagnostics for Pixel and CAPI setup, ROAS monitoring, creative fatigue, attribution issues, and campaign analysis.',
  category: 'analytics',
  icon: 'megaphone',
  website: 'https://www.facebook.com/business',
  docs: 'https://www.facebook.com/business/news/meta-ads-ai-connectors',
  fields: [
    connectorField('META_ACCESS_TOKEN', 'Meta access token', {
      description: 'Meta Marketing API access token.',
      placeholder: 'EAAB...',
      helpUrl: 'https://developers.facebook.com/docs/marketing-apis/',
    }),
    connectorField('META_AD_ACCOUNT_ID', 'Ad account ID', {
      description: 'Default ad account ID.',
      required: false,
      sensitive: false,
      placeholder: 'act_123456789',
    }),
  ],
  tags: ['ads', 'meta', 'facebook-ads', 'pixel', 'capi', 'roas'],
  popularity: 95,
})

export default defineConnectorPlugin(manifest, {
  prompt:
    'Use Meta Ads for Pixel and Conversions API troubleshooting, creative and audience analysis, attribution review, ROAS monitoring, and campaign reporting. Ask before editing campaigns, budgets, audiences, or ads.',
})
