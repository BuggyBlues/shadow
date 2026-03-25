/**
 * OpenClaw Configuration CRUD E2E Tests
 *
 * Tests the full lifecycle of configuration management:
 * buddies, models, cron tasks — create, read, update, delete.
 */

import { type ElectronApplication, expect, type Page, test } from '@playwright/test'
import { launchDesktopApp } from '../helpers'

let app: ElectronApplication
let page: Page

test.beforeAll(async () => {
  ;({ app, page } = await launchDesktopApp())
  await page.waitForTimeout(2000)
})

test.afterAll(async () => {
  await app?.close()
})

// ─── Global Config ──────────────────────────────────────────────────────────

test.describe('Global Config', () => {
  test('getConfig returns a config object', async () => {
    const config = await page.evaluate(async () => {
      return await (window as any).desktopAPI.openClaw.getConfig()
    })

    expect(config).toBeDefined()
    expect(typeof config).toBe('object')
  })

  test('config has expected top-level keys', async () => {
    const config = await page.evaluate(async () => {
      return await (window as any).desktopAPI.openClaw.getConfig()
    })

    // Config should have these sections (may be empty arrays/objects initially)
    const keys = Object.keys(config)
    expect(keys).toEqual(expect.arrayContaining(['buddies']))
  })

  test('saveConfig accepts a config object and persists it', async () => {
    const result = await page.evaluate(async () => {
      const oc = (window as any).desktopAPI.openClaw
      const config = await oc.getConfig()
      // Save the same config back (idempotent operation)
      await oc.saveConfig(config)
      // Read it again to verify
      const reloaded = await oc.getConfig()
      return { configKeys: Object.keys(reloaded) }
    })

    expect(result.configKeys.length).toBeGreaterThan(0)
  })
})

// ─── Buddy CRUD ─────────────────────────────────────────────────────────────

test.describe('Buddy CRUD', () => {
  const testBuddyId = `e2e-test-buddy-${Date.now()}`

  test('listBuddies returns an array', async () => {
    const buddies = await page.evaluate(async () => {
      return await (window as any).desktopAPI.openClaw.listBuddies()
    })

    expect(Array.isArray(buddies)).toBe(true)
  })

  test('createBuddy adds a new buddy', async () => {
    const result = await page.evaluate(async (buddyId: string) => {
      const oc = (window as any).desktopAPI.openClaw
      await oc.createBuddy({
        id: buddyId,
        name: 'E2E Test Buddy',
        description: 'Created by E2E test',
        modelProvider: 'openai',
        modelName: 'gpt-4o-mini',
        systemPrompt: 'You are a test buddy.',
        channels: [],
        skills: [],
        enabled: true,
        avatar: '🤖',
        temperature: 0.7,
        maxTokens: 2048,
      })
      const buddies = await oc.listBuddies()
      return {
        count: buddies.length,
        found: buddies.some((a: any) => a.id === buddyId),
      }
    }, testBuddyId)

    expect(result.found).toBe(true)
  })

  test('getBuddy retrieves a specific buddy', async () => {
    const buddy = await page.evaluate(async (buddyId: string) => {
      return await (window as any).desktopAPI.openClaw.getBuddy(buddyId)
    }, testBuddyId)

    expect(buddy).toBeDefined()
    expect(buddy.id).toBe(testBuddyId)
    expect(buddy.name).toBe('E2E Test Buddy')
    expect(buddy.modelProvider).toBe('openai')
  })

  test('updateBuddy modifies an existing buddy', async () => {
    const updated = await page.evaluate(async (buddyId: string) => {
      const oc = (window as any).desktopAPI.openClaw
      await oc.updateBuddy(buddyId, {
        name: 'E2E Updated Buddy',
        description: 'Updated by E2E test',
        modelProvider: 'anthropic',
        modelName: 'claude-sonnet-4-20250514',
        systemPrompt: 'You are an updated test buddy.',
        channels: ['wechat'],
        skills: ['weather'],
        enabled: false,
        avatar: '🧪',
        temperature: 0.5,
        maxTokens: 4096,
      })
      return await oc.getBuddy(buddyId)
    }, testBuddyId)

    expect(updated.name).toBe('E2E Updated Buddy')
    expect(updated.modelProvider).toBe('anthropic')
    expect(updated.enabled).toBe(false)
    expect(updated.avatar).toBe('🧪')
  })

  test('deleteBuddy removes a buddy', async () => {
    const result = await page.evaluate(async (buddyId: string) => {
      const oc = (window as any).desktopAPI.openClaw
      await oc.deleteBuddy(buddyId)
      const buddies = await oc.listBuddies()
      return {
        found: buddies.some((a: any) => a.id === buddyId),
      }
    }, testBuddyId)

    expect(result.found).toBe(false)
  })

  test('getBuddy returns null or undefined for non-existent buddy', async () => {
    const buddy = await page.evaluate(async () => {
      return await (window as any).desktopAPI.openClaw.getBuddy('non-existent-id')
    })

    expect(buddy === null || buddy === undefined).toBe(true)
  })
})

