import {
  attachConnectorRuntimeAssets,
  connectorManifest,
  installedCheck,
  npmGlobalDependency,
} from '../connector-kit.js'
import { defineConnectorPlugin } from '../helpers.js'

const manifest = connectorManifest({
  id: 'playwright',
  name: 'Playwright',
  description:
    'Playwright BrowserOps gives Buddies deterministic browser automation for E2E testing, visual QA, screenshots, trace review, and scripted web workflows.',
  category: 'automation',
  icon: 'panel-top',
  website: 'https://playwright.dev',
  docs: 'https://playwright.dev/docs/mcp',
  fields: [],
  authType: 'none',
  capabilities: ['tool', 'data-source', 'action', 'cli', 'mcp'],
  tags: ['playwright', 'browser', 'e2e', 'screenshots', 'visual-qa', 'mcp'],
  popularity: 90,
})

const runtimeDependencies = [
  npmGlobalDependency('playwright', ['playwright', '@playwright/mcp'], 'Playwright CLI and MCP'),
]

const plugin = defineConnectorPlugin(manifest, {
  cli: [
    {
      name: 'playwright',
      command: 'playwright',
      description: 'Playwright CLI for browser testing, screenshots, traces, and codegen',
    },
  ],
  mcp: {
    id: 'playwright-mcp',
    transport: 'stdio',
    command: 'npx',
    args: ['-y', '@playwright/mcp@latest'],
    description: 'Playwright MCP server for browser automation',
  },
  runtimeDependencies,
  verificationChecks: [
    installedCheck('playwright-cli-installed', 'Playwright CLI installed', [
      'playwright',
      '--version',
    ]),
  ],
  prompt:
    'Use Playwright for browser automation, E2E tests, screenshots, visual QA, trace analysis, and reproducible web workflows. Confirm before submitting forms, publishing content, or changing account state.',
})

export default attachConnectorRuntimeAssets(plugin, { runtimeDependencies })
