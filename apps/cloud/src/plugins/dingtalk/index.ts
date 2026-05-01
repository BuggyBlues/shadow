import { connectorField, connectorManifest } from '../connector-kit.js'
import { defineConnectorPlugin } from '../helpers.js'

const manifest = connectorManifest({
  id: 'dingtalk',
  name: 'DingTalk',
  description:
    'DingTalk enterprise operations for contacts, departments, robots, DING messages, tasks, calendars, check-ins, work notices, and app management.',
  category: 'communication',
  icon: 'message-circle',
  website: 'https://open.dingtalk.com',
  docs: 'https://open.dingtalk.com/document/ai-dev/dingtalk-server-api-mcp-overview',
  fields: [
    connectorField('DINGTALK_Client_ID', 'Client ID', {
      description: 'DingTalk application Client ID.',
      sensitive: false,
      placeholder: 'ding...',
      helpUrl: 'https://open.dingtalk.com/document/orgapp/create-an-application',
    }),
    connectorField('DINGTALK_Client_Secret', 'Client secret', {
      description: 'DingTalk application Client Secret.',
      placeholder: 'Client secret',
      helpUrl: 'https://open.dingtalk.com/document/orgapp/create-an-application',
    }),
    connectorField('ACTIVE_PROFILES', 'Active profiles', {
      description: 'Comma-separated DingTalk MCP profiles, or ALL.',
      required: false,
      sensitive: false,
      placeholder: 'dingtalk-contacts,dingtalk-calendar',
    }),
    connectorField('ROBOT_CODE', 'Robot code', {
      description: 'Application robot code for robot send-message workflows.',
      required: false,
      sensitive: false,
      placeholder: 'Robot code',
    }),
    connectorField('ROBOT_ACCESS_TOKEN', 'Robot access token', {
      description: 'Custom group robot access token.',
      required: false,
      placeholder: 'Robot access token',
    }),
    connectorField('DINGTALK_AGENT_ID', 'Agent ID', {
      description: 'DingTalk agent ID for work notice workflows.',
      required: false,
      sensitive: false,
      placeholder: 'Agent ID',
    }),
  ],
  capabilities: ['tool', 'data-source', 'action', 'mcp'],
  tags: ['dingtalk', 'contacts', 'calendar', 'tasks', 'robot', 'approval', 'mcp'],
  popularity: 98,
})

export default defineConnectorPlugin(manifest, {
  mcp: {
    id: 'dingtalk-mcp',
    transport: 'stdio',
    command: 'npx',
    args: ['-y', 'dingtalk-mcp@latest'],
    description: 'DingTalk OpenAPI MCP server',
    requiredEnv: ['DINGTALK_Client_ID', 'DINGTALK_Client_Secret'],
  },
  env: (context) => ({
    ACTIVE_PROFILES:
      context.secrets.ACTIVE_PROFILES || 'dingtalk-contacts,dingtalk-robot-send-message',
  }),
  prompt:
    'Use DingTalk for contacts, departments, robots, DING messages, tasks, calendars, check-ins, work notices, and enterprise app workflows. Confirm write actions before sending messages, creating tasks, changing schedules, or modifying organization data.',
})
