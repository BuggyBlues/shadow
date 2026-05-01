import {
  attachConnectorRuntimeAssets,
  connectorField,
  connectorManifest,
  installedCheck,
  npmGlobalDependency,
} from '../connector-kit.js'
import { defineConnectorPlugin } from '../helpers.js'

const manifest = connectorManifest({
  id: 'vercel',
  name: 'Vercel',
  description:
    'Vercel operations for deployments, domains, logs, project settings, environment variables, and Next.js production diagnostics.',
  category: 'devops',
  icon: 'triangle',
  website: 'https://vercel.com',
  docs: 'https://vercel.com/docs/agent-resources/vercel-mcp',
  fields: [
    connectorField('VERCEL_TOKEN', 'Vercel token', {
      description: 'Vercel access token.',
      placeholder: 'Vercel token',
      helpUrl: 'https://vercel.com/docs/rest-api#creating-an-access-token',
    }),
    connectorField('VERCEL_TEAM_ID', 'Team ID', {
      description: 'Default Vercel team ID.',
      required: false,
      sensitive: false,
      placeholder: 'team_...',
    }),
    connectorField('VERCEL_PROJECT_ID', 'Project ID', {
      description: 'Default Vercel project ID.',
      required: false,
      sensitive: false,
      placeholder: 'prj_...',
    }),
  ],
  capabilities: ['tool', 'data-source', 'action', 'cli', 'mcp'],
  tags: ['vercel', 'deployments', 'nextjs', 'logs', 'domains', 'mcp'],
  popularity: 84,
})

const runtimeDependencies = [npmGlobalDependency('vercel', ['vercel'], 'Vercel CLI')]
const verificationChecks = [
  installedCheck('vercel-cli-installed', 'Vercel CLI installed', ['vercel', '--version']),
]

const plugin = defineConnectorPlugin(manifest, {
  cli: [
    {
      name: 'vercel',
      command: 'vercel',
      description: 'Vercel CLI for deployments, projects, domains, and environment variables',
    },
  ],
  mcp: {
    id: 'vercel-mcp',
    transport: 'streamable-http',
    url: 'https://mcp.vercel.com',
    description: 'Vercel MCP server for project and deployment operations',
    auth: { type: 'oauth2' },
    requiredEnv: ['VERCEL_TOKEN'],
  },
  runtimeDependencies,
  verificationChecks,
  prompt:
    'Use Vercel for deployment logs, domain and project configuration, environment variable review, and Next.js production diagnostics. Ask before changing env vars, domains, project settings, or triggering deployments.',
})

export default attachConnectorRuntimeAssets(plugin, { runtimeDependencies })
