import { asClass, asValue, createContainer, InjectionMode } from 'awilix'
import { describe, expect, it, vi } from 'vitest'

// Test the DI container pattern without actual DB connection
// We verify the wiring works with mock dependencies

class MockDao {
  constructor(private deps: { db: object }) {}

  getDb() {
    return this.deps.db
  }
}

class MockService {
  constructor(private deps: { mockDao: MockDao; logger: object }) {}

  getDao() {
    return this.deps.mockDao
  }
}

describe('DI Container Pattern', () => {
  it('should create container with PROXY injection mode', () => {
    const container = createContainer({
      injectionMode: InjectionMode.PROXY,
      strict: true,
    })

    const mockDb = { query: vi.fn() }
    const mockLogger = { info: vi.fn() }

    container.register({
      db: asValue(mockDb),
      logger: asValue(mockLogger),
      mockDao: asClass(MockDao).singleton(),
      mockService: asClass(MockService).singleton(),
    })

    const dao = container.resolve<MockDao>('mockDao')
    expect(dao).toBeInstanceOf(MockDao)
    expect(dao.getDb()).toBe(mockDb)

    const service = container.resolve<MockService>('mockService')
    expect(service).toBeInstanceOf(MockService)
    expect(service.getDao()).toBe(dao)
  })

  it('should return same instance for singleton registrations', () => {
    const container = createContainer({
      injectionMode: InjectionMode.PROXY,
      strict: true,
    })

    container.register({
      db: asValue({}),
      logger: asValue({}),
      mockDao: asClass(MockDao).singleton(),
      mockService: asClass(MockService).singleton(),
    })

    const service1 = container.resolve<MockService>('mockService')
    const service2 = container.resolve<MockService>('mockService')
    expect(service1).toBe(service2)
  })

  it('should support disposing container', async () => {
    const container = createContainer({
      injectionMode: InjectionMode.PROXY,
      strict: true,
    })

    container.register({
      db: asValue({ connected: true }),
    })

    const before = container.resolve('db')
    expect(before).toEqual({ connected: true })

    await container.dispose()
    // Container successfully disposed without error
  })
})
