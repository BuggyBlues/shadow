/**
 * OpenCode runtime adapter.
 *
 * Architecture: openclaw gateway → ACPX plugin → opencode CLI process
 *
 * Package: opencode-ai
 * CLI: opencode (client/server architecture, TypeScript)
 * Auth: Provider-specific env vars (ANTHROPIC_API_KEY, OPENAI_API_KEY, etc.)
 * Docs: https://opencode.ai/docs
 *
 * OpenCode is provider-agnostic — supports Claude, OpenAI, Google, local models.
 * It uses a client/server architecture where the server runs persistently.
 */

import type {
  AgentDeployment,
  OpenClawAcpRuntime,
  OpenClawAgentConfig,
  OpenClawConfig,
} from '../config/schema.js'
import { type RuntimeAdapter, registerRuntime } from './index.js'

const opencodeAdapter: RuntimeAdapter = {
  id: 'opencode',
  name: 'OpenCode (SST)',
  defaultImage: 'ghcr.io/shadowob/opencode-runner:latest',
  packages: ['opencode-ai'],
  requiresGit: true,

  acpRuntime(_agent: AgentDeployment): OpenClawAcpRuntime {
    return {
      agent: 'opencode',
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

registerRuntime(opencodeAdapter)

export default opencodeAdapter
