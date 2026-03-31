/**
 * Agent Deployment — Kubernetes Deployment resource via Pulumi.
 */

import * as k8s from '@pulumi/kubernetes'
import type * as pulumi from '@pulumi/pulumi'
import { buildGitCloneCommand } from '../adapters/gitagent-k8s.js'
import type { AgentDeployment, AgentSource } from '../config/schema.js'
import '../runtimes/loader.js'
import { getRuntime } from '../runtimes/index.js'
import {
  baseEnvVars,
  baseVolumeMounts,
  baseVolumes,
  DEFAULT_RESOURCES,
  GIT_INIT_IMAGE,
  HEALTH_PORT,
  LIVENESS_PROBE,
  READINESS_PROBE,
  STARTUP_PROBE,
} from './constants.js'
import { buildContainerSecurityContext, buildSecurityContext } from './security.js'

export interface AgentDeploymentOptions {
  agentName: string
  agent: AgentDeployment
  namespace: string | pulumi.Input<string>
  configMapName: string
  secretName: string
  extraEnv?: Record<string, string>
  provider: k8s.Provider
  /**
   * Image pull policy.
   * Use 'IfNotPresent' for locally built images (Rancher Desktop / local K8s).
   * Use 'Always' for registry images that may be updated.
   * Defaults to 'IfNotPresent' when image tag is 'latest' or contains 'local',
   * otherwise 'IfNotPresent'.
   */
  imagePullPolicy?: 'Always' | 'IfNotPresent' | 'Never'
  /** Shared workspace PVC name (when enabled) */
  sharedWorkspacePvcName?: string
  /** Mount path for shared workspace inside the container */
  sharedWorkspaceMountPath?: string
  /** Skills install directory inside the container */
  skillsInstallDir?: string
}

/**
 * Build init container spec for git source overlay.
 * Clones the git repo and copies the agent source files to a shared EmptyDir.
 */
function buildGitInitContainer(
  _agentName: string,
  source: AgentSource,
): k8s.types.input.core.v1.Container | null {
  if (!source.git) return null
  if ((source.strategy ?? 'init-container') !== 'init-container') return null

  const git = source.git
  const mountPath = source.mountPath ?? '/agent'
  const ref = git.ref ?? 'main'
  const depth = git.depth ?? 1

  const cmd = buildGitCloneCommand({
    url: git.url,
    ref,
    depth,
    agentDir: git.dir,
    mountPath,
    include: source.include,
  })

  const env: k8s.types.input.core.v1.EnvVar[] = []

  // SSH key from secret
  if (git.sshKeySecret) {
    env.push({
      name: 'GIT_SSH_COMMAND',
      value: 'ssh -i /root/.ssh/id_rsa -o StrictHostKeyChecking=no',
    })
  }

  // HTTPS token from secret or env ref
  if (git.tokenSecret) {
    // If it looks like an env var reference, use envFrom on the secret
    // For explicit tokenSecret (K8s secret name), inject as env var
    if (!git.tokenSecret.startsWith('${')) {
      env.push({
        name: 'GIT_TOKEN',
        valueFrom: {
          secretKeyRef: {
            name: git.tokenSecret,
            key: 'token',
            optional: true,
          },
        },
      })
    }
  }

  const volumeMounts: k8s.types.input.core.v1.VolumeMount[] = [{ name: 'agent-source', mountPath }]

  if (git.sshKeySecret) {
    volumeMounts.push({
      name: 'git-ssh-key',
      mountPath: '/root/.ssh',
      readOnly: true,
    })
  }

  return {
    name: 'git-clone',
    image: GIT_INIT_IMAGE,
    imagePullPolicy: 'IfNotPresent',
    command: cmd,
    env,
    volumeMounts,
    securityContext: {
      runAsNonRoot: false, // git needs to write to mountPath
      allowPrivilegeEscalation: false,
    },
  }
}

