import { connectorField, connectorManifest } from '../connector-kit.js'
import { defineConnectorPlugin } from '../helpers.js'

const manifest = connectorManifest({
  id: 'coze',
  name: 'Coze',
  description:
    'Coze agent-platform workflows for publishing business agents as MCP tools, managing spaces, connecting MCP services, and distributing agent capabilities.',
  category: 'automation',
  icon: 'bot',
  website: 'https://www.coze.cn',
  docs: 'https://www.coze.cn/open/docs/guides/publish_to_space',
  fields: [
    connectorField('COZE_API_TOKEN', 'API token', {
      description: 'Coze Open API token.',
      placeholder: 'API token',
      helpUrl: 'https://www.coze.cn/open/docs/developer_guides/coze_api_overview',
    }),
    connectorField('COZE_SPACE_ID', 'Space ID', {
      description: 'Default Coze space ID.',
      required: false,
      sensitive: false,
      placeholder: 'Space ID',
    }),
    connectorField('COZE_BOT_ID', 'Bot ID', {
      description: 'Default Coze bot ID.',
      required: false,
      sensitive: false,
      placeholder: 'Bot ID',
    }),
  ],
  capabilities: ['tool', 'data-source', 'action', 'mcp'],
  tags: ['coze', 'agent-platform', 'mcp', 'bots', 'plugins', 'automation'],
  popularity: 91,
})

export default defineConnectorPlugin(manifest, {
  prompt:
    'Use Coze for agent distribution, MCP tool publishing, space management, bot workflows, and connecting business agents to external clients. Confirm publish or configuration changes before applying them.',
})
