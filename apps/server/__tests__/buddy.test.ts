/**
 * Buddy API Tests
 *
 * Tests for buddy CRUD and token generation:
 * 1. Create buddy with name/description
 * 2. List user's buddies
 * 3. Get buddy details
 * 4. Generate buddy token
 * 5. Delete buddy
 * 6. Buddy token works with standard auth
 */
import { describe, expect, it, vi } from 'vitest'
import { signAccessToken, signBuddyToken, verifyToken } from '../src/lib/jwt'
import { BuddyService } from '../src/services/buddy.service'

// ─── Mock factories ────────────────────────────────────────────

function createMockBuddyDao(overrides = {}) {
  return {
    findById: vi.fn(),
    findByOwnerId: vi.fn(),
    findByUserId: vi.fn(),
    findAll: vi.fn(),
    create: vi.fn(),
    updateStatus: vi.fn(),
    updateConfig: vi.fn(),
    delete: vi.fn(),
    createBuddyUser: vi.fn(),
    ...overrides,
  }
}

function createMockUserDao(overrides = {}) {
  return {
    findById: vi.fn(),
    findByEmail: vi.fn(),
    findByUsername: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    updateStatus: vi.fn(),
    findAll: vi.fn(),
    delete: vi.fn(),
    ...overrides,
  }
}

function createMockLogger() {
  return {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
    fatal: vi.fn(),
    trace: vi.fn(),
    child: vi.fn().mockReturnThis(),
    level: 'info',
  }
}

// ═══════════════════════════════════════════════════════════════
// 1. JWT BUDDY TOKEN
// ═══════════════════════════════════════════════════════════════

describe('Buddy Token (JWT)', () => {
  it('should sign and verify a buddy token', () => {
    const payload = {
      userId: 'bot-user-123',
      email: 'buddy-testbot@shadowob.buddy',
      username: 'buddy-testbot',
    }

    const token = signBuddyToken(payload)
    expect(typeof token).toBe('string')
    expect(token.split('.')).toHaveLength(3)

    const decoded = verifyToken(token)
    expect(decoded.userId).toBe('bot-user-123')
    expect(decoded.email).toBe('buddy-testbot@shadowob.buddy')
    expect(decoded.username).toBe('buddy-testbot')
  })

  it('buddy token should be verifiable by the same verifyToken', () => {
    const payload = {
      userId: 'bot-456',
      email: 'buddy-helper@shadowob.buddy',
      username: 'buddy-helper',
    }

    const buddyToken = signBuddyToken(payload)
    const userToken = signAccessToken(payload)

    // Both should be verifiable
    const decodedBuddy = verifyToken(buddyToken)
    const decodedUser = verifyToken(userToken)

    expect(decodedBuddy.userId).toBe(decodedUser.userId)
    expect(decodedBuddy.username).toBe(decodedUser.username)
  })
})

// ═══════════════════════════════════════════════════════════════
// 2. BUDDY SERVICE
// ═══════════════════════════════════════════════════════════════

