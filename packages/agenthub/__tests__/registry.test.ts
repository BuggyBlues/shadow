import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AgentRegistry } from '../src/registry'
import type {
  AgentConfig,
  AgentResponse,
  ChannelMessage,
  IAgentAdapter,
  IAgentKernel,
} from '../src/types'

class MockAdapter implements IAgentAdapter {
  readonly kernelType = 'mock'

  async isAvailable(): Promise<boolean> {
    return true
  }

  async createKernel(_config: AgentConfig): Promise<IAgentKernel> {
    return new MockKernel()
  }
}

class UnavailableAdapter implements IAgentAdapter {
  readonly kernelType = 'unavailable'

  async isAvailable(): Promise<boolean> {
    return false
  }

  async createKernel(): Promise<IAgentKernel> {
    throw new Error('Not available')
  }
}

class MockKernel implements IAgentKernel {
  readonly name = 'mock-kernel'
  readonly version = '1.0.0'
  capabilities: string[] = ['chat']

  async init(config: AgentConfig): Promise<void> {
    this.capabilities = config.capabilities ?? ['chat']
  }

  async onMessage(message: ChannelMessage): Promise<AgentResponse> {
    return { content: `Echo: ${message.content}` }
  }

  async destroy(): Promise<void> {
    this._destroyed = true
  }

  getProcessInfo() {
    return undefined
  }
}

function createConfig(overrides: Partial<AgentConfig> = {}): AgentConfig {
  return {
    name: 'test-agent',
    kernelType: 'mock',
    capabilities: ['chat'],
    ...overrides,
  }
}

describe('AgentRegistry', () => {
  let registry: AgentRegistry

  beforeEach(() => {
    registry = new AgentRegistry()
  })

  describe('registerAdapter', () => {
    it('should register an adapter', () => {
      const adapter = new MockAdapter()
      registry.registerAdapter(adapter)
      expect(registry.getAdapter('mock')).toBe(adapter)
    })

    it('should return undefined for unregistered adapter', () => {
      expect(registry.getAdapter('nonexistent')).toBeUndefined()
    })

    it('should overwrite existing adapter with same kernelType', () => {
      const adapter1 = new MockAdapter()
      const adapter2 = new MockAdapter()
      registry.registerAdapter(adapter1)
      registry.registerAdapter(adapter2)
      expect(registry.getAdapter('mock')).toBe(adapter2)
    })
  })

  describe('register', () => {
    it('should register an agent and return entry', async () => {
      registry.registerAdapter(new MockAdapter())
      const entry = await registry.register('agent-1', createConfig())

      expect(entry.id).toBe('agent-1')
      expect(entry.name).toBe('test-agent')
      expect(entry.kernelType).toBe('mock')
      expect(entry.status).toBe('running')
      expect(entry.capabilities).toEqual(['chat'])
      expect(entry.lastHealthCheck).toBeDefined()
    })

    it('should throw if no adapter found', async () => {
      await expect(
        registry.register('agent-1', createConfig({ kernelType: 'nonexistent' })),
      ).rejects.toThrow('No adapter found for kernel type: nonexistent')
    })

    it('should throw if adapter is unavailable', async () => {
      registry.registerAdapter(new UnavailableAdapter())
      await expect(
        registry.register('agent-1', createConfig({ kernelType: 'unavailable' })),
      ).rejects.toThrow('not available')
    })

    it('should emit agent:registered event', async () => {
      registry.registerAdapter(new MockAdapter())
      const listener = vi.fn()
      registry.on('agent:registered', listener)

      await registry.register('agent-1', createConfig())
      expect(listener).toHaveBeenCalledOnce()
      expect(listener.mock.calls[0][0].id).toBe('agent-1')
    })
  })

  describe('unregister', () => {
    it('should unregister an agent', async () => {
      registry.registerAdapter(new MockAdapter())
      await registry.register('agent-1', createConfig())
      await registry.unregister('agent-1')

      expect(registry.getKernel('agent-1')).toBeUndefined()
      expect(registry.listAgents()).toHaveLength(0)
    })

    it('should silently ignore unknown agent', async () => {
      await registry.unregister('unknown')
      // No error thrown means success
    })

    it('should emit agent:unregistered event', async () => {
      registry.registerAdapter(new MockAdapter())
      await registry.register('agent-1', createConfig())

      const listener = vi.fn()
      registry.on('agent:unregistered', listener)

      await registry.unregister('agent-1')
      expect(listener).toHaveBeenCalledOnce()
    })
  })

  describe('getKernel', () => {
    it('should return kernel for registered agent', async () => {
      registry.registerAdapter(new MockAdapter())
      await registry.register('agent-1', createConfig())

      const kernel = registry.getKernel('agent-1')
      expect(kernel).toBeDefined()
      expect(kernel?.name).toBe('mock-kernel')
    })

    it('should return undefined for unknown agent', () => {
      expect(registry.getKernel('unknown')).toBeUndefined()
    })
  })

  describe('listAgents', () => {
    it('should return empty list initially', () => {
      expect(registry.listAgents()).toHaveLength(0)
    })

    it('should return all registered agents', async () => {
      registry.registerAdapter(new MockAdapter())
      await registry.register('agent-1', createConfig({ name: 'First' }))
      await registry.register('agent-2', createConfig({ name: 'Second' }))

      const agents = registry.listAgents()
      expect(agents).toHaveLength(2)
      expect(agents.map((a) => a.name)).toEqual(['First', 'Second'])
    })
  })

  describe('kernel messaging', () => {
    it('should forward messages to kernel and get response', async () => {
      registry.registerAdapter(new MockAdapter())
      await registry.register('agent-1', createConfig())

      const kernel = registry.getKernel('agent-1')!
      const response = await kernel.onMessage({
        id: 'msg-1',
        channelId: 'ch-1',
        content: 'Hello',
        authorId: 'user-1',
        authorName: 'Test User',
        timestamp: new Date().toISOString(),
      })

      expect(response.content).toBe('Echo: Hello')
    })
  })

  describe('destroy', () => {
    it('should unregister all agents', async () => {
      registry.registerAdapter(new MockAdapter())
      await registry.register('agent-1', createConfig())
      await registry.register('agent-2', createConfig())

      await registry.destroy()
      expect(registry.listAgents()).toHaveLength(0)
    })
  })

  describe('health check', () => {
    it('should start and stop health checks', () => {
      registry.startHealthCheck(10_000)
      registry.stopHealthCheck()
      // No error means success
    })

    it('should be stopped on destroy', async () => {
      registry.startHealthCheck(10_000)
      await registry.destroy()
      // No error means success
    })
  })
})
