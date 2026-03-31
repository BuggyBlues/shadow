/**
 * Gemini CLI runtime adapter.
 *
 * Architecture: openclaw gateway → ACPX plugin → gemini CLI process
 *
 * Package: @google/gemini-cli
 * CLI: gemini -p "prompt" --output-format stream-json
 * Auth: GEMINI_API_KEY or GOOGLE_API_KEY env var, or Google OAuth
 * Docs: https://geminicli.com/docs/
 */

import type {
  AgentDeployment,
  OpenClawAcpRuntime,
  OpenClawAgentConfig,
  OpenClawConfig,
} from '../config/schema.js'
import { type RuntimeAdapter, registerRuntime } from './index.js'

const geminiAdapter: RuntimeAdapter = {
  id: 'gemini',
  name: 'Gemini CLI (Google)',
  defaultImage: 'ghcr.io/shadowob/gemini-runner:latest',
  packages: ['@google/gemini-cli'],
  requiresGit: false,

  acpRuntime(_agent: AgentDeployment): OpenClawAcpRuntime {
    return {
      agent: 'gemini',
      backend: 'acpx',
      mode: 'persistent',
      cwd: '/workspace',
    }
  },

  applyConfig(agent: AgentDeployment, agentEntry: OpenClawAgentConfig, config: OpenClawConfig) {
    const acpRuntime = this.acpRuntime(agent)!
    if (agentEntry.runtime?.acp) {
      Object.assign(acpRuntime, agentEntry.runtime.acp)
    }
    agentEntry.runtime = { type: 'acp', acp: acpRuntime }

    config.acp = {
      enabled: true,
      backend: 'acpx',
      defaultAgent: agent.id,
      allowedAgents: [agent.id],
      maxConcurrentSessions: 8,
      ...config.acp,
    }

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

registerRuntime(geminiAdapter)

export default geminiAdapter
