import type { AgentRegistry } from './registry'
import type { AgentResponse, ChannelMessage } from './types'

/**
 * Agent Gateway
 * MCP 协议网关 - 消息路由、Agent 调度、频道 ↔ Agent 绑定
 */
export class AgentGateway {
  private channelBindings = new Map<string, Set<string>>()

  constructor(private registry: AgentRegistry) {}

  /** 将 Agent 绑定到频道 */
  bindAgent(channelId: string, agentId: string): void {
    const agents = this.channelBindings.get(channelId) ?? new Set()
    agents.add(agentId)
    this.channelBindings.set(channelId, agents)
  }

  /** 解绑 Agent */
  unbindAgent(channelId: string, agentId: string): void {
    const agents = this.channelBindings.get(channelId)
    if (agents) {
      agents.delete(agentId)
      if (agents.size === 0) {
        this.channelBindings.delete(channelId)
      }
    }
  }

  /** 获取频道绑定的 Agent ID 列表 */
  getChannelAgents(channelId: string): string[] {
    const agents = this.channelBindings.get(channelId)
    return agents ? Array.from(agents) : []
  }

  /**
   * 将消息路由到频道中绑定的所有 Agent
   * 返回各 Agent 的响应
   */
  async routeMessage(message: ChannelMessage): Promise<Map<string, AgentResponse>> {
    const results = new Map<string, AgentResponse>()
    const agentIds = this.getChannelAgents(message.channelId)

    if (agentIds.length === 0) return results

    // 检查是否 @mention 了某个 Agent
    const mentionedAgents = agentIds.filter((id) => {
      const entry = this.registry.getEntry(id)
      if (!entry) return false
      return message.mentions?.includes(entry.name) || message.content.includes(`@${entry.name}`)
    })

    // 如果有 @mention，只路由给被提及的 Agent；否则路由给所有 Agent
    const targetAgents = mentionedAgents.length > 0 ? mentionedAgents : agentIds

    const tasks = targetAgents.map(async (agentId) => {
      const kernel = this.registry.getKernel(agentId)
      if (!kernel) return

      try {
        const response = await kernel.onMessage(message)
        results.set(agentId, response)
      } catch (error) {
        const msg = error instanceof Error ? error.message : 'Unknown error'
        results.set(agentId, { content: `[Agent Error] ${msg}` })
      }
    })

    await Promise.allSettled(tasks)
    return results
  }

  /** 清理所有绑定 */
  clearBindings(): void {
    this.channelBindings.clear()
  }
}
