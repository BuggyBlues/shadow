# Task 16: E2E Tests for Plugin System

> **Priority**: P2 (Wave 3 — after all features complete)  
> **Depends on**: All previous tasks (01-15)  
> **Estimated**: ~500 lines  
> **Output**: New test files in `__tests__/` and `e2e/`

## Context

Read first:
- `spec/plugin-system-architecture.md` — Full architecture
- `__tests__/` — Existing unit test patterns
- `e2e/` — Existing Playwright E2E test patterns
- `vitest.config.ts` — Vitest configuration
- `playwright.config.ts` — Playwright configuration

## Objective

Create comprehensive tests for the plugin system, covering:
1. Unit tests for plugin framework
2. Integration tests for the full build pipeline with plugins
3. E2E tests for console plugin pages
4. CLI E2E tests for plugin-related commands

## Deliverables

### 1. Plugin Framework Unit Tests (~100 lines)

#### `__tests__/plugins/registry.test.ts`
```typescript
describe('PluginRegistry', () => {
  it('registers and retrieves plugins by ID')
  it('filters plugins by category')
  it('filters plugins by capability')
  it('searches plugins by name, description, and tags')
  it('returns undefined for unknown plugin ID')
  it('rejects duplicate plugin IDs')
})
```

#### `__tests__/plugins/loader.test.ts`
```typescript
describe('PluginLoader', () => {
  it('discovers plugins from src/plugins/ directories')
  it('validates plugin manifest schema')
  it('rejects invalid manifest (missing required fields)')
  it('loads plugin definition with all hooks')
  it('skips non-plugin directories (types.ts, registry.ts, etc.)')
})
```

#### `__tests__/plugins/config-merger.test.ts`
```typescript
describe('ConfigMerger', () => {
  it('merges channel fragments from multiple plugins')
  it('appends bindings from multiple plugins')
  it('deep merges plugin entries')
  it('resolves agent-specific plugin config')
  it('merges with correct precedence: defaults < global < per-agent')
  it('resolves ${env:VAR} secret references')
  it('resolves ${secret:pluginId/key} references')
})
```

### 2. Plugin Build Pipeline Integration Tests (~100 lines)

#### `__tests__/config/plugin-pipeline.test.ts`
```typescript
describe('Plugin Build Pipeline', () => {
  it('calls plugin hooks during buildOpenClawConfig')
  it('merges plugin fragments into final OpenClaw config')
  it('collects env vars from all plugins')
  it('validates all plugins before build')
  it('skips disabled plugins')
  it('warns on unknown plugins (does not throw)')
  it('handles plugin with no hooks gracefully')
  
  // Integration: full config → OpenClaw config with plugins
  it('builds correct config with shadowob + slack + github plugins', () => {
    const config = {
      plugins: {
        shadowob: { enabled: true, config: { servers: [...], bindings: [...] } },
        slack: { enabled: true, config: { channels: ['#general'] } },
        github: { enabled: true, config: { org: 'test', repos: ['repo'] } },
      },
      deployments: { agents: [{ id: 'assistant', ... }] },
    }
    const result = buildOpenClawConfig(agent, config)
    expect(result.channels.shadow).toBeDefined()
    expect(result.channels.slack).toBeDefined()
    expect(result.plugins.entries.github).toBeDefined()
  })
})
```

### 3. Secret Management Unit Tests (~80 lines)

#### `__tests__/secrets/store.test.ts`
```typescript
describe('SecretStore', () => {
  it('creates secret store with encrypted file')
  it('sets and gets secrets round-trip')
  it('lists secret groups correctly')
  it('marks groups complete when all required keys are set')
  it('deletes secrets for a plugin')
  it('file is encrypted at rest (not readable as JSON)')
})
```

#### `__tests__/secrets/k8s-sync.test.ts`
```typescript
describe('K8s Secret Sync', () => {
  it('generates K8s Secret manifest per plugin')
  it('includes all secret key-value pairs in manifest')
  it('uses correct naming: shadow-cloud-{pluginId}-secrets')
  it('resolves ${env:VAR} references')
})
```

### 4. Console E2E Tests (~120 lines)

