/**
 * OpenClaw baseline runtime adapter.
 *
 * The simplest runtime — runs OpenClaw gateway directly with no ACP harness.
 * Used for pure messaging agents (chatbots, scheduled reporters, etc.)
 */

import type { AgentDeployment, OpenClawAgentConfig, OpenClawConfig } from '../config/schema.js'
import { type RuntimeAdapter, registerRuntime } from './index.js'

const openclawAdapter: RuntimeAdapter = {
  id: 'openclaw',
  name: 'OpenClaw Gateway',
  defaultImage: 'ghcr.io/shadowob/openclaw-runner:latest',
  packages: [],
  requiresGit: false,

  acpRuntime() {
    return null // No ACP — direct gateway mode
  },

  applyConfig(_agent: AgentDeployment, _agentEntry: OpenClawAgentConfig, _config: OpenClawConfig) {
    // No runtime-specific config needed for baseline
  },

  extraEnv() {
    return {}
  },
}

registerRuntime(openclawAdapter)

export default openclawAdapter
