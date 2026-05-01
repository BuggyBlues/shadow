import { connectorField, connectorManifest } from '../connector-kit.js'
import { defineConnectorPlugin } from '../helpers.js'

const manifest = connectorManifest({
  id: 'klaviyo',
  name: 'Klaviyo',
  description:
    'Klaviyo email and SMS marketing operations for flows, segments, abandoned cart recovery, campaign review, and retention analysis.',
  category: 'email',
  icon: 'mail-check',
  website: 'https://developers.klaviyo.com',
  docs: 'https://developers.klaviyo.com/en/docs/klaviyo_mcp_server',
  fields: [
    connectorField('KLAVIYO_API_KEY', 'Klaviyo private API key', {
      description:
        'Private API key with the scopes needed for flows, profiles, metrics, and campaigns.',
      placeholder: 'pk_...',
      helpUrl: 'https://developers.klaviyo.com/en/docs/retrieve_api_credentials',
    }),
  ],
  capabilities: ['tool', 'data-source', 'action', 'mcp'],
  tags: ['klaviyo', 'email', 'sms', 'flows', 'segments', 'retention', 'mcp'],
  popularity: 88,
})

export default defineConnectorPlugin(manifest, {
  mcp: {
    id: 'klaviyo-mcp',
    transport: 'streamable-http',
    url: 'https://mcp.klaviyo.com/mcp',
    description: 'Klaviyo MCP server for marketing automation workflows',
    auth: { type: 'bearer', tokenEnvKey: 'KLAVIYO_API_KEY' },
    requiredEnv: ['KLAVIYO_API_KEY'],
  },
  prompt:
    'Use Klaviyo for flow analysis, segmentation, abandoned cart recovery, email and SMS campaign review, retention diagnostics, and campaign reporting. Ask before launching, pausing, or editing campaigns and flows.',
})
