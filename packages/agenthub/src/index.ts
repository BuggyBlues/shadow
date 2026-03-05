// Types

// Adapters
export { BaseAdapter, BaseKernel } from './adapters/base.adapter'
export { ClaudeAdapter } from './adapters/claude.adapter'
export { CursorAdapter } from './adapters/cursor.adapter'
export { CustomAdapter } from './adapters/custom.adapter'
export { MCPAdapter } from './adapters/mcp.adapter'
export type { AgentClientOptions } from './client'
export { AgentClient } from './client'
export { AgentGateway } from './gateway'
// Registry & Gateway
export { AgentRegistry } from './registry'
export type { ContainerOptions } from './runtime'
// Runtime & Client
export { AgentRuntime } from './runtime'
export type {
  AgentConfig,
  AgentRegistryEntry,
  AgentResponse,
  ChannelMessage,
  CLIProcessInfo,
  IAgentAdapter,
  IAgentKernel,
  MCPResourceDefinition,
  MCPToolDefinition,
} from './types'
