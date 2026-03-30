/**
 * Agent Configuration Store
 *
 * Unified agent management supporting both native and ACP runtimes.
 *
 * Architecture (aligned with OpenClaw):
 *   User Request → OpenClaw Gateway → Runtime [Native | ACP] → Agent
 *                                          ↓
 *                                   ACP: acpx → External Agent
 *
 * Design Principles:
 * 1. User only cares about agent name (codex, claude), not command path
 * 2. Runtime type (native/acp) is an implementation detail
 * 3. Binding mode controls session lifecycle (current chat / new thread)
 *
 * References:
 *   - OpenClaw ACP Agents: https://docs.openclaw.ai/tools/acp-agents
 *   - ACP Protocol: https://agentclientprotocol.com/
 */

import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { app } from 'electron'

export type AgentRuntime = 'native' | 'acp'

export type ACPAgentId = 'codex' | 'claude' | 'gemini' | 'copilot' | 'cursor' | 'kimi' | 'qwen' | 'pi' | 'opencode' | 'kiro' | 'kilocode' | 'droid' | 'custom'

export type BindingMode = 'current-chat' | 'new-thread'

export interface AgentConfig {
  id: string
  name: string
  enabled: boolean
  runtime: AgentRuntime
  /** ACP-specific: agent identifier (e.g., 'codex', 'claude') */
  acpAgentId?: ACPAgentId
  /** ACP-specific: custom command if agentId is 'custom' */
  acpCustomCommand?: string
  /** Binding mode for ACP sessions */
  bindingMode: BindingMode
  /** Session mode */
  sessionMode: 'persistent' | 'oneshot'
  /** Optional working directory for ACP */
  cwd?: string
  /** Cloud buddy binding */
  cloudBinding?: {
    buddyId: string
    syncEnabled: boolean
  }
  createdAt: string
  updatedAt: string
}

/** Pre-configured ACP agents (user-friendly names) */
export const PRECONFIGURED_ACP_AGENTS: Array<{
  id: ACPAgentId
  name: string
  description: string
  command: string
  defaultEnabled: boolean
}> = [
  { id: 'codex', name: 'Codex', description: 'OpenAI Codex for code generation', command: 'npx @zed-industries/codex-acp', defaultEnabled: true },
  { id: 'claude', name: 'Claude Code', description: 'Anthropic Claude for complex refactoring', command: 'npx -y @zed-industries/claude-agent-acp', defaultEnabled: true },
  { id: 'gemini', name: 'Gemini', description: 'Google Gemini for research', command: 'gemini --acp', defaultEnabled: false },
  { id: 'copilot', name: 'Copilot', description: 'GitHub Copilot CLI', command: 'copilot --acp --stdio', defaultEnabled: false },
  { id: 'cursor', name: 'Cursor', description: 'Cursor AI editor', command: 'cursor-agent acp', defaultEnabled: false },
  { id: 'kimi', name: 'Kimi', description: 'Moonshot Kimi', command: 'kimi acp', defaultEnabled: false },
  { id: 'qwen', name: 'Qwen', description: 'Alibaba Qwen', command: 'qwen --acp', defaultEnabled: false },
  { id: 'pi', name: 'Pi', description: 'Pi personal AI', command: 'npx pi-acp', defaultEnabled: false },
  { id: 'opencode', name: 'Opencode', description: 'Opencode AI', command: 'npx -y opencode-ai acp', defaultEnabled: false },
  { id: 'kiro', name: 'Kiro', description: 'Kiro CLI', command: 'kiro-cli acp', defaultEnabled: false },
  { id: 'kilocode', name: 'Kilo Code', description: 'Kilo Code CLI', command: 'npx -y @kilocode/cli acp', defaultEnabled: false },
  { id: 'droid', name: 'Droid', description: 'Droid agent', command: 'droid exec --output-format acp', defaultEnabled: false },
]

interface AgentStore {
  version: string
  agents: AgentConfig[]
  activeAgentId: string | null
}

const STORE_VERSION = '1.0'
const CONFIG_FILE = 'agents.json'

