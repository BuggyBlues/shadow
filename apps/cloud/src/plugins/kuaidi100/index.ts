import { connectorField, connectorManifest } from '../connector-kit.js'
import { defineConnectorPlugin } from '../helpers.js'

const manifest = connectorManifest({
  id: 'kuaidi100',
  name: 'Kuaidi100',
  description:
    'Kuaidi100 logistics workflows for express tracking, global carrier lookup, shipment status explanation, delivery estimates, and return shipment support.',
  category: 'automation',
  icon: 'truck',
  website: 'https://api.kuaidi100.com',
  docs: 'https://api.kuaidi100.com/document/mcp-summary',
  fields: [
    connectorField('KUAIDI100_KEY', 'API key', {
      description: 'Kuaidi100 API key.',
      placeholder: 'API key',
      helpUrl: 'https://api.kuaidi100.com/document/mcp-summary',
    }),
    connectorField('KUAIDI100_CUSTOMER', 'Customer ID', {
      description: 'Kuaidi100 customer ID.',
      sensitive: false,
      placeholder: 'Customer ID',
    }),
  ],
  capabilities: ['tool', 'data-source', 'mcp'],
  tags: ['kuaidi100', 'logistics', 'tracking', 'shipping', 'returns', 'mcp'],
  popularity: 90,
})

export default defineConnectorPlugin(manifest, {
  prompt:
    'Use Kuaidi100 for package tracking, carrier lookup, shipment status explanation, delivery estimates, logistics exceptions, and return shipment support.',
})
