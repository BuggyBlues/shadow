import { connectorField, connectorManifest } from '../connector-kit.js'
import { defineConnectorPlugin } from '../helpers.js'

const manifest = connectorManifest({
  id: 'tapd',
  name: 'TAPD',
  description:
    'TAPD project-management workflows for requirements, defects, tasks, iterations, project dashboards, daily reports, and R&D planning.',
  category: 'project-management',
  icon: 'list-checks',
  website: 'https://www.tapd.cn',
  docs: 'https://cloud.tencent.com/developer/mcp/server/11474',
  fields: [
    connectorField('TAPD_CLIENT_ID', 'Client ID', {
      description: 'TAPD application client ID.',
      sensitive: false,
      placeholder: 'Client ID',
    }),
    connectorField('TAPD_CLIENT_SECRET', 'Client secret', {
      description: 'TAPD application client secret.',
      placeholder: 'Client secret',
    }),
    connectorField('TAPD_WORKSPACE_ID', 'Workspace ID', {
      description: 'Default TAPD workspace ID.',
      required: false,
      sensitive: false,
      placeholder: 'Workspace ID',
    }),
  ],
  capabilities: ['tool', 'data-source', 'action', 'mcp'],
  tags: ['tapd', 'requirements', 'defects', 'tasks', 'iterations', 'project-management', 'mcp'],
  popularity: 85,
})

export default defineConnectorPlugin(manifest, {
  prompt:
    'Use TAPD for requirements, defects, tasks, iterations, project dashboards, daily reports, and R&D planning. Confirm write actions before creating or changing requirements, defects, tasks, or iteration state.',
})
