/**
 * Cluster config schema — defines the shape of cluster.json.
 *
 * cluster.json describes bare servers to bootstrap into a k3s cluster.
 * Credentials use ${env:VAR} template syntax so secrets are never stored on disk.
 */

import { z } from 'zod'

// ─── Node ────────────────────────────────────────────────────────────────────

export const NodeRoleSchema = z.enum(['master', 'worker'])
export type NodeRole = z.infer<typeof NodeRoleSchema>

export const NodeConfigSchema = z
  .object({
    /** Node role in the cluster */
    role: NodeRoleSchema,
    /** Public IP or hostname */
    host: z.string().min(1),
    /** SSH port (default: 22) */
    port: z.number().int().min(1).max(65535).default(22),
    /** SSH username */
    user: z.string().min(1),
    /** Path to SSH private key (supports ~) — mutually inclusive with or exclusive of password */
    sshKeyPath: z.string().optional(),
    /** SSH password — use ${env:VAR} to avoid storing plaintext */
    password: z.string().optional(),
  })
  .refine((n) => n.sshKeyPath !== undefined || n.password !== undefined, {
    message: 'Each node must have either sshKeyPath or password',
  })

export type NodeConfig = z.infer<typeof NodeConfigSchema>

// ─── Cluster ─────────────────────────────────────────────────────────────────

export const ClusterProviderSchema = z.enum(['ssh'])
export type ClusterProvider = z.infer<typeof ClusterProviderSchema>

export const ClusterConfigSchema = z
  .object({
    $schema: z.string().optional(),
    /** Cluster name — used as --cluster value */
    name: z
      .string()
      .min(1)
      .regex(/^[a-z0-9-]+$/, 'Cluster name must be lowercase alphanumeric with dashes'),
    /** Provider type (default: ssh) */
    provider: ClusterProviderSchema.default('ssh'),
    /** List of nodes */
    nodes: z.array(NodeConfigSchema).min(1),
  })
  .refine((c) => c.nodes.filter((n) => n.role === 'master').length === 1, {
    message: 'Cluster must have exactly one master node',
  })

export type ClusterConfig = z.infer<typeof ClusterConfigSchema>

// ─── Stored metadata ──────────────────────────────────────────────────────────

/** Persisted to ~/.shadow-cloud/clusters/<name>.json after successful init */
export interface ClusterMeta {
  name: string
  masterHost: string
  nodeCount: number
  createdAt: string
  kubeconfigPath: string
}
