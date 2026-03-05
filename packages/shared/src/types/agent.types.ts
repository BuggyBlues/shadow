export type AgentStatus = 'running' | 'stopped' | 'error'

export type AgentKernelType = 'claude-code' | 'cursor' | 'mcp-server' | 'custom'

export type AgentCapability =
  | 'chat'
  | 'code-gen'
  | 'code-review'
  | 'research'
  | 'tools'
  | 'file-access'

export interface Agent {
  id: string
  userId: string
  kernelType: AgentKernelType
  config: Record<string, unknown>
  containerId: string | null
  status: AgentStatus
  ownerId: string
  createdAt: string
  updatedAt: string
  user?: {
    id: string
    username: string
    displayName: string
    avatarUrl: string | null
  }
  capabilities?: AgentCapability[]
}

export interface CreateAgentRequest {
  name: string
  kernelType: AgentKernelType
  config?: Record<string, unknown>
}

export interface AgentInfo {
  id: string
  name: string
  kernelType: AgentKernelType
  status: AgentStatus
  capabilities: AgentCapability[]
}
