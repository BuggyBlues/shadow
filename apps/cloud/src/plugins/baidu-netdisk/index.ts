import { connectorField, connectorManifest } from '../connector-kit.js'
import { defineConnectorPlugin } from '../helpers.js'

const manifest = connectorManifest({
  id: 'baidu-netdisk',
  name: 'Baidu Netdisk',
  description:
    'Baidu Netdisk file workflows for user files, file search, upload, folder organization, batch archiving, and personal or enterprise document retrieval.',
  category: 'productivity',
  icon: 'folder-cloud',
  website: 'https://pan.baidu.com',
  docs: 'https://github.com/baidu-netdisk/mcp',
  fields: [
    connectorField('BAIDU_NETDISK_ACCESS_TOKEN', 'Access token', {
      description: 'Baidu Netdisk access token.',
      placeholder: 'Access token',
      helpUrl: 'https://github.com/baidu-netdisk/mcp',
    }),
  ],
  capabilities: ['tool', 'data-source', 'action', 'mcp'],
  tags: ['baidu-netdisk', 'files', 'upload', 'search', 'archive', 'mcp'],
  popularity: 87,
})

export default defineConnectorPlugin(manifest, {
  mcp: {
    id: 'baidu-netdisk-mcp',
    transport: 'sse',
    url: 'https://mcp-pan.baidu.com/sse',
    description: 'Baidu Netdisk MCP server',
    auth: { type: 'bearer', tokenEnvKey: 'BAIDU_NETDISK_ACCESS_TOKEN' },
    requiredEnv: ['BAIDU_NETDISK_ACCESS_TOKEN'],
  },
  prompt:
    'Use Baidu Netdisk for file lookup, folder organization, upload workflows, batch archiving, and document retrieval. Confirm write actions before uploading, moving, deleting, or sharing files.',
})
