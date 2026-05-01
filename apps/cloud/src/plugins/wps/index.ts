import { connectorField, connectorManifest } from '../connector-kit.js'
import { defineConnectorPlugin } from '../helpers.js'

const manifest = connectorManifest({
  id: 'wps',
  name: 'WPS / Kingsoft Docs',
  description:
    'WPS and Kingsoft Docs office workflows for cloud document search, meeting notes, task tracking, file organization, and document generation.',
  category: 'productivity',
  icon: 'files',
  website: 'https://open.wps.cn',
  docs: 'https://open.wps.cn/documents/app-integration-dev/mcp-server/introduction',
  fields: [
    connectorField('WPS_ACCESS_TOKEN', 'Access token', {
      description: 'WPS Open Platform access token.',
      placeholder: 'Access token',
      helpUrl: 'https://open.wps.cn/documents/app-integration-dev/mcp-server/introduction',
    }),
    connectorField('WPS_APP_ID', 'App ID', {
      description: 'Optional WPS app ID.',
      required: false,
      sensitive: false,
      placeholder: 'App ID',
    }),
    connectorField('WPS_APP_SECRET', 'App secret', {
      description: 'Optional WPS app secret.',
      required: false,
      placeholder: 'App secret',
    }),
  ],
  capabilities: ['tool', 'data-source', 'action', 'mcp'],
  tags: ['wps', 'kingsoft-docs', 'documents', 'meetings', 'tasks', 'mcp'],
  popularity: 91,
})

export default defineConnectorPlugin(manifest, {
  prompt:
    'Use WPS / Kingsoft Docs for cloud document search, meeting summaries, to-do tracking, file organization, and document generation. Confirm write actions before editing, moving, or sharing files.',
})