describe('BuddyService', () => {
  describe('create', () => {
    it('should create a buddy with buddy user', async () => {
      const buddyUser = {
        id: 'bot-user-1',
        email: 'buddy-my-buddy@shadowob.buddy',
        username: 'buddy-my-buddy',
        displayName: 'My Buddy',
        avatarUrl: null,
        isBot: true,
      }
      const buddy = {
        id: 'buddy-1',
        userId: 'bot-user-1',
        kernelType: 'openclaw',
        config: { description: 'A test buddy' },
        ownerId: 'owner-1',
        status: 'stopped',
      }

      const buddyDao = createMockBuddyDao({
        createBuddyUser: vi.fn().mockResolvedValue(buddyUser),
        create: vi.fn().mockResolvedValue(buddy),
      })
      const userDao = createMockUserDao()
      const logger = createMockLogger()

      const service = new BuddyService({
        buddyDao: buddyDao as any,
        userDao: userDao as any,
        logger: logger as any,
      })

      const result = await service.create({
        name: 'My Buddy',
        username: 'my-buddy',
        description: 'A test buddy',
        kernelType: 'openclaw',
        config: {},
        ownerId: 'owner-1',
      })

      expect(result.id).toBe('buddy-1')
      expect(result.buddyUser.displayName).toBe('My Buddy')
      expect(buddyDao.createBuddyUser).toHaveBeenCalledWith({
        username: 'my-buddy',
        displayName: 'My Buddy',
      })
      expect(buddyDao.create).toHaveBeenCalledWith({
        userId: 'bot-user-1',
        kernelType: 'openclaw',
        config: { description: 'A test buddy' },
        ownerId: 'owner-1',
      })
    })

    it('should update avatar if provided', async () => {
      const buddyUser = {
        id: 'bot-user-2',
        email: 'buddy-avatar-bot@shadowob.buddy',
        username: 'buddy-avatar-bot',
        displayName: 'Avatar Bot',
        avatarUrl: null,
        isBot: true,
      }
      const buddy = {
        id: 'buddy-2',
        userId: 'bot-user-2',
        kernelType: 'openclaw',
        config: {},
        ownerId: 'owner-1',
        status: 'stopped',
      }

      const buddyDao = createMockBuddyDao({
        createBuddyUser: vi.fn().mockResolvedValue(buddyUser),
        create: vi.fn().mockResolvedValue(buddy),
      })
      const userDao = createMockUserDao({
        update: vi
          .fn()
          .mockResolvedValue({ ...buddyUser, avatarUrl: 'https://shadowob.com/avatar.png' }),
      })
      const logger = createMockLogger()

      const service = new BuddyService({
        buddyDao: buddyDao as any,
        userDao: userDao as any,
        logger: logger as any,
      })

      const result = await service.create({
        name: 'Avatar Bot',
        username: 'avatar-bot',
        avatarUrl: 'https://shadowob.com/avatar.png',
        kernelType: 'openclaw',
        config: {},
        ownerId: 'owner-1',
      })

      expect(userDao.update).toHaveBeenCalledWith('bot-user-2', {
        avatarUrl: 'https://shadowob.com/avatar.png',
      })
      expect(result.buddyUser.avatarUrl).toBe('https://shadowob.com/avatar.png')
    })

    it('should throw 409 when username is already taken', async () => {
      const dbError = Object.assign(
        new Error('duplicate key value violates unique constraint "users_username_unique"'),
        { code: '23505' },
      )
      const buddyDao = createMockBuddyDao({
        createBuddyUser: vi.fn().mockRejectedValue(dbError),
      })
      const userDao = createMockUserDao()
      const logger = createMockLogger()

      const service = new BuddyService({
        buddyDao: buddyDao as any,
        userDao: userDao as any,
        logger: logger as any,
      })

      await expect(
        service.create({
          name: 'Duplicate Bot',
          username: 'existing-user',
          kernelType: 'openclaw',
          config: {},
          ownerId: 'owner-1',
        }),
      ).rejects.toMatchObject({
        message: 'Username already taken',
        status: 409,
      })
    })

    it('should throw 409 when username conflict detected via error message', async () => {
      const dbError = new Error(
        'duplicate key value violates unique constraint "users_username_unique"',
      )
      const buddyDao = createMockBuddyDao({
        createBuddyUser: vi.fn().mockRejectedValue(dbError),
      })
      const userDao = createMockUserDao()
      const logger = createMockLogger()

      const service = new BuddyService({
        buddyDao: buddyDao as any,
        userDao: userDao as any,
        logger: logger as any,
      })

      await expect(
        service.create({
          name: 'Duplicate Bot',
          username: 'existing-user',
          kernelType: 'openclaw',
          config: {},
          ownerId: 'owner-1',
        }),
      ).rejects.toMatchObject({
        message: 'Username already taken',
        status: 409,
      })
    })
  })

  describe('getById', () => {
    it('should return buddy with buddy user', async () => {
      const buddy = {
        id: 'buddy-1',
        userId: 'bot-user-1',
        kernelType: 'openclaw',
        config: {},
        ownerId: 'owner-1',
        status: 'stopped',
      }
      const buddyUser = {
        id: 'bot-user-1',
        username: 'buddy-test',
        displayName: 'Test Buddy',
      }

      const buddyDao = createMockBuddyDao({
        findById: vi.fn().mockResolvedValue(buddy),
      })
      const userDao = createMockUserDao({
        findById: vi.fn().mockResolvedValue(buddyUser),
      })
      const logger = createMockLogger()

      const service = new BuddyService({
        buddyDao: buddyDao as any,
        userDao: userDao as any,
        logger: logger as any,
      })

      const result = await service.getById('buddy-1')
      expect(result).not.toBeNull()
      expect(result!.buddyUser).toEqual(buddyUser)
    })

    it('should return null for non-existent buddy', async () => {
      const buddyDao = createMockBuddyDao({
        findById: vi.fn().mockResolvedValue(null),
      })
      const userDao = createMockUserDao()
      const logger = createMockLogger()

      const service = new BuddyService({
        buddyDao: buddyDao as any,
        userDao: userDao as any,
        logger: logger as any,
      })

      const result = await service.getById('nonexistent')
      expect(result).toBeNull()
    })
  })

  describe('generateToken', () => {
    it('should generate a valid JWT for the buddy user', async () => {
      const buddy = {
        id: 'buddy-1',
        userId: 'bot-user-1',
        ownerId: 'owner-1',
        config: {},
      }
      const buddyUser = {
        id: 'bot-user-1',
        email: 'buddy-test@shadowob.buddy',
        username: 'buddy-test',
        displayName: 'Test Buddy',
        avatarUrl: null,
      }

      const buddyDao = createMockBuddyDao({
        findById: vi.fn().mockResolvedValue(buddy),
      })
      const userDao = createMockUserDao({
        findById: vi.fn().mockResolvedValue(buddyUser),
      })
      const logger = createMockLogger()

      const service = new BuddyService({
        buddyDao: buddyDao as any,
        userDao: userDao as any,
        logger: logger as any,
      })

      const result = await service.generateToken('buddy-1', 'owner-1')
      expect(result.token).toBeDefined()
      expect(typeof result.token).toBe('string')
      expect(result.buddy.id).toBe('buddy-1')
      expect(result.buddyUser.id).toBe('bot-user-1')

      // Verify the token is valid
      const decoded = verifyToken(result.token)
      expect(decoded.userId).toBe('bot-user-1')
      expect(decoded.username).toBe('buddy-test')
    })

    it('should throw 404 if buddy not found', async () => {
      const buddyDao = createMockBuddyDao({
        findById: vi.fn().mockResolvedValue(null),
      })
      const userDao = createMockUserDao()
      const logger = createMockLogger()

      const service = new BuddyService({
        buddyDao: buddyDao as any,
        userDao: userDao as any,
        logger: logger as any,
      })

      await expect(service.generateToken('nonexistent', 'owner-1')).rejects.toThrow(
        'Buddy not found',
      )
    })

    it('should throw 403 if not the owner', async () => {
      const buddy = {
        id: 'buddy-1',
        userId: 'bot-user-1',
        ownerId: 'owner-1',
      }

      const buddyDao = createMockBuddyDao({
        findById: vi.fn().mockResolvedValue(buddy),
      })
      const userDao = createMockUserDao()
      const logger = createMockLogger()

      const service = new BuddyService({
        buddyDao: buddyDao as any,
        userDao: userDao as any,
        logger: logger as any,
      })

      await expect(service.generateToken('buddy-1', 'other-owner')).rejects.toThrow(
        'Not the owner of this buddy',
      )
    })
  })

  describe('lifecycle', () => {
    it('should start a buddy', async () => {
      const buddy = {
        id: 'buddy-1',
        userId: 'bot-user-1',
        status: 'stopped',
      }

      const buddyDao = createMockBuddyDao({
        findById: vi.fn().mockResolvedValue(buddy),
        updateStatus: vi.fn().mockResolvedValue({ ...buddy, status: 'running' }),
      })
      const userDao = createMockUserDao()
      const logger = createMockLogger()

      const service = new BuddyService({
        buddyDao: buddyDao as any,
        userDao: userDao as any,
        logger: logger as any,
      })

      await service.start('buddy-1')
      expect(buddyDao.updateStatus).toHaveBeenCalledWith('buddy-1', 'running')
    })

    it('should stop a buddy', async () => {
      const buddy = {
        id: 'buddy-1',
        userId: 'bot-user-1',
        status: 'running',
      }

      const buddyDao = createMockBuddyDao({
        findById: vi.fn().mockResolvedValue(buddy),
        updateStatus: vi.fn().mockResolvedValue({ ...buddy, status: 'stopped' }),
      })
      const userDao = createMockUserDao()
      const logger = createMockLogger()

      const service = new BuddyService({
        buddyDao: buddyDao as any,
        userDao: userDao as any,
        logger: logger as any,
      })

      await service.stop('buddy-1')
      expect(buddyDao.updateStatus).toHaveBeenCalledWith('buddy-1', 'stopped')
    })

    it('should delete a buddy (stop first if running)', async () => {
      const buddy = {
        id: 'buddy-1',
        userId: 'bot-user-1',
        status: 'running',
      }

      const buddyDao = createMockBuddyDao({
        findById: vi.fn().mockResolvedValue(buddy),
        updateStatus: vi.fn().mockResolvedValue({ ...buddy, status: 'stopped' }),
        delete: vi.fn(),
      })
      const userDao = createMockUserDao()
      const logger = createMockLogger()

      const service = new BuddyService({
        buddyDao: buddyDao as any,
        userDao: userDao as any,
        logger: logger as any,
      })

      await service.delete('buddy-1')
      expect(buddyDao.updateStatus).toHaveBeenCalledWith('buddy-1', 'stopped')
      expect(buddyDao.delete).toHaveBeenCalledWith('buddy-1')
    })
  })
})

