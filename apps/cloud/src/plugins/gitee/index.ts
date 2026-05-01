import { connectorField, connectorManifest } from '../connector-kit.js'
import { defineConnectorPlugin } from '../helpers.js'

const manifest = connectorManifest({
  id: 'gitee',
  name: 'Gitee',
  description:
    'Gitee development workflows for repositories, issues, pull requests, notifications, code lookup, implementation handoff, and release collaboration.',
  category: 'code',
  icon: 'git-pull-request',
  website: 'https://gitee.com',
  docs: 'https://gitee.com/oschina/mcp-gitee',
  fields: [
    connectorField('GITEE_ACCESS_TOKEN', 'Access token', {
      description: 'Gitee personal access token.',
      placeholder: 'Access token',
      helpUrl: 'https://gitee.com/profile/personal_access_tokens',
    }),
    connectorField('GITEE_API_BASE', 'API base URL', {
      description: 'Gitee API base URL.',
      required: false,
      sensitive: false,
      placeholder: 'https://gitee.com/api/v5',
    }),
  ],
  capabilities: ['tool', 'data-source', 'action', 'mcp'],
  tags: ['gitee', 'repositories', 'issues', 'pull-requests', 'code', 'mcp'],
  popularity: 88,
})

export default defineConnectorPlugin(manifest, {
  mcp: {
    id: 'gitee-mcp',
    transport: 'stdio',
    command: 'npx',
    args: ['-y', '@gitee/mcp-gitee@latest'],
    description: 'Gitee MCP server for repositories, issues, and pull requests',
    requiredEnv: ['GITEE_ACCESS_TOKEN'],
  },
  env: (context) => ({
    GITEE_API_BASE: context.secrets.GITEE_API_BASE || 'https://gitee.com/api/v5',
  }),
  prompt:
    'Use Gitee for repository lookup, issue triage, pull request summaries, code search, release notes, and development collaboration. Confirm write actions before creating repos, changing issues, or opening pull requests.',
})
