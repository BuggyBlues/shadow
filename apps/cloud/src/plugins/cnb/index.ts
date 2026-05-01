import { connectorField, connectorManifest } from '../connector-kit.js'
import { defineConnectorPlugin } from '../helpers.js'

const manifest = connectorManifest({
  id: 'cnb',
  name: 'CNB',
  description:
    'CNB code-collaboration workflows for repository lookup, issue creation, CloudBase-native development support, CI/CD assistance, and project automation.',
  category: 'devops',
  icon: 'cloud-cog',
  website: 'https://cnb.cool',
  docs: 'https://docs.cloudbase.net/ai/mcp/develop/server-templates/cloudrun-mcp-cnb',
  fields: [
    connectorField('CNB_TOKEN', 'Access token', {
      description: 'CNB access token.',
      placeholder: 'Access token',
    }),
    connectorField('CNB_ENDPOINT', 'Endpoint', {
      description: 'Optional CNB API endpoint.',
      required: false,
      sensitive: false,
      placeholder: 'https://cnb.cool',
    }),
  ],
  capabilities: ['tool', 'data-source', 'action', 'mcp'],
  tags: ['cnb', 'cloudbase', 'repositories', 'issues', 'ci-cd', 'mcp'],
  popularity: 83,
})

export default defineConnectorPlugin(manifest, {
  env: (context) => ({
    CNB_ENDPOINT: context.secrets.CNB_ENDPOINT || 'https://cnb.cool',
  }),
  prompt:
    'Use CNB for repository lookup, issue creation, CI/CD assistance, CloudBase-native development support, and project automation. Confirm write actions before changing repositories, issues, or pipeline configuration.',
})
