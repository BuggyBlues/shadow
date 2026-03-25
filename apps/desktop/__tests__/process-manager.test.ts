import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const mockChild = {
  pid: 1234,
  killed: false,
  kill: vi.fn(),
  on: vi.fn(),
}

// Mock child_process
vi.mock('node:child_process', () => ({
  fork: vi.fn(() => mockChild),
}))

// Mock node:path
vi.mock('node:path', async () => {
  const actual = await vi.importActual<typeof import('node:path')>('node:path')
  return {
    ...actual,
    resolve: vi.fn((...args: string[]) => actual.resolve(...args)),
  }
})

// Mock electron
const mockIpcHandlers = new Map<string, (...args: any[]) => any>()
vi.mock('electron', () => ({
  app: {
    getAppPath: vi.fn(() => '/app'),
  },
  ipcMain: {
    handle: vi.fn((channel: string, handler: (...args: any[]) => any) => {
      mockIpcHandlers.set(channel, handler)
    }),
  },
}))

describe('process-manager', () => {
  beforeEach(() => {
    vi.resetModules()
    mockIpcHandlers.clear()
    mockChild.killed = false
    mockChild.kill.mockClear()
    mockChild.on.mockClear()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('should register all IPC handlers', async () => {
    await import('../src/main/process-manager')
    const { setupProcessManager } = await import('../src/main/process-manager')
    setupProcessManager()

    expect(mockIpcHandlers.has('desktop:startBuddy')).toBe(true)
    expect(mockIpcHandlers.has('desktop:stopBuddy')).toBe(true)
    expect(mockIpcHandlers.has('desktop:getBuddyStatus')).toBe(true)
    expect(mockIpcHandlers.has('desktop:listBuddies')).toBe(true)
  })

  it('should reject script paths outside app directory', async () => {
    const { resolve } = await import('node:path')
    ;(resolve as ReturnType<typeof vi.fn>).mockReturnValue('/malicious/script.js')

    const { setupProcessManager } = await import('../src/main/process-manager')
    setupProcessManager()

    const handler = mockIpcHandlers.get('desktop:startBuddy')!
    const mockEvent = { sender: { send: vi.fn() } }

    expect(() => handler(mockEvent, { name: 'test', scriptPath: '/malicious/script.js' })).toThrow(
      'Buddy script must be within the application directory',
    )
  })

  it('should return buddy status for running process', async () => {
    const { resolve } = await import('node:path')
    ;(resolve as ReturnType<typeof vi.fn>).mockReturnValue('/app/buddies/test.js')

    const { setupProcessManager } = await import('../src/main/process-manager')
    setupProcessManager()

    const startHandler = mockIpcHandlers.get('desktop:startBuddy')!
    const statusHandler = mockIpcHandlers.get('desktop:getBuddyStatus')!
    const mockEvent = { sender: { send: vi.fn() } }

    const result = await startHandler(mockEvent, {
      name: 'test',
      scriptPath: '/app/buddies/test.js',
    })

    const status = await statusHandler(mockEvent, result.id)
    expect(status.running).toBe(true)
    expect(status.name).toBe('test')
  })

  it('should return not-running status for unknown process', async () => {
    const { setupProcessManager } = await import('../src/main/process-manager')
    setupProcessManager()

    const handler = mockIpcHandlers.get('desktop:getBuddyStatus')!
    const result = await handler({}, 'unknown-id')
    expect(result).toEqual({ running: false })
  })

  it('should list all running buddies', async () => {
    const { resolve } = await import('node:path')
    ;(resolve as ReturnType<typeof vi.fn>).mockReturnValue('/app/buddies/test.js')

    const { setupProcessManager } = await import('../src/main/process-manager')
    setupProcessManager()

    const startHandler = mockIpcHandlers.get('desktop:startBuddy')!
    const listHandler = mockIpcHandlers.get('desktop:listBuddies')!
    const mockEvent = { sender: { send: vi.fn() } }

    await startHandler(mockEvent, { name: 'buddy1', scriptPath: '/app/buddies/test.js' })

    const list = await listHandler({})
    expect(list.length).toBe(1)
    expect(list[0].name).toBe('buddy1')
    expect(list[0].running).toBe(true)
  })
})