function getConfigPath(): string {
  return join(app.getPath('userData'), CONFIG_FILE)
}

function loadStore(): AgentStore {
  const configPath = getConfigPath()

  if (existsSync(configPath)) {
    try {
      const data = JSON.parse(readFileSync(configPath, 'utf-8')) as AgentStore
      if (data.version === STORE_VERSION) {
        return data
      }
    } catch (e) {
      console.error('Failed to read agent config:', e)
    }
  }

  // Initialize with pre-configured ACP agents
  const defaultStore: AgentStore = {
    version: STORE_VERSION,
    agents: PRECONFIGURED_ACP_AGENTS.map((template, index) => ({
      id: `agent-${index + 1}`,
      name: template.name,
      enabled: template.defaultEnabled,
      runtime: 'acp',
      acpAgentId: template.id,
      bindingMode: 'current-chat',
      sessionMode: 'persistent',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    })),
    activeAgentId: null,
  }

  saveStore(defaultStore)
  return defaultStore
}

function saveStore(store: AgentStore): void {
  writeFileSync(getConfigPath(), JSON.stringify(store, null, 2), 'utf-8')
}

class AgentConfigStore {
  private store: AgentStore

  constructor() {
    this.store = loadStore()
  }

  getAllAgents(): AgentConfig[] {
    return [...this.store.agents]
  }

  getAgent(id: string): AgentConfig | undefined {
    return this.store.agents.find((a) => a.id === id)
  }

  createAgent(config: Omit<AgentConfig, 'id' | 'createdAt' | 'updatedAt'>): AgentConfig {
    const agent: AgentConfig = {
      ...config,
      id: `agent-${Date.now()}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    this.store.agents.push(agent)
    saveStore(this.store)
    return agent
  }

  updateAgent(id: string, updates: Partial<Omit<AgentConfig, 'id' | 'createdAt'>>): AgentConfig | null {
    const index = this.store.agents.findIndex((a) => a.id === id)
    if (index === -1) return null

    this.store.agents[index] = {
      ...this.store.agents[index],
      ...updates,
      updatedAt: new Date().toISOString(),
    }
    saveStore(this.store)
    return this.store.agents[index]
  }

  deleteAgent(id: string): boolean {
    const index = this.store.agents.findIndex((a) => a.id === id)
    if (index === -1) return false
    this.store.agents.splice(index, 1)
    saveStore(this.store)
    return true
  }

  setActiveAgent(id: string | null): void {
    this.store.activeAgentId = id
    saveStore(this.store)
  }

  getActiveAgent(): AgentConfig | null {
    if (!this.store.activeAgentId) return null
    return this.getAgent(this.store.activeAgentId) ?? null
  }

  /** Get command for ACP agent */
  getACPCommand(agentId: string): string | null {
    const agent = this.getAgent(agentId)
    if (!agent || agent.runtime !== 'acp') return null

    if (agent.acpAgentId === 'custom' && agent.acpCustomCommand) {
      return agent.acpCustomCommand
    }

    const template = PRECONFIGURED_ACP_AGENTS.find((t) => t.id === agent.acpAgentId)
    return template?.command ?? null
  }

  /** Check if agent is available */
  async checkAgentAvailable(agentId: string): Promise<{ available: boolean; version?: string; error?: string }> {
    const agent = this.getAgent(agentId)
    if (!agent) return { available: false, error: 'Agent not found' }

    if (agent.runtime === 'acp') {
      const command = this.getACPCommand(agentId)
      if (!command) return { available: false, error: 'No command configured' }

      const mainCmd = command.split(' ')[0]
      try {
        const { exec } = await import('node:child_process')
        const { promisify } = await import('node:util')
        const execAsync = promisify(exec)
        const { stdout } = await execAsync(`${mainCmd} --version`)
        return { available: true, version: stdout.trim() }
      } catch (error) {
        return { available: false, error: String(error) }
      }
    }

    // Native agent check
    return { available: true }
  }
}

export const agentConfigStore = new AgentConfigStore()
