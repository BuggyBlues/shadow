/**
 * Agent Types
 *
 * Unified agent management supporting both native and ACP runtimes.
 *
 * References:
 *   - OpenClaw ACP Agents: https://docs.openclaw.ai/tools/acp-agents
 *   - ACP Protocol: https://agentclientprotocol.com/
 */

export type AgentRuntime = 'native' | 'acp'

export type ACPAgentId = 'codex' | 'claude' | 'gemini' | 'copilot' | 'cursor' | 'kimi' | 'qwen' | 'pi' | 'opencode' | 'kiro' | 'kilocode' | 'droid' | 'custom'

export type BindingMode = 'current-chat' | 'new-thread'

export interface AgentConfig {
  id: string
  name: string
  enabled: boolean
  runtime: AgentRuntime
  acpAgentId?: ACPAgentId
  acpCustomCommand?: string
  bindingMode: BindingMode
  sessionMode: 'persistent' | 'oneshot'
  cwd?: string
  cloudBinding?: {
    buddyId: string
    syncEnabled: boolean
  }
  createdAt: string
  updatedAt: string
}

export interface AgentTemplate {
  id: ACPAgentId
  name: string
  description: string
  command: string
  defaultEnabled: boolean
}

export interface AgentCheckResult {
  available: boolean
  version?: string
  error?: string
}

// Desktop API
declare global {
  interface Window {
    desktopAPI?: {
      agents?: {
        getAgents: () => Promise<AgentConfig[]>
        getAgentTemplates: () => Promise<AgentTemplate[]>
        createAgent: (config: Omit<AgentConfig, 'id' | 'createdAt' | 'updatedAt'>) => Promise<AgentConfig>
        updateAgent: (id: string, updates: Partial<AgentConfig>) => Promise<AgentConfig | null>
        deleteAgent: (id: string) => Promise<boolean>
        setActiveAgent: (id: string | null) => Promise<{ success: boolean }>
        getActiveAgent: () => Promise<AgentConfig | null>
        checkAgent: (id: string) => Promise<AgentCheckResult>
        getACPCommand: (id: string) => Promise<string | null>
      }
    }
  }
}