#### `e2e/plugins.spec.ts`
```typescript
import { test, expect } from '@playwright/test'

test.describe('Plugin Marketplace', () => {
  test('displays all available plugins', async ({ page }) => {
    await page.goto('/plugins')
    // Check plugin cards are rendered
    await expect(page.getByText('Slack')).toBeVisible()
    await expect(page.getByText('GitHub')).toBeVisible()
  })

  test('filters plugins by category', async ({ page }) => {
    await page.goto('/plugins')
    await page.getByRole('tab', { name: 'Communication' }).click()
    await expect(page.getByText('Slack')).toBeVisible()
    await expect(page.getByText('Discord')).toBeVisible()
    // Non-communication plugins should be hidden
    await expect(page.getByText('Stripe')).not.toBeVisible()
  })

  test('searches plugins', async ({ page }) => {
    await page.goto('/plugins')
    await page.getByPlaceholder('Search').fill('slack')
    await expect(page.getByText('Slack')).toBeVisible()
    // Other plugins should be filtered out
  })

  test('navigates to plugin detail', async ({ page }) => {
    await page.goto('/plugins')
    await page.getByText('Slack').click()
    await expect(page).toHaveURL(/\/plugins\/slack/)
    await expect(page.getByText('Bot Token')).toBeVisible()
  })
})

test.describe('Plugin Detail Page', () => {
  test('shows plugin setup form', async ({ page }) => {
    await page.goto('/plugins/slack')
    await expect(page.getByText('Authentication')).toBeVisible()
    await expect(page.getByLabel('Bot Token')).toBeVisible()
  })

  test('shows configuration tab', async ({ page }) => {
    await page.goto('/plugins/slack')
    await page.getByRole('tab', { name: 'Configuration' }).click()
    await expect(page.getByLabel('Default Channel')).toBeVisible()
  })
})

test.describe('Secrets Manager', () => {
  test('displays secret groups', async ({ page }) => {
    await page.goto('/secrets')
    // Should show plugin names and their secret status
    await expect(page.getByText('Secrets Manager')).toBeVisible()
  })
})
```

### 5. Console Enhancement E2E Tests (~50 lines)

#### `e2e/console-enhancements.spec.ts`
```typescript
test.describe('Team Visualization', () => {
  test('renders agent-plugin graph', async ({ page }) => {
    await page.goto('/team')
    await expect(page.getByText('Team Visualization')).toBeVisible()
    // Check SVG is rendered
    await expect(page.locator('svg')).toBeVisible()
  })
})

test.describe('Kanban Board', () => {
  test('shows deployment columns', async ({ page }) => {
    await page.goto('/kanban')
    await expect(page.getByText('Kanban Board')).toBeVisible()
    await expect(page.getByText('Running')).toBeVisible()
  })
})

test.describe('Config Export', () => {
  test('generates export preview', async ({ page }) => {
    await page.goto('/export')
    await expect(page.getByText('Export Configuration')).toBeVisible()
  })
})
```

### 6. CLI E2E Tests (~50 lines)

#### Updates to `__tests__/cli/` tests

Update existing CLI tests to verify:
- `shadowob-cloud console` command starts the console (renamed from dashboard)
- Plugin-related API endpoints respond correctly
- Template init uses new plugin format

```typescript
// In existing CLI test suite, add:
test('plugin API returns available plugins', async () => {
  const res = await fetch(`http://localhost:${port}/api/plugins`)
  expect(res.ok).toBe(true)
  const plugins = await res.json()
  expect(plugins.length).toBeGreaterThan(0)
  expect(plugins.find(p => p.id === 'shadowob')).toBeDefined()
})

test('secret API requires authentication', async () => {
  const res = await fetch(`http://localhost:${port}/api/secrets`)
  expect(res.status).toBe(401)
})
```

## Test Configuration

- **Unit tests**: Run with `vitest` (existing config)
- **E2E tests**: Run with Playwright (existing config)
- **Console E2E**: Requires built console (`pnpm console:build`) + running server
- **CI**: Add plugin tests to existing CI E2E pipeline

## Acceptance Criteria

1. All unit tests for plugins, registry, loader, config-merger, secrets pass
2. Integration test proves full build pipeline with multiple plugins works
3. Console E2E tests for /plugins, /plugins/:id, /secrets pass
4. Console enhancement E2E tests for /team, /kanban, /export pass
5. CLI E2E tests for plugin API endpoints pass
6. All tests run in CI (existing CI config)
7. No regressions in existing 194 unit tests + 100 CLI E2E tests

## Files Created

```
__tests__/plugins/registry.test.ts
__tests__/plugins/loader.test.ts
__tests__/plugins/config-merger.test.ts
__tests__/config/plugin-pipeline.test.ts
__tests__/secrets/store.test.ts
__tests__/secrets/k8s-sync.test.ts
e2e/plugins.spec.ts
e2e/console-enhancements.spec.ts
```

## Files Modified

```
__tests__/cli/*.test.ts   — Add plugin API tests (minor additions)
```
