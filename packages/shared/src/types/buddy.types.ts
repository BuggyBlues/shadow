export type BuddyStatus = 'running' | 'stopped' | 'error'

export type BuddyKernelType = 'claude-code' | 'cursor' | 'mcp-server' | 'custom'

export type BuddyCapability =
  | 'chat'
  | 'code-gen'
  | 'code-review'
  | 'research'
  | 'tools'
  | 'file-access'

export interface Buddy {
  id: string
  userId: string
  kernelType: BuddyKernelType
  config: Record<string, unknown>
  containerId: string | null
  status: BuddyStatus
  ownerId: string
  createdAt: string
  updatedAt: string
  user?: {
    id: string
    username: string
    displayName: string
    avatarUrl: string | null
  }
  capabilities?: BuddyCapability[]
}

export interface CreateBuddyRequest {
  name: string
  kernelType: BuddyKernelType
  config?: Record<string, unknown>
}

export interface BuddyInfo {
  id: string
  name: string
  kernelType: BuddyKernelType
  status: BuddyStatus
  capabilities: BuddyCapability[]
}
