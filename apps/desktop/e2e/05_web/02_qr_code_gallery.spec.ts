import { expect, test } from '@playwright/test'
import { loginViaApi } from '../helpers'

test.describe('QR Code Gallery', () => {
  test('QR Scanner modal - upload and scan', async ({ page }) => {
    // Login first
    await loginViaApi(page)

    // Navigate to main page
    await page.goto('/app/')
    await page.waitForLoadState('networkidle')

    // Click QR scanner button (in server sidebar)
    const qrScannerButton = page
      .locator('button[title*="Scan QR"], button[title*="扫描二维码"]')
      .first()
    await expect(qrScannerButton).toBeVisible()
    await qrScannerButton.click()

    // Wait for scanner modal to appear
    const scannerModal = page
      .locator('.fixed.inset-0.z-50')
      .filter({ hasText: /Scan QR|扫描二维码/ })
      .first()
    await expect(scannerModal).toBeVisible()

    // Verify upload area is present
    const uploadArea = scannerModal.locator('text=/Drag and drop|拖放/').first()
    await expect(uploadArea).toBeVisible()

    // Screenshot the QR scanner modal
    await expect(scannerModal).toHaveScreenshot('qr-scanner-modal.png', {
      maxDiffPixels: 100,
    })

    // Close modal
    const closeButton = scannerModal
      .locator('button')
      .filter({ has: page.locator('svg') })
      .first()
    await closeButton.click()
    await expect(scannerModal).not.toBeVisible()
  })

  test('User Profile QR Poster - generate and download', async ({ page }) => {
    await loginViaApi(page)
    await page.goto('/app/')
    await page.waitForLoadState('networkidle')

    // Navigate to user profile
    const userAvatar = page.locator('.rounded-full').first()
    await userAvatar.click()

    // Wait for profile menu and click profile/settings
    await page.waitForTimeout(500)

    // Navigate to profile page
    await page.goto('/app/profile/me')
    await page.waitForLoadState('networkidle')

    // Click "My QR Card" button
    const qrCardButton = page
      .locator('button')
      .filter({ hasText: /QR|名片/ })
      .first()
    await expect(qrCardButton).toBeVisible()
    await qrCardButton.click()

    // Wait for QR poster modal
    const posterModal = page
      .locator('.fixed.inset-0.z-50')
      .filter({ hasText: /QR Code Poster|二维码名片/ })
      .first()
    await expect(posterModal).toBeVisible()

    // Wait for canvas generation
    await page.waitForTimeout(2000)

    // Verify poster image is generated
    const posterImage = posterModal.locator('img[alt*="QR Poster"]').first()
    await expect(posterImage).toBeVisible()

    // Screenshot the QR poster modal
    await expect(posterModal).toHaveScreenshot('qr-poster-user.png', {
      maxDiffPixels: 100,
    })

    // Close modal
    const closeButton = posterModal
      .locator('button')
      .filter({ has: page.locator('svg') })
      .first()
    await closeButton.click()
    await expect(posterModal).not.toBeVisible()
  })

  test('Server QR Poster - generate from server settings', async ({ page }) => {
    await loginViaApi(page)
    await page.goto('/app/')
    await page.waitForLoadState('networkidle')

    // Click on first server
    const serverButton = page.locator('.group\\/server button').first()
    await serverButton.click()
    await page.waitForTimeout(1000)

    // Open server settings (gear icon)
    const settingsButton = page
      .locator('button[title*="Settings"], button svg[data-lucide="settings"]')
      .first()
    if (await settingsButton.isVisible()) {
      await settingsButton.click()
      await page.waitForTimeout(500)

      // Click on QR poster button in invite section
      const qrPosterButton = page
        .locator('button')
        .filter({ hasText: /QR|二维码名片/ })
        .first()
      if (await qrPosterButton.isVisible()) {
        await qrPosterButton.click()

        // Wait for QR poster modal
        const posterModal = page
          .locator('.fixed.inset-0.z-50')
          .filter({ hasText: /QR Code Poster|二维码名片/ })
          .first()
        await expect(posterModal).toBeVisible()

        // Wait for canvas generation
        await page.waitForTimeout(2000)

        // Screenshot the server QR poster
        await expect(posterModal).toHaveScreenshot('qr-poster-server.png', {
          maxDiffPixels: 100,
        })

        // Close modal
        const closeButton = posterModal
          .locator('button')
          .filter({ has: page.locator('svg') })
          .first()
        await closeButton.click()
        await expect(posterModal).not.toBeVisible()
      }
    }
  })

  test('Channel QR Poster - generate from channel context menu', async ({ page }) => {
    await loginViaApi(page)
    await page.goto('/app/')
    await page.waitForLoadState('networkidle')

    // Click on first server
    const serverButton = page.locator('.group\\/server button').first()
    await serverButton.click()
    await page.waitForTimeout(1000)

    // Right click on first channel
    const channelItem = page.locator('[data-channel-id]').first()
    if (await channelItem.isVisible()) {
      await channelItem.click({ button: 'right' })
      await page.waitForTimeout(500)

      // Click on QR poster option in context menu
      const qrMenuItem = page
        .locator('[role="menuitem"]')
        .filter({ hasText: /QR|二维码名片/ })
        .first()
      if (await qrMenuItem.isVisible()) {
        await qrMenuItem.click()

        // Wait for QR poster modal
        const posterModal = page
          .locator('.fixed.inset-0.z-50')
          .filter({ hasText: /QR Code Poster|二维码名片/ })
          .first()
        await expect(posterModal).toBeVisible()

        // Wait for canvas generation
        await page.waitForTimeout(2000)

        // Screenshot the channel QR poster
        await expect(posterModal).toHaveScreenshot('qr-poster-channel.png', {
          maxDiffPixels: 100,
        })

        // Close modal
        const closeButton = posterModal
          .locator('button')
          .filter({ has: page.locator('svg') })
          .first()
        await closeButton.click()
        await expect(posterModal).not.toBeVisible()
      }
    }
  })

  test('QR code reset functionality', async ({ page }) => {
    await loginViaApi(page)
    await page.goto('/app/')
    await page.waitForLoadState('networkidle')

    // Navigate to user profile
    await page.goto('/app/profile/me')
    await page.waitForLoadState('networkidle')

    // Open QR poster
    const qrCardButton = page
      .locator('button')
      .filter({ hasText: /QR|名片/ })
      .first()
    await expect(qrCardButton).toBeVisible()
    await qrCardButton.click()

    // Wait for QR poster modal
    const posterModal = page
      .locator('.fixed.inset-0.z-50')
      .filter({ hasText: /QR Code Poster|二维码名片/ })
      .first()
    await expect(posterModal).toBeVisible()

    // Wait for canvas generation
    await page.waitForTimeout(2000)

    // Click reset button
    const resetButton = posterModal
      .locator('button')
      .filter({ hasText: /Reset|重置/ })
      .first()
    if (await resetButton.isVisible()) {
      await resetButton.click()
      await page.waitForTimeout(1000)

      // Verify poster is regenerated (new QR code)
      await expect(posterModal).toHaveScreenshot('qr-poster-reset.png', {
        maxDiffPixels: 100,
      })
    }

    // Close modal
    const closeButton = posterModal
      .locator('button')
      .filter({ has: page.locator('svg') })
      .first()
    await closeButton.click()
    await expect(posterModal).not.toBeVisible()
  })
})
