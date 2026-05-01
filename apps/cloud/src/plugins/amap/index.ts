import { connectorField, connectorManifest } from '../connector-kit.js'
import { defineConnectorPlugin } from '../helpers.js'

const manifest = connectorManifest({
  id: 'amap',
  name: 'AMap / Gaode Maps',
  description:
    'AMap location workflows for geocoding, weather, POI search, route planning, local-life recommendations, and travel or store-location support.',
  category: 'search',
  icon: 'map',
  website: 'https://lbs.amap.com',
  docs: 'https://lbs.amap.com/api/mcp-server/summary',
  fields: [
    connectorField('AMAP_MAPS_API_KEY', 'AMap API key', {
      description: 'AMap Web Service API key.',
      placeholder: 'AMap API key',
      helpUrl: 'https://lbs.amap.com/api/webservice/create-project-and-key',
    }),
  ],
  capabilities: ['tool', 'data-source', 'mcp'],
  tags: ['amap', 'gaode', 'maps', 'poi', 'geocoding', 'weather', 'routing', 'mcp'],
  popularity: 95,
})

export default defineConnectorPlugin(manifest, {
  mcp: {
    id: 'amap-maps-mcp',
    transport: 'stdio',
    command: 'npx',
    args: ['-y', '@amap/amap-maps-mcp-server@latest'],
    description: 'AMap Maps MCP server',
    requiredEnv: ['AMAP_MAPS_API_KEY'],
  },
  prompt:
    'Use AMap / Gaode Maps for POI search, address parsing, route planning, weather-aware recommendations, local-life lookup, and store-location workflows.',
})
