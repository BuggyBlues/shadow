import { type ElectronApplication, expect, type Page, test } from '@playwright/test'
import { launchDesktopApp } from '../helpers'

let app: ElectronApplication
let page: Page

test.beforeAll(async () => {
  ;({ app, page } = await launchDesktopApp())
})

test.afterAll(async () => {
  await app?.close()
})

test('desktopAPI is exposed to renderer', async () => {
  const hasAPI = await page.evaluate(() => 'desktopAPI' in window)
  expect(hasAPI).toBe(true)
})

test('desktopAPI.isDesktop is true', async () => {
  const isDesktop = await page.evaluate(() => (window as any).desktopAPI.isDesktop)
  expect(isDesktop).toBe(true)
})

test('desktopAPI.platform is valid', async () => {
  const platform = await page.evaluate(() => (window as any).desktopAPI.platform)
  expect(['darwin', 'win32', 'linux']).toContain(platform)
})

test('desktopAPI exposes notification methods', async () => {
  const methods = await page.evaluate(() => {
    const api = (window as any).desktopAPI
    return {
      showNotification: typeof api.showNotification,
      setBadgeCount: typeof api.setBadgeCount,
      setNotificationMode: typeof api.setNotificationMode,
    }
  })
  expect(methods.showNotification).toBe('function')
  expect(methods.setBadgeCount).toBe('function')
  expect(methods.setNotificationMode).toBe('function')
})

test('desktopAPI exposes window methods', async () => {
  const methods = await page.evaluate(() => {
    const api = (window as any).desktopAPI
    return {
      minimizeToTray: typeof api.minimizeToTray,
    }
  })
  expect(methods.minimizeToTray).toBe('function')
})

test('desktopAPI exposes buddy management methods', async () => {
  const methods = await page.evaluate(() => {
    const api = (window as any).desktopAPI
    return {
      startBuddy: typeof api.startBuddy,
      stopBuddy: typeof api.stopBuddy,
      getBuddyStatus: typeof api.getBuddyStatus,
      listBuddies: typeof api.listBuddies,
    }
  })
  expect(methods.startBuddy).toBe('function')
  expect(methods.stopBuddy).toBe('function')
  expect(methods.getBuddyStatus).toBe('function')
  expect(methods.listBuddies).toBe('function')
})

test('desktopAPI exposes event listener methods', async () => {
  const methods = await page.evaluate(() => {
    const api = (window as any).desktopAPI
    return {
      onNavigateToChannel: typeof api.onNavigateToChannel,
      onBuddyMessage: typeof api.onBuddyMessage,
      onBuddyExited: typeof api.onBuddyExited,
    }
  })
  expect(methods.onNavigateToChannel).toBe('function')
  expect(methods.onBuddyMessage).toBe('function')
  expect(methods.onBuddyExited).toBe('function')
})
