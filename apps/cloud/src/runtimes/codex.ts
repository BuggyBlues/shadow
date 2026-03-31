/**
 * OpenAI Codex runtime adapter.
 *
 * Architecture: openclaw gateway → ACPX plugin → codex CLI process
 *
 * Package: @openai/codex (npm) or Rust binary
 * CLI: codex -q "prompt" --approval-mode full-auto
 * Auth: OPENAI_API_KEY env var, or ChatGPT subscription
 * Docs: https://developers.openai.com/codex
 */

import type {
  AgentDeployment,
  OpenClawAcpRuntime,
  OpenClawAgentConfig,
  OpenClawConfig,
} from '../config/schema.js'
import { type RuntimeAdapter, registerRuntime } from './index.js'

const codexAdapter: RuntimeAdapter = {
  id: 'codex',
  name: 'Codex (OpenAI)',
  defaultImage: 'ghcr.io/shadowob/codex-runner:latest',
  packages: ['@openai/codex'],
  requiresGit: true,

  acpRuntime(_agent: AgentDeployment): OpenClawAcpRuntime {
    return {
      agent: 'codex',
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
      maxConcurrentSessions: 4,
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

registerRuntime(codexAdapter)

export default codexAdapter
