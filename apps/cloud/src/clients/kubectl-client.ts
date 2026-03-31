/**
 * kubectl operational commands — deployments, pods, logs, scaling.
 *
 * All functions shell out to `kubectl` for runtime cluster operations
 * (as opposed to Pulumi which handles declarative infrastructure).
 */

import { execSync, spawn } from 'node:child_process'

export interface PodStatus {
  name: string
  ready: string
  status: string
  restarts: string
  age: string
}

export interface DeploymentStatus {
  name: string
  ready: string
  upToDate: string
  available: string
  age: string
}

function runKubectl(args: string[], namespace?: string): string {
  const nsArgs = namespace ? ['--namespace', namespace] : []
  const cmd = ['kubectl', ...nsArgs, ...args].join(' ')
  return execSync(cmd, { encoding: 'utf-8', timeout: 30_000 }).trim()
}

export function getDeployments(namespace: string): DeploymentStatus[] {
  try {
    const output = runKubectl(['get', 'deployments', '-o', 'json'], namespace)
    const data = JSON.parse(output)
    return (data.items ?? []).map((item: Record<string, unknown>) => {
      const status = item.status as Record<string, unknown>
      const meta = item.metadata as Record<string, unknown>
      return {
        name: meta.name as string,
        ready: `${status.readyReplicas ?? 0}/${status.replicas ?? 0}`,
        upToDate: String(status.updatedReplicas ?? 0),
        available: String(status.availableReplicas ?? 0),
        age: meta.creationTimestamp as string,
      }
    })
  } catch {
    return []
  }
}

export function getPods(namespace: string): PodStatus[] {
  try {
    const output = runKubectl(['get', 'pods', '-o', 'json'], namespace)
    const data = JSON.parse(output)
    return (data.items ?? []).map((item: Record<string, unknown>) => {
      const status = item.status as Record<string, unknown>
      const meta = item.metadata as Record<string, unknown>
      const containers = (status.containerStatuses ?? []) as Array<Record<string, unknown>>
      const totalRestarts = containers.reduce(
        (sum: number, c: Record<string, unknown>) => sum + ((c.restartCount as number) ?? 0),
        0,
      )
      const readyCount = containers.filter((c: Record<string, unknown>) => c.ready).length
      return {
        name: meta.name as string,
        ready: `${readyCount}/${containers.length}`,
        status: status.phase as string,
        restarts: String(totalRestarts),
        age: meta.creationTimestamp as string,
      }
    })
  } catch {
    return []
  }
}

export function streamLogs(
  namespace: string,
  podName: string,
  options: { follow?: boolean; tail?: number } = {},
): ReturnType<typeof spawn> {
  const args = ['logs', podName, '--namespace', namespace]
  if (options.follow) args.push('--follow')
  if (options.tail !== undefined) args.push(`--tail=${options.tail}`)
  return spawn('kubectl', args, { stdio: 'inherit' })
}

export function scaleDeployment(namespace: string, deploymentName: string, replicas: number): void {
  runKubectl(['scale', 'deployment', deploymentName, `--replicas=${replicas}`], namespace)
}
