/**
 * CLI: shadowob-cloud up — deploy or update agent cluster to Kubernetes.
 */

import { Command } from 'commander'
import type { ServiceContainer } from '../../services/container.js'

export function createUpCommand(container: ServiceContainer) {
  return new Command('up')
    .description('Deploy or update agent cluster to Kubernetes')
    .option('-f, --file <path>', 'Config file path', 'shadowob-cloud.json')
    .option('-n, --namespace <ns>', 'Kubernetes namespace')
    .option('-s, --stack <name>', 'Pulumi stack name', 'dev')
    .option('--provision-url <url>', 'Shadow server URL for provisioning')
    .option('--shadow-token <token>', 'Shadow user token for provisioning')
    .option('--dry-run', 'Preview changes without applying')
    .option('--skip-provision', 'Skip Shadow resource provisioning')
    .option('--yes', 'Skip confirmation prompts')
    .option(
      '--k8s-context <ctx>',
      'kubectl context (default: rancher-desktop or KUBECONFIG_CONTEXT)',
    )
    .option('--state-dir <dir>', 'Subdirectory for provision state (default: .shadowob)')
    .option(
      '--image-pull-policy <policy>',
      'imagePullPolicy: Always|IfNotPresent|Never',
      'IfNotPresent',
    )
    .option(
      '--pod-shadow-url <url>',
      'Shadow server URL as seen from inside K8s pods (e.g. http://host.lima.internal:3002)',
    )
    .option('--local', 'Auto-create a local kind cluster if no K8s is available')
    .option(
      '--cluster <name>',
      'Named cluster to deploy to (uses ~/.shadow-cloud/clusters/<name>.yaml)',
    )
    .action(
      async (options: {
        file: string
        namespace?: string
        stack: string
        provisionUrl?: string
        shadowToken?: string
        dryRun?: boolean
        skipProvision?: boolean
        yes?: boolean
        k8sContext?: string
        stateDir?: string
        imagePullPolicy?: string
        podShadowUrl?: string
        local?: boolean
        cluster?: string
      }) => {
        try {
          await container.deploy.up({
            filePath: options.file,
            namespace: options.namespace,
            stack: options.stack,
            extraSecrets: {
              ...(options.provisionUrl ? { SHADOW_SERVER_URL: options.provisionUrl } : {}),
              ...(options.podShadowUrl ? { SHADOW_AGENT_SERVER_URL: options.podShadowUrl } : {}),
              ...(options.shadowToken ? { SHADOW_USER_TOKEN: options.shadowToken } : {}),
            },
            dryRun: options.dryRun,
            skipProvision: options.skipProvision,
            k8sContext: options.k8sContext,
            stateDir: options.stateDir,
            imagePullPolicy:
              (options.imagePullPolicy as 'Always' | 'IfNotPresent' | 'Never') ?? 'IfNotPresent',
            local: options.local,
            cluster: options.cluster,
          })
        } catch (err) {
          container.logger.error((err as Error).message)
          process.exit(1)
        }
      },
    )
}
