import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './e2e/05_web',
  timeout: 120_000,
  expect: {
    timeout: 15_000,
  },
  // These specs reuse one seeded session file and mutate overlapping app data.
  // In CI we scale out by sharding isolated docker-compose stacks instead of
  // increasing in-process worker fan-out on a shared runtime.
  fullyParallel: false,
  workers: process.env.CI ? 1 : undefined,
  retries: 1,
  reporter: [['list'], ['html', { open: 'never', outputFolder: 'playwright-report-web' }]],
  use: {
    baseURL: process.env.PLAYWRIGHT_WEB_BASE_URL ?? 'http://127.0.0.1:3000/app/',
    trace: 'on-first-retry',
    viewport: { width: 1600, height: 1000 },
  },
  outputDir: 'test-results/web',
})
