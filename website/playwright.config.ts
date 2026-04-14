import { defineConfig } from '@playwright/test'

const WEBSITE_PORT = 3001
const webServerCommand = process.env.CI
  ? `pnpm exec rspress build && pnpm exec rspress preview --host 0.0.0.0 --port ${WEBSITE_PORT}`
  : `pnpm exec rspress dev --host 0.0.0.0 --port ${WEBSITE_PORT}`

export default defineConfig({
  testDir: './e2e',
  timeout: 30_000,
  expect: {
    timeout: 10_000,
  },
  fullyParallel: true,
  retries: 1,
  reporter: [['list'], ['html', { open: 'never', outputFolder: 'playwright-report' }]],
  use: {
    baseURL: `http://localhost:${WEBSITE_PORT}`,
    trace: 'on-first-retry',
  },
  outputDir: 'test-results',
  webServer: {
    command: webServerCommand,
    port: WEBSITE_PORT,
    reuseExistingServer: !process.env.CI,
    timeout: process.env.CI ? 180_000 : 60_000,
  },
})
