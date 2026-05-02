import {
  attachConnectorRuntimeAssets,
  connectorField,
  connectorManifest,
  installedCheck,
  npmGlobalDependency,
} from '../connector-kit.js'
import { defineConnectorPlugin } from '../helpers.js'

const manifest = connectorManifest({
  id: 'firecrawl',
  name: 'Firecrawl',
  description:
    'Firecrawl BrowserOps supports crawling, search, structured extraction, markdown conversion, competitive monitoring, and web-data pipelines.',
  category: 'search',
  icon: 'flame-kindling',
  website: 'https://www.firecrawl.dev',
  docs: 'https://docs.firecrawl.dev/mcp-server',
  fields: [
    connectorField('FIRECRAWL_API_KEY', 'Firecrawl API key', {
      description: 'API key for Firecrawl crawl, scrape, search, and extraction workflows.',
      placeholder: 'fc-...',
      helpUrl: 'https://docs.firecrawl.dev/api-reference/authentication',
    }),
  ],
  capabilities: ['tool', 'data-source', 'action', 'cli', 'mcp'],
  tags: ['firecrawl', 'scraping', 'crawl', 'search', 'extraction', 'browserops'],
  popularity: 86,
})

const runtimeDependencies = [
  npmGlobalDependency('firecrawl', ['firecrawl-cli', 'firecrawl-mcp'], 'Firecrawl CLI and MCP'),
]

const plugin = defineConnectorPlugin(manifest, {
  cli: [
    {
      name: 'firecrawl',
      command: 'firecrawl',
      description: 'Firecrawl CLI for scraping, crawling, searching, and extraction',
      env: {
        FIRECRAWL_API_KEY: '${env:FIRECRAWL_API_KEY}',
      },
    },
  ],
  mcp: {
    id: 'firecrawl-mcp',
    transport: 'stdio',
    command: 'npx',
    args: ['-y', 'firecrawl-mcp@latest'],
    description: 'Firecrawl MCP server for crawling, search, and extraction',
    requiredEnv: ['FIRECRAWL_API_KEY'],
  },
  runtimeDependencies,
  verificationChecks: [
    installedCheck('firecrawl-cli-installed', 'Firecrawl CLI installed', ['firecrawl', '--help']),
  ],
  prompt:
    'Use Firecrawl for scraping, crawling, search, structured extraction, markdown conversion, and web monitoring. Confirm before crawling large sites, using paid credits, or exporting third-party data.',
})

export default attachConnectorRuntimeAssets(plugin, { runtimeDependencies })
