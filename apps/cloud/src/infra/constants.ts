/**
 * Infrastructure constants — shared between manifest generation and Pulumi deployment.
 *
 * Centralizes magic values that were previously duplicated across
 * infra/index.ts and infra/agent-deployment.ts.
 */

/** Health check port — must match entrypoint.mjs and Dockerfile EXPOSE */
export const HEALTH_PORT = 3100

/** ConfigMap mount path inside agent containers */
export const CONFIG_MOUNT_PATH = '/etc/shadowob-cloud'

/** OpenClaw data directory (HOME=/home/node) */
export const OPENCLAW_DATA_PATH = '/home/node/.openclaw'

/** Agent log directory */
export const LOG_PATH = '/var/log/openclaw'

/** Home directory for the non-root node user (UID 1000) */
export const HOME_DIR = '/home/node'

/** Git clone init container image */
export const GIT_INIT_IMAGE = 'alpine/git:latest'

/** Default container images per runtime */
export const DEFAULT_IMAGES: Record<string, string> = {
  openclaw: 'ghcr.io/shadowob/openclaw-runner:latest',
  'claude-code': 'ghcr.io/shadowob/claude-runner:latest',
}

/** Default resource requests/limits for agent containers */
export const DEFAULT_RESOURCES = {
  requests: { cpu: '100m', memory: '256Mi' },
  limits: { cpu: '1000m', memory: '1Gi' },
} as const

/** Liveness probe configuration */
export const LIVENESS_PROBE = {
  httpGet: { path: '/health', port: HEALTH_PORT },
  initialDelaySeconds: 30,
  periodSeconds: 15,
  failureThreshold: 5,
} as const

/** Readiness probe configuration */
export const READINESS_PROBE = {
  httpGet: { path: '/health', port: HEALTH_PORT },
  initialDelaySeconds: 10,
  periodSeconds: 5,
} as const

/** Startup probe configuration */
export const STARTUP_PROBE = {
  httpGet: { path: '/health', port: HEALTH_PORT },
  initialDelaySeconds: 5,
  periodSeconds: 5,
  failureThreshold: 60,
} as const

/** Standard volume mounts for every agent container */
export function baseVolumeMounts() {
  return [
    { name: 'config', mountPath: CONFIG_MOUNT_PATH, readOnly: true },
    { name: 'openclaw-data', mountPath: OPENCLAW_DATA_PATH },
    { name: 'logs', mountPath: LOG_PATH },
    { name: 'tmp', mountPath: '/tmp' },
  ]
}

/** Standard volumes for every agent pod */
export function baseVolumes(configMapName: string) {
  return [
    { name: 'config', configMap: { name: configMapName } },
    { name: 'openclaw-data', emptyDir: {} },
    { name: 'logs', emptyDir: {} },
    { name: 'tmp', emptyDir: {} },
  ]
}

/** Standard environment variables for every agent container */
export function baseEnvVars(agentName: string) {
  return [
    { name: 'AGENT_ID', value: agentName },
    { name: 'NODE_ENV', value: 'production' },
    { name: 'HOME', value: HOME_DIR },
    { name: 'OPENCLAW_DIR', value: OPENCLAW_DATA_PATH },
  ]
}
