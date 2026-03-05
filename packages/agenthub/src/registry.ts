import { EventEmitter } from 'node:events'
import type { AgentConfig, AgentRegistryEntry, IAgentAdapter, IAgentKernel } from './types'

/**
 * Agent 注册中心
 * 管理 Agent 的注册、发现、生命周期和健康检查
 */
export class AgentRegistry extends EventEmitter {
  private adapters = new Map<string, IAgentAdapter>()
  private agents = new Map<string, { kernel: IAgentKernel; entry: AgentRegistryEntry }>()
  private healthCheckInterval: ReturnType<typeof setInterval> | null = null

  /** 注册适配器 */
  registerAdapter(adapter: IAgentAdapter): void {
    this.adapters.set(adapter.kernelType, adapter)
  }

  /** 获取适配器 */
  getAdapter(kernelType: string): IAgentAdapter | undefined {
    return this.adapters.get(kernelType)
  }

  /** 注册并启动 Agent */
  async register(id: string, config: AgentConfig): Promise<AgentRegistryEntry> {
    const adapter = this.adapters.get(config.kernelType)
    if (!adapter) {
      throw new Error(`No adapter found for kernel type: ${config.kernelType}`)
    }

    const available = await adapter.isAvailable()
    if (!available) {
      throw new Error(`Adapter for ${config.kernelType} is not available`)
    }

    const kernel = await adapter.createKernel(config)
    await kernel.init(config)

    const entry: AgentRegistryEntry = {
      id,
      name: config.name,
      kernelType: config.kernelType,
      capabilities: kernel.capabilities,
      status: 'running',
      lastHealthCheck: new Date().toISOString(),
    }

    this.agents.set(id, { kernel, entry })
    this.emit('agent:registered', entry)

    return entry
  }

  /** 注销 Agent */
  async unregister(id: string): Promise<void> {
    const agent = this.agents.get(id)
    if (!agent) return

    try {
      await agent.kernel.destroy()
    } catch {
      // ignore destroy errors
    }

    agent.entry.status = 'stopped'
    this.agents.delete(id)
    this.emit('agent:unregistered', agent.entry)
  }

  /** 获取 Agent 内核 */
  getKernel(id: string): IAgentKernel | undefined {
    return this.agents.get(id)?.kernel
  }

  /** 获取 Agent 注册信息 */
  getEntry(id: string): AgentRegistryEntry | undefined {
    return this.agents.get(id)?.entry
  }

  /** 列出所有已注册 Agent */
  listAgents(): AgentRegistryEntry[] {
    return Array.from(this.agents.values()).map((a) => a.entry)
  }

  /** 启动健康检查 */
  startHealthCheck(intervalMs = 30_000): void {
    this.stopHealthCheck()
    this.healthCheckInterval = setInterval(() => {
      void this.checkHealth()
    }, intervalMs)
  }

  /** 停止健康检查 */
  stopHealthCheck(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval)
      this.healthCheckInterval = null
    }
  }

  /** 执行健康检查 */
  private async checkHealth(): Promise<void> {
    for (const [id, agent] of this.agents) {
      try {
        // 简单的 ping 检查 - 尝试获取 tools 列表
        agent.kernel.getTools?.()
        agent.entry.status = 'running'
        agent.entry.lastHealthCheck = new Date().toISOString()
      } catch {
        agent.entry.status = 'error'
        this.emit('agent:error', { id, error: 'Health check failed' })
      }
    }
  }

  /** 销毁所有 Agent 并清理 */
  async destroy(): Promise<void> {
    this.stopHealthCheck()
    const ids = Array.from(this.agents.keys())
    await Promise.allSettled(ids.map((id) => this.unregister(id)))
  }
}
