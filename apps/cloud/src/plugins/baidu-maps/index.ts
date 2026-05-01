import { connectorField, connectorManifest } from '../connector-kit.js'
import { defineConnectorPlugin } from '../helpers.js'

const manifest = connectorManifest({
  id: 'baidu-maps',
  name: 'Baidu Maps',
  description:
    'Baidu Maps location workflows for geocoding, reverse geocoding, POI search, place details, distance matrices, route planning, weather, and traffic.',
  category: 'search',
  icon: 'map-pinned',
  website: 'https://lbsyun.baidu.com',
  docs: 'https://lbsyun.baidu.com/faq/api?title=mcpserver/quickstart',
  fields: [
    connectorField('BAIDU_MAP_API_KEY', 'Baidu Maps API key', {
      description: 'Baidu Maps Web Service API key.',
      placeholder: 'Baidu Maps API key',
      helpUrl: 'https://lbsyun.baidu.com/faq/search?id=299&title=677',
    }),
  ],
  capabilities: ['tool', 'data-source', 'mcp'],
  tags: ['baidu-maps', 'maps', 'poi', 'geocoding', 'routing', 'traffic', 'mcp'],
  popularity: 93,
})

export default defineConnectorPlugin(manifest, {
  mcp: {
    id: 'baidu-map-mcp',
    transport: 'stdio',
    command: 'npx',
    args: ['-y', '@baidumap/mcp-server-baidu-map@latest'],
    description: 'Baidu Map MCP server',
    requiredEnv: ['BAIDU_MAP_API_KEY'],
  },
  prompt:
    'Use Baidu Maps for geocoding, POI search, place details, route planning, distance matrices, weather, traffic checks, and local service lookup.',
})