export function createAgentDeployment(options: AgentDeploymentOptions) {
  const { agentName, agent, namespace, configMapName, secretName, extraEnv, provider } = options

  const image = agent.image ?? getRuntime(agent.runtime).defaultImage
  const replicas = agent.replicas ?? 1

  // Default to IfNotPresent — works for local builds (Rancher Desktop) and cached registry images
  const imagePullPolicy = options.imagePullPolicy ?? 'IfNotPresent'

  // Determine if we have a git source overlay (init-container strategy)
  const source = agent.source
  const hasGitSource = source?.git && (source.strategy ?? 'init-container') === 'init-container'
  const agentMountPath = source?.mountPath ?? '/agent'

  // Merge user-provided env with runtime adapter env
  const runtimeEnv = getRuntime(agent.runtime).extraEnv(agent)
  const mergedExtraEnv = { ...runtimeEnv, ...extraEnv }

  const envVars: k8s.types.input.core.v1.EnvVar[] = [
    ...baseEnvVars(agentName),
    ...Object.entries(mergedExtraEnv).map(([name, value]) => ({ name, value })),
  ]

  // Expose the agent source dir to OpenClaw
  if (hasGitSource || source?.path) {
    envVars.push({ name: 'OPENCLAW_AGENT_DIR', value: agentMountPath })
    envVars.push({ name: 'AGENT_REPO_PATH', value: agentMountPath })
  }

  // Build volume mounts from shared constants
  const volumeMounts: k8s.types.input.core.v1.VolumeMount[] = baseVolumeMounts()

  // Build volumes from shared constants
  const volumes: k8s.types.input.core.v1.Volume[] = baseVolumes(configMapName)

  // Init containers
  const initContainers: k8s.types.input.core.v1.Container[] = []

  // Git source overlay — EmptyDir shared between init container and main container
  if (hasGitSource && source?.git) {
    // Shared EmptyDir for the cloned agent files
    volumes.push({ name: 'agent-source', emptyDir: {} })
    volumeMounts.push({
      name: 'agent-source',
      mountPath: agentMountPath,
      readOnly: true,
    })

    // SSH key volume if configured
    if (source.git.sshKeySecret) {
      volumes.push({
        name: 'git-ssh-key',
        secret: {
          secretName: source.git.sshKeySecret,
          defaultMode: 0o400,
        },
      })
    }

    const initContainer = buildGitInitContainer(agentName, source)
    if (initContainer) {
      initContainers.push(initContainer)
    }
  }

  // Shared workspace PVC mount
  if (options.sharedWorkspacePvcName) {
    const mountPath = options.sharedWorkspaceMountPath ?? '/workspace/shared'
    volumeMounts.push({ name: 'shared-workspace', mountPath })
    volumes.push({
      name: 'shared-workspace',
      persistentVolumeClaim: { claimName: options.sharedWorkspacePvcName },
    })
    envVars.push({ name: 'SHARED_WORKSPACE_PATH', value: mountPath })
  }

  // Skills directory volume
  if (options.skillsInstallDir) {
    volumeMounts.push({ name: 'skills', mountPath: options.skillsInstallDir })
    volumes.push({ name: 'skills', emptyDir: {} })
    envVars.push({ name: 'SKILLS_DIR', value: options.skillsInstallDir })
  }

  const deployment = new k8s.apps.v1.Deployment(
    agentName,
    {
      metadata: {
        name: agentName,
        namespace,
        labels: {
          app: 'shadowob-cloud',
          agent: agentName,
          runtime: agent.runtime,
          ...(source?.git ? { 'gitagent.source': 'git' } : {}),
        },
        annotations: source?.git
          ? {
              'gitagent.url': source.git.url,
              'gitagent.ref': source.git.ref ?? 'main',
              'gitagent.strategy': source.strategy ?? 'init-container',
            }
          : {},
      },
      spec: {
        replicas,
        selector: {
          matchLabels: {
            app: 'shadowob-cloud',
            agent: agentName,
          },
        },
        template: {
          metadata: {
            labels: {
              app: 'shadowob-cloud',
              agent: agentName,
              runtime: agent.runtime,
            },
          },
          spec: {
            initContainers: initContainers.length > 0 ? initContainers : undefined,
            securityContext: buildSecurityContext(),
            containers: [
              {
                name: agent.runtime,
                image,
                imagePullPolicy,
                ports: [{ containerPort: HEALTH_PORT, name: 'health' }],
                env: envVars,
                envFrom: [{ secretRef: { name: secretName } }],
                volumeMounts,
                resources: (agent.resources ?? DEFAULT_RESOURCES) as Record<string, unknown>,
                securityContext: buildContainerSecurityContext(),
                livenessProbe: LIVENESS_PROBE,
                readinessProbe: READINESS_PROBE,
                startupProbe: STARTUP_PROBE,
              },
            ],
            volumes,
            restartPolicy: 'Always',
          },
        },
      },
    },
    { provider },
  )

  return { deployment }
}
