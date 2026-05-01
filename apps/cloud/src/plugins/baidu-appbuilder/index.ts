import { connectorField, connectorManifest } from '../connector-kit.js'
import { defineConnectorPlugin } from '../helpers.js'

const manifest = connectorManifest({
  id: 'baidu-appbuilder',
  name: 'Baidu Qianfan AppBuilder',
  description:
    'Baidu Qianfan AppBuilder workflows for search-enhanced agents, MCP marketplace tools, file Q&A, OCR, image understanding, and enterprise knowledge retrieval.',
  category: 'search',
  icon: 'search-check',
  website: 'https://cloud.baidu.com/product/AppBuilder',
  docs: 'https://ai.baidu.com/ai-doc/AppBuilder/Jlt4dqv3h',
  fields: [
    connectorField('BAIDU_APPBUILDER_TOKEN', 'AppBuilder token', {
      description: 'Baidu Qianfan AppBuilder API token.',
      placeholder: 'AppBuilder token',
    }),
    connectorField('BAIDU_APPBUILDER_APP_ID', 'App ID', {
      description: 'Default AppBuilder app ID.',
      required: false,
      sensitive: false,
      placeholder: 'App ID',
    }),
  ],
  capabilities: ['tool', 'data-source', 'action', 'mcp'],
  tags: ['baidu', 'qianfan', 'appbuilder', 'search', 'ocr', 'knowledge', 'mcp'],
  popularity: 88,
})

export default defineConnectorPlugin(manifest, {
  prompt:
    'Use Baidu Qianfan AppBuilder for search-enhanced workflows, file Q&A, OCR, image understanding, enterprise knowledge retrieval, and MCP marketplace integrations.',
})
