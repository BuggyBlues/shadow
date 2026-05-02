import {
  attachConnectorRuntimeAssets,
  connectorField,
  connectorManifest,
  installedCheck,
  npmGlobalDependency,
} from '../connector-kit.js'
import { defineConnectorPlugin } from '../helpers.js'

const manifest = connectorManifest({
  id: 'browserbase',
  name: 'Browserbase',
  description:
    'Browserbase BrowserOps provides cloud browser sessions, Stagehand-style web automation, extraction flows, QA runs, and persistent browser debugging.',
  category: 'automation',
  icon: 'globe',
  website: 'https://www.browserbase.com',
  docs: 'https://docs.browserbase.com/integrations/mcp/introduction',
  fields: [
    connectorField('BROWSERBASE_API_KEY', 'Browserbase API key', {
      description: 'API key for Browserbase sessions and MCP automation.',
      placeholder: 'bb_...',
      helpUrl: 'https://www.browserbase.com/settings/api',
    }),
    connectorField('BROWSERBASE_PROJECT_ID', 'Project ID', {
      description: 'Default Browserbase project.',
      sensitive: false,
      placeholder: 'project id',
    }),
  ],
  capabilities: ['tool', 'data-source', 'action', 'cli', 'mcp'],
  tags: ['browserbase', 'stagehand', 'browser', 'automation', 'cloud-browser', 'mcp'],
  popularity: 84,
})

const runtimeDependencies = [
  npmGlobalDependency(
    'mcp-server-browserbase',
    ['@browserbasehq/mcp-server-browserbase'],
    'Browserbase MCP server',
  ),
]

const plugin = defineConnectorPlugin(manifest, {
  mcp: {
    id: 'browserbase-mcp',
    transport: 'stdio',
    command: 'npx',
    args: ['-y', '@browserbasehq/mcp-server-browserbase@latest'],
    description: 'Browserbase MCP server for cloud browser automation',
    requiredEnv: ['BROWSERBASE_API_KEY', 'BROWSERBASE_PROJECT_ID'],
  },
  runtimeDependencies,
  verificationChecks: [
    installedCheck('browserbase-mcp-installed', 'Browserbase MCP server installed', [
      'mcp-server-browserbase',
      '--help',
    ]),
  ],
  prompt:
    'Use Browserbase for cloud browser sessions, web extraction, QA runs, persistent debugging, and browser automation at scale. Confirm before submitting forms, publishing content, or using paid browser sessions.',
})

export default attachConnectorRuntimeAssets(plugin, { runtimeDependencies })
