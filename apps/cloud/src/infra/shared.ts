/**
 * Shared resources — Kubernetes namespace, explicit Provider,
 * and optional shared workspace PersistentVolumeClaim via Pulumi.
 *
 * The Provider must be created once and passed to all other K8s resources
 * so Pulumi always targets the correct cluster context.
 */

import * as k8s from '@pulumi/kubernetes'
import type { SharedWorkspaceConfig } from '../config/schema.js'

export interface SharedResourcesOptions {
  namespace: string
  /** kubectl context name — defaults to KUBECONFIG_CONTEXT env var or 'rancher-desktop' */
  kubeContext?: string
  /** Path to kubeconfig file — defaults to KUBECONFIG env var or ~/.kube/config */
  kubeConfigPath?: string
  /** Shared workspace configuration */
  workspace?: SharedWorkspaceConfig
}

export function createSharedResources(options: SharedResourcesOptions) {
  const context =
    options.kubeContext ??
    process.env.KUBECONFIG_CONTEXT ??
    process.env.K8S_CONTEXT ??
    'rancher-desktop'

  // Explicit K8s provider — ensures we always hit the right cluster
  const provider = new k8s.Provider('k8s-provider', {
    context,
    ...(options.kubeConfigPath ? { kubeconfig: options.kubeConfigPath } : {}),
  })

  const ns = new k8s.core.v1.Namespace(
    `${options.namespace}-ns`,
    {
      metadata: {
        name: options.namespace,
        labels: {
          app: 'shadowob-cloud',
          'managed-by': 'shadowob-cloud-cli',
        },
      },
    },
    { provider },
  )

  // Shared workspace PVC — mounted into every agent container
  let workspacePvc: k8s.core.v1.PersistentVolumeClaim | undefined
  if (options.workspace?.enabled) {
    const ws = options.workspace
    workspacePvc = new k8s.core.v1.PersistentVolumeClaim(
      'shared-workspace-pvc',
      {
        metadata: {
          name: 'shared-workspace',
          namespace: options.namespace,
          labels: {
            app: 'shadowob-cloud',
            'managed-by': 'shadowob-cloud-cli',
          },
        },
        spec: {
          accessModes: [ws.accessMode ?? 'ReadWriteOnce'],
          resources: {
            requests: {
              storage: ws.storageSize ?? '5Gi',
            },
          },
          ...(ws.storageClassName ? { storageClassName: ws.storageClassName } : {}),
        },
      },
      { provider, dependsOn: [ns] },
    )
  }

  return { namespace: ns, provider, workspacePvc }
}
