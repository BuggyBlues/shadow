import { connectorField, connectorManifest } from '../connector-kit.js'
import { defineConnectorPlugin } from '../helpers.js'

const manifest = connectorManifest({
  id: 'huawei-xiaoyi',
  name: 'Huawei Xiaoyi',
  description:
    'Huawei Xiaoyi agent workflows for HarmonyOS MCP plugins, service lookup, tool integration, mobile-agent actions, and scenario publishing.',
  category: 'automation',
  icon: 'sparkles',
  website: 'https://developer.huawei.com/consumer/cn',
  docs: 'https://developer.huawei.com/consumer/cn/doc/service/mcp-plugin-0000002437785774',
  fields: [
    connectorField('HUAWEI_XIAOYI_CLIENT_ID', 'Client ID', {
      description: 'Huawei Xiaoyi platform client ID.',
      sensitive: false,
      placeholder: 'Client ID',
    }),
    connectorField('HUAWEI_XIAOYI_CLIENT_SECRET', 'Client secret', {
      description: 'Huawei Xiaoyi platform client secret.',
      placeholder: 'Client secret',
    }),
  ],
  capabilities: ['tool', 'data-source', 'action', 'mcp'],
  tags: ['huawei', 'xiaoyi', 'harmonyos', 'mcp', 'mobile-agent', 'plugins'],
  popularity: 81,
})

export default defineConnectorPlugin(manifest, {
  prompt:
    'Use Huawei Xiaoyi for HarmonyOS MCP plugin workflows, service lookup, tool integration, mobile-agent tasks, and scenario publishing. Confirm publishing or configuration changes before applying them.',
})