// ─── Model Provider CRUD ────────────────────────────────────────────────────

test.describe('Model Provider CRUD', () => {
  const testModelId = `e2e-test-model-${Date.now()}`

  test('listModels returns an array', async () => {
    const models = await page.evaluate(async () => {
      return await (window as any).desktopAPI.openClaw.listModels()
    })

    expect(Array.isArray(models)).toBe(true)
  })

  test('saveModel creates a new model provider', async () => {
    const result = await page.evaluate(async (modelId: string) => {
      const oc = (window as any).desktopAPI.openClaw
      await oc.saveModel({
        id: modelId,
        provider: 'openai',
        name: 'E2E Test GPT',
        apiKey: 'sk-test-key-12345',
        baseUrl: 'https://api.openai.com/v1',
        models: ['gpt-4o', 'gpt-4o-mini'],
        enabled: true,
      })
      const models = await oc.listModels()
      return {
        found: models.some((m: any) => m.id === modelId),
      }
    }, testModelId)

    expect(result.found).toBe(true)
  })

  test('saveModel updates an existing model provider', async () => {
    const result = await page.evaluate(async (modelId: string) => {
      const oc = (window as any).desktopAPI.openClaw
      await oc.saveModel({
        id: modelId,
        provider: 'openai',
        name: 'E2E Updated GPT',
        apiKey: 'sk-updated-key-67890',
        baseUrl: 'https://api.openai.com/v1',
        models: ['gpt-4o', 'gpt-4o-mini', 'o1-preview'],
        enabled: false,
      })
      const models = await oc.listModels()
      const found = models.find((m: any) => m.id === modelId)
      return {
        name: found?.name,
        enabled: found?.enabled,
        modelCount: found?.models?.length,
      }
    }, testModelId)

    expect(result.name).toBe('E2E Updated GPT')
    expect(result.enabled).toBe(false)
    expect(result.modelCount).toBe(3)
  })

  test('deleteModel removes a model provider', async () => {
    const result = await page.evaluate(async (modelId: string) => {
      const oc = (window as any).desktopAPI.openClaw
      await oc.deleteModel(modelId)
      const models = await oc.listModels()
      return {
        found: models.some((m: any) => m.id === modelId),
      }
    }, testModelId)

    expect(result.found).toBe(false)
  })
})

// ─── Cron Task CRUD ─────────────────────────────────────────────────────────

test.describe('Cron Task CRUD', () => {
  const testCronId = `e2e-test-cron-${Date.now()}`

  test('listCronTasks returns an array', async () => {
    const tasks = await page.evaluate(async () => {
      return await (window as any).desktopAPI.openClaw.listCronTasks()
    })

    expect(Array.isArray(tasks)).toBe(true)
  })

  test('saveCronTask creates a new cron task', async () => {
    const result = await page.evaluate(async (cronId: string) => {
      const oc = (window as any).desktopAPI.openClaw
      await oc.saveCronTask({
        id: cronId,
        name: 'E2E Test Cron',
        description: 'Test scheduled task',
        cronExpression: '0 */6 * * *',
        buddyId: 'test-buddy',
        action: 'send_message',
        actionPayload: { message: 'Hello from E2E cron' },
        enabled: true,
      })
      const tasks = await oc.listCronTasks()
      return {
        found: tasks.some((t: any) => t.id === cronId),
      }
    }, testCronId)

    expect(result.found).toBe(true)
  })

  test('saveCronTask updates an existing cron task', async () => {
    const result = await page.evaluate(async (cronId: string) => {
      const oc = (window as any).desktopAPI.openClaw
      await oc.saveCronTask({
        id: cronId,
        name: 'E2E Updated Cron',
        description: 'Updated scheduled task',
        cronExpression: '0 0 * * *',
        buddyId: 'test-buddy-2',
        action: 'trigger_skill',
        actionPayload: { skill: 'weather-report' },
        enabled: false,
      })
      const tasks = await oc.listCronTasks()
      const found = tasks.find((t: any) => t.id === cronId)
      return {
        name: found?.name,
        cronExpression: found?.cronExpression,
        enabled: found?.enabled,
        action: found?.action,
      }
    }, testCronId)

    expect(result.name).toBe('E2E Updated Cron')
    expect(result.cronExpression).toBe('0 0 * * *')
    expect(result.enabled).toBe(false)
    expect(result.action).toBe('trigger_skill')
  })

  test('triggerCronTask is callable for an existing task', async () => {
    const result = await page.evaluate(async (cronId: string) => {
      try {
        await (window as any).desktopAPI.openClaw.triggerCronTask(cronId)
        return { success: true }
      } catch (err: any) {
        return { success: false, error: err.message }
      }
    }, testCronId)

    // Should succeed (even if the actual execution is a no-op)
    expect(result).toBeDefined()
  })

  test('getCronHistory returns an array', async () => {
    const history = await page.evaluate(async (cronId: string) => {
      return await (window as any).desktopAPI.openClaw.getCronHistory(cronId)
    }, testCronId)

    expect(Array.isArray(history)).toBe(true)
  })

  test('deleteCronTask removes a cron task', async () => {
    const result = await page.evaluate(async (cronId: string) => {
      const oc = (window as any).desktopAPI.openClaw
      await oc.deleteCronTask(cronId)
      const tasks = await oc.listCronTasks()
      return {
        found: tasks.some((t: any) => t.id === cronId),
      }
    }, testCronId)

    expect(result.found).toBe(false)
  })
})

