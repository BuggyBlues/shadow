/**
 * Claude Code runtime adapter.
 *
 * Architecture: openclaw gateway → ACPX plugin → claude CLI process
 *
 * Package: @anthropic-ai/claude-code
 * CLI: claude -p "prompt" --output-format stream-json
 * Auth: ANTHROPIC_API_KEY env var
 * Docs: https://code.claude.com/docs/en/overview
 */

import type {
  AgentDeployment,
  OpenClawAcpRuntime,
  OpenClawAgentConfig,
  OpenClawConfig,
} from '../config/schema.js'
import { type RuntimeAdapter, registerRuntime } from './index.js'

const claudeCodeAdapter: RuntimeAdapter = {
  id: 'claude-code',
  name: 'Claude Code (Anthropic)',
  defaultImage: 'ghcr.io/shadowob/claude-runner:latest',
  packages: ['@anthropic-ai/claude-code'],
  requiresGit: true,

  acpRuntime(_agent: AgentDeployment): OpenClawAcpRuntime {
    return {
      agent: 'claude',
      backend: 'acpx',
      mode: 'persistent',
      cwd: '/workspace',
    }
  },

  applyConfig(agent: AgentDeployment, agentEntry: OpenClawAgentConfig, config: OpenClawConfig) {
    // Set agent runtime to ACP → Claude
    const acpRuntime = this.acpRuntime(agent)!
    if (agentEntry.runtime?.acp) {
      Object.assign(acpRuntime, agentEntry.runtime.acp)
    }
    agentEntry.runtime = { type: 'acp', acp: acpRuntime }

    // Enable ACP globally
    config.acp = {
      enabled: true,
      backend: 'acpx',
      defaultAgent: agent.id,
      allowedAgents: [agent.id],
      maxConcurrentSessions: 8,
      ...config.acp,
    }

    // Ensure ACPX plugin is enabled
    if (!config.plugins) config.plugins = {}
    if (!config.plugins.entries) config.plugins.entries = {}
    config.plugins.entries.acpx = {
      enabled: true,
      ...config.plugins.entries.acpx,
    }
  },

  extraEnv() {
    return {}
  },
}

registerRuntime(claudeCodeAdapter)

export default claudeCodeAdapter
