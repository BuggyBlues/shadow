/**
 * Managed agents types — vault, permissions, networking.
 */

/** Permission level for agent tools — maps to ACPX permission modes. */
export type PermissionLevel = 'always-allow' | 'approve-reads' | 'always-ask' | 'deny-all'

/**
 * Per-tool permission policy for an agent.
 * Inspired by Claude Managed Agents' toolset-level permission control.
 */
export interface AgentPermissions {
  /** Default permission level for all tools */
  default: PermissionLevel
  /** Per-tool overrides — key is tool name, supports glob patterns (e.g. "mcp-*") */
  tools?: Record<string, PermissionLevel>
  /** Behaviour when the agent runs non-interactively (no human in the loop) */
  nonInteractive?: 'deny' | 'fail'
}

/**
 * Per-agent networking policy configuration.
 * Generates K8s NetworkPolicy resources to control egress.
 */
export interface AgentNetworking {
  /** Network policy type */
  type: 'unrestricted' | 'limited' | 'deny-all'
  /** Allowed egress domains (requires Cilium for FQDN-level enforcement) */
  allowedHosts?: string[]
  /** Allow egress to MCP server endpoints (auto-extracted from agent config) */
  allowMcpServers?: boolean
  /** Allow egress to package manager registries (npm, pypi, etc.) */
  allowPackageManagers?: boolean
}

/**
 * Vault provider secret source — where to read a secret value from.
 */
export interface VaultSecretSource {
  /** API key or token value (template ref: ${env:...}, ${file:...}, ${k8s:ns/secret/key}) */
  apiKey?: string
}

/**
 * Vault configuration — per-agent secret isolation.
 * Each vault generates an isolated K8s Secret containing only the keys an agent needs.
 */
export interface VaultConfig {
  /** Provider API keys for this vault */
  providers?: Record<string, VaultSecretSource>
  /** Additional named secrets */
  secrets?: Record<string, string>
}
