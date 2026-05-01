import { connectorField, connectorManifest } from '../connector-kit.js'
import { defineConnectorPlugin } from '../helpers.js'

const manifest = connectorManifest({
  id: 'tencent-maps',
  name: 'Tencent Maps',
  description:
    'Tencent Location Service workflows for Web maps, Mini Program maps, store location, geocoding, route planning, POI search, and map UI generation.',
  category: 'search',
  icon: 'map-pin',
  website: 'https://lbs.qq.com',
  docs: 'https://lbs.qq.com/service/MCPServer/MCPServerGuide/overview',
  fields: [
    connectorField('TENCENT_MAPS_KEY', 'Tencent Maps key', {
      description: 'Tencent Location Service API key.',
      placeholder: 'Tencent Maps key',
      helpUrl: 'https://lbs.qq.com/dev/console/key/manage',
    }),
  ],
  capabilities: ['tool', 'data-source', 'mcp'],
  tags: ['tencent-maps', 'location', 'poi', 'geocoding', 'routing', 'mini-program', 'mcp'],
  popularity: 92,
})

export default defineConnectorPlugin(manifest, {
  prompt:
    'Use Tencent Maps for Web and Mini Program map workflows, store location, geocoding, POI search, route planning, overlays, layers, and map component guidance.',
})