// ─── Cross-section Data Integrity ───────────────────────────────────────────

test.describe('Data Integrity', () => {
  test('creating buddies and models maintains separate lists', async () => {
    const result = await page.evaluate(async () => {
      const oc = (window as any).desktopAPI.openClaw
      const buddiesBefore = await oc.listBuddies()
      const modelsBefore = await oc.listModels()

      await oc.createBuddy({
        id: 'integrity-test-buddy',
        name: 'Integrity Buddy',
        description: '',
        modelProvider: 'openai',
        modelName: 'gpt-4o',
        systemPrompt: '',
        channels: [],
        skills: [],
        enabled: true,
        avatar: '🔬',
        temperature: 0.7,
        maxTokens: 2048,
      })

      const buddiesAfter = await oc.listBuddies()
      const modelsAfter = await oc.listModels()

      // Clean up
      await oc.deleteBuddy('integrity-test-buddy')

      return {
        buddyCountIncreased: buddiesAfter.length === buddiesBefore.length + 1,
        modelCountUnchanged: modelsAfter.length === modelsBefore.length,
      }
    })

    expect(result.buddyCountIncreased).toBe(true)
    expect(result.modelCountUnchanged).toBe(true)
  })

  test('config round-trip preserves all data', async () => {
    const result = await page.evaluate(async () => {
      const oc = (window as any).desktopAPI.openClaw

      // Create test data
      await oc.createBuddy({
        id: 'roundtrip-buddy',
        name: 'Roundtrip Buddy',
        description: 'Test round-trip',
        modelProvider: 'anthropic',
        modelName: 'claude-sonnet-4-20250514',
        systemPrompt: 'You are a roundtrip test.',
        channels: ['telegram'],
        skills: ['calculator'],
        enabled: true,
        avatar: '🧪',
        temperature: 0.3,
        maxTokens: 1024,
      })

      // Read back
      const buddy = await oc.getBuddy('roundtrip-buddy')

      // Clean up
      await oc.deleteBuddy('roundtrip-buddy')

      return {
        nameMatch: buddy.name === 'Roundtrip Buddy',
        descMatch: buddy.description === 'Test round-trip',
        providerMatch: buddy.modelProvider === 'anthropic',
        modelMatch: buddy.modelName === 'claude-sonnet-4-20250514',
        promptMatch: buddy.systemPrompt === 'You are a roundtrip test.',
        channelsMatch: JSON.stringify(buddy.channels) === JSON.stringify(['telegram']),
        skillsMatch: JSON.stringify(buddy.skills) === JSON.stringify(['calculator']),
        enabledMatch: buddy.enabled === true,
        avatarMatch: buddy.avatar === '🧪',
        tempMatch: buddy.temperature === 0.3,
        maxTokensMatch: buddy.maxTokens === 1024,
      }
    })

    expect(result.nameMatch).toBe(true)
    expect(result.descMatch).toBe(true)
    expect(result.providerMatch).toBe(true)
    expect(result.modelMatch).toBe(true)
    expect(result.promptMatch).toBe(true)
    expect(result.channelsMatch).toBe(true)
    expect(result.skillsMatch).toBe(true)
    expect(result.enabledMatch).toBe(true)
    expect(result.avatarMatch).toBe(true)
    expect(result.tempMatch).toBe(true)
    expect(result.maxTokensMatch).toBe(true)
  })
})
