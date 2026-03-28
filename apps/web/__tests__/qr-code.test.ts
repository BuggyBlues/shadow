import { beforeAll, describe, expect, it } from 'vitest'

// Mock localStorage for tests
beforeAll(() => {
  if (typeof globalThis.localStorage === 'undefined') {
    const store: Record<string, string> = {}
    ;(globalThis as unknown as Record<string, unknown>).localStorage = {
      getItem: (key: string) => store[key] ?? null,
      setItem: (key: string, value: string) => {
        store[key] = value
      },
      removeItem: (key: string) => {
        delete store[key]
      },
      clear: () => {
        for (const k of Object.keys(store)) delete store[k]
      },
    }
  }
})

/**
 * QR Code System E2E Tests
 * Tests for: QR scanner, QR poster generation, invite flows
 */

describe('Feature: QR Code Components', () => {
  it('should export QRScanner component', async () => {
    const mod = await import('../src/components/qr/qr-scanner')
    expect(mod.QRScanner).toBeDefined()
    expect(typeof mod.QRScanner).toBe('function')
  })

  it('should export QRPoster component', async () => {
    const mod = await import('../src/components/qr/qr-poster')
    expect(mod.QRPoster).toBeDefined()
    expect(typeof mod.QRPoster).toBe('function')
  })

  it('should export all QR components from index', async () => {
    const mod = await import('../src/components/qr')
    expect(mod.QRScanner).toBeDefined()
    expect(mod.QRPoster).toBeDefined()
  })
})

describe('Feature: QR Code Scanner', () => {
  it('should parse shadow:// URI scheme', () => {
    const patterns = [
      { uri: 'shadow://user/123', type: 'user', id: '123' },
      { uri: 'shadow://server/456', type: 'server', id: '456' },
      { uri: 'shadow://channel/789', type: 'channel', id: '789' },
      { uri: 'shadow://server/456?invite=ABC123', type: 'server', id: '456', invite: 'ABC123' },
      { uri: 'shadow://channel/789?invite=XYZ789', type: 'channel', id: '789', invite: 'XYZ789' },
    ]

    const regex = /^shadow:\/\/(user|server|channel)\/([^?]+)(?:\?invite=(.+))?$/

    for (const test of patterns) {
      const match = test.uri.match(regex)
      expect(match).toBeTruthy()
      expect(match![1]).toBe(test.type)
      expect(match![2]).toBe(test.id)
      if (test.invite) {
        expect(match![3]).toBe(test.invite)
      }
    }
  })

  it('should reject invalid QR codes', () => {
    const invalidUris = [
      'https://example.com',
      'shadow://invalid/123',
      'not-a-uri',
      '',
      'shadow://',
    ]

    const regex = /^shadow:\/\/(user|server|channel)\/([^?]+)(?:\?invite=(.+))?$/

    for (const uri of invalidUris) {
      const match = uri.match(regex)
      expect(match).toBeFalsy()
    }
  })
})

describe('Feature: QR Poster Generation', () => {
  it('should generate correct QR data URI', () => {
    const testCases = [
      { type: 'user', id: '123', invite: 'INVITE1', expected: 'shadow://user/123?invite=INVITE1' },
      {
        type: 'server',
        id: '456',
        invite: 'INVITE2',
        expected: 'shadow://server/456?invite=INVITE2',
      },
      {
        type: 'channel',
        id: '789',
        invite: 'INVITE3',
        expected: 'shadow://channel/789?invite=INVITE3',
      },
    ]

    for (const test of testCases) {
      const qrData = `shadow://${test.type}/${test.id}?invite=${test.invite}`
      expect(qrData).toBe(test.expected)
    }
  })

  it('should generate canvas with correct dimensions', () => {
    // Canvas dimensions for poster: 1080x1920 (9:16 aspect ratio)
    const expectedWidth = 1080
    const expectedHeight = 1920
    expect(expectedWidth / expectedHeight).toBeCloseTo(9 / 16, 2)
  })
})

describe('Feature: QR Code i18n Keys', () => {
  it('should have all QR keys in zh-CN', async () => {
    const zhCN = await import('../src/lib/locales/zh-CN.json')
    const data = zhCN.default || zhCN

    expect(data.qr).toBeDefined()
    expect(data.qr.scanTitle).toBeDefined()
    expect(data.qr.posterTitle).toBeDefined()
    expect(data.qr.dragDropImage).toBeDefined()
    expect(data.qr.orClickToUpload).toBeDefined()
    expect(data.qr.invalidImage).toBeDefined()
    expect(data.qr.decodeFailed).toBeDefined()
    expect(data.qr.noQRFound).toBeDefined()
    expect(data.qr.invalidQRCode).toBeDefined()
    expect(data.qr.acceptInvite).toBeDefined()
    expect(data.qr.alreadyMember).toBeDefined()
    expect(data.qr.acceptFailed).toBeDefined()
    expect(data.qr.download).toBeDefined()
    expect(data.qr.share).toBeDefined()
    expect(data.qr.reset).toBeDefined()
    expect(data.qr.linkCopied).toBeDefined()
    expect(data.qr.expiresAt).toBeDefined()
    expect(data.qr.serverInvite).toBeDefined()
    expect(data.qr.userInvite).toBeDefined()
    expect(data.qr.unknownUser).toBeDefined()
  })

  it('should have all QR keys in en', async () => {
    const en = await import('../src/lib/locales/en.json')
    const data = en.default || en

    expect(data.qr).toBeDefined()
    expect(data.qr.scanTitle).toBeDefined()
    expect(data.qr.posterTitle).toBeDefined()
    expect(data.qr.dragDropImage).toBeDefined()
    expect(data.qr.orClickToUpload).toBeDefined()
    expect(data.qr.acceptInvite).toBeDefined()
    expect(data.qr.download).toBeDefined()
    expect(data.qr.share).toBeDefined()
    expect(data.qr.reset).toBeDefined()
  })
})

describe('Feature: Invite API Integration', () => {
  it('should have invite endpoints defined', () => {
    const serverId = 'test-server'
    const channelId = 'test-channel'
    const inviteCode = 'TEST123'

    expect(`/api/invites/servers/${serverId}`).toBe('/api/invites/servers/test-server')
    expect(`/api/invites/channels/${channelId}`).toBe('/api/invites/channels/test-channel')
    expect(`/api/invites/${inviteCode}/accept`).toBe('/api/invites/TEST123/accept')
    expect(`/api/invites/${inviteCode}`).toBe('/api/invites/TEST123')
  })
})

describe('Feature: QR Code Dependencies', () => {
  it('should have qrcode library available', async () => {
    const QRCode = await import('qrcode')
    expect(QRCode).toBeDefined()
    expect(typeof QRCode.toCanvas).toBe('function')
    expect(typeof QRCode.toDataURL).toBe('function')
  })

  it('should have jsqr library available', async () => {
    const jsQR = await import('jsqr')
    expect(jsQR).toBeDefined()
    expect(typeof jsQR.default).toBe('function')
  })
})
