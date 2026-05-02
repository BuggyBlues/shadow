import { connectorField, connectorManifest } from '../connector-kit.js'
import { defineConnectorPlugin } from '../helpers.js'

const manifest = connectorManifest({
  id: 'atlassian',
  name: 'Atlassian',
  description:
    'Atlassian ProjectOps supports Jira, Confluence, sprint summaries, PRD-to-ticket workflows, engineering planning, and Rovo-assisted project work.',
  category: 'project-management',
  icon: 'layers',
  website: 'https://www.atlassian.com',
  docs: 'https://support.atlassian.com/rovo/docs/use-rovo-dev-cli/',
  fields: [
    connectorField('ATLASSIAN_API_TOKEN', 'Atlassian API token', {
      description: 'Token for Jira and Confluence API access.',
      placeholder: 'Atlassian API token',
      helpUrl: 'https://id.atlassian.com/manage-profile/security/api-tokens',
    }),
    connectorField('ATLASSIAN_EMAIL', 'Atlassian account email', {
      description: 'Email paired with the API token.',
      sensitive: false,
      placeholder: 'you@example.com',
    }),
    connectorField('ATLASSIAN_SITE_URL', 'Site URL', {
      description: 'Default Atlassian site.',
      sensitive: false,
      placeholder: 'https://example.atlassian.net',
    }),
  ],
  capabilities: ['tool', 'data-source', 'action', 'mcp'],
  tags: ['atlassian', 'jira', 'confluence', 'rovo', 'project-management', 'mcp'],
  popularity: 84,
})

export default defineConnectorPlugin(manifest, {
  mcp: {
    id: 'atlassian-mcp',
    transport: 'streamable-http',
    url: 'https://mcp.atlassian.com/v1/sse',
    description: 'Atlassian Rovo MCP for Jira and Confluence workspaces',
    auth: { type: 'bearer', tokenEnvKey: 'ATLASSIAN_API_TOKEN' },
    requiredEnv: ['ATLASSIAN_API_TOKEN'],
  },
  prompt:
    'Use Atlassian for Jira issue work, sprint summaries, Confluence lookup, PRD-to-ticket flows, and engineering PM automation. Confirm before creating, moving, assigning, or closing tickets or changing Confluence pages.',
})