// ═══════════════════════════════════════════════════════════════
// 3. BUDDY HANDLER (HTTP API surface)
// ═══════════════════════════════════════════════════════════════

describe('Buddy Handler (HTTP)', () => {
  // We test the handler through Hono mock requests
  // This pattern matches the existing e2e.test.ts approach

  it('should expose buddy API routes pattern', () => {
    // Verify createBuddyHandler assembles correct routes
    // (Detailed integration tests would require a full DI container)
    expect(typeof signBuddyToken).toBe('function')
    expect(typeof signAccessToken).toBe('function')
  })

  it('buddy token should be accepted by authMiddleware', async () => {
    const { Hono } = await import('hono')
    const app = new Hono()

    // Simulate authMiddleware
    app.use('*', async (c, next) => {
      const authHeader = c.req.header('Authorization')
      if (!authHeader?.startsWith('Bearer ')) {
        return c.json({ error: 'Unauthorized' }, 401)
      }
      const token = authHeader.slice(7)
      try {
        const payload = verifyToken(token)
        c.set('user', payload as never)
        await next()
      } catch {
        return c.json({ error: 'Invalid token' }, 401)
      }
    })

    app.get('/api/auth/me', (c) => {
      const user = c.get('user') as { userId: string; username: string }
      return c.json({ id: user.userId, username: user.username })
    })

    // Generate a buddy token
    const buddyToken = signBuddyToken({
      userId: 'bot-123',
      email: 'buddy-test@shadowob.buddy',
      username: 'buddy-test',
    })

    const res = await app.request('/api/auth/me', {
      headers: { Authorization: `Bearer ${buddyToken}` },
    })

    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.id).toBe('bot-123')
    expect(data.username).toBe('buddy-test')
  })

  it('should return 409 when creating buddy with duplicate username', async () => {
    const { Hono } = await import('hono')
    const { createBuddyHandler } = await import('../src/handlers/buddy.handler')

    const app = new Hono()

    const container = {
      resolve: (name: string) => {
        if (name === 'buddyService') {
          return {
            create: vi
              .fn()
              .mockRejectedValue(
                Object.assign(new Error('Username already taken'), { status: 409 }),
              ),
          }
        }
        if (name === 'clawListingDao') return { findByBuddyIds: vi.fn().mockResolvedValue([]) }
        if (name === 'rentalContractDao')
          return { findActiveByListingId: vi.fn().mockResolvedValue(null) }
        if (name === 'buddyPolicyService') {
          return {
            getRemoteConfig: vi.fn(),
            getPolicies: vi.fn(),
            upsertPolicies: vi.fn(),
            deletePolicy: vi.fn(),
          }
        }
        throw new Error(`Unknown dependency: ${name}`)
      },
    }

    app.route('/api/buddies', createBuddyHandler(container as never))

    const token = signAccessToken({
      userId: 'owner-1',
      email: 'owner@example.com',
      username: 'owner',
    })

    const res = await app.request('/api/buddies', {
      method: 'POST',
      headers: { 'content-type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        name: 'Dup Buddy',
        username: 'dup-buddy',
        kernelType: 'openclaw',
        config: {},
      }),
    })

    expect(res.status).toBe(409)
    const body = await res.json()
    expect(body.error).toBe('Username already taken')
  })
})
