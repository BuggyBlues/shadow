/**
 * Lightweight kubectl wrapper used by the SaaS API to inspect K8s state for a
 * deployment without going through the cloud worker. Intentionally minimal:
 * `kubectl` must be installed in the server image, and a kubeconfig is either
 * provided per-call or read from the standard KUBECONFIG env var.
 *
 * SECURITY: kubeconfig content is written to a private temp file (mode 0600)
 * for the duration of each call and removed in the finally block. We never
 * log the content.
 */
import { execFileSync, spawn } from 'node:child_process'
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { homedir, tmpdir } from 'node:os'
import { delimiter, join } from 'node:path'

export interface K8sPodSummary {
  name: string
  ready: string
  status: string
  restarts: number
  age: string
}

function rewriteLoopbackKubeconfig(kubeconfigYaml: string, loopbackHost?: string): string {
  const normalizedHost = loopbackHost?.trim()
  if (!normalizedHost) return kubeconfigYaml

  const lines = kubeconfigYaml.split(/\r?\n/)

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index]
    const match = line?.match(/^([ \t]*server:\s*https?:\/\/)(127\.0\.0\.1|localhost)([:/].*)$/)
    if (!match) continue

    const serverPrefix = match[1] ?? ''
    const serverSuffix = match[3] ?? ''
    const indent = serverPrefix.match(/^[ \t]*/)?.[0] ?? ''
    lines[index] = `${serverPrefix}${normalizedHost}${serverSuffix}`

    const tlsServerNameLine = `${indent}tls-server-name: localhost`
    const nextLine = lines[index + 1]
    if (!nextLine?.trim().startsWith('tls-server-name:')) {
      lines.splice(index + 1, 0, tlsServerNameLine)
      index += 1
    }
  }

  return lines.join('\n')
}

function resolveAmbientKubeconfig(): string | undefined {
  const envPath = process.env.KUBECONFIG?.split(delimiter).find(
    (candidate) => candidate.trim().length > 0,
  )
  const defaultPath = join(homedir(), '.kube', 'config')
  const kubeconfigPath = envPath ?? defaultPath

  if (!existsSync(kubeconfigPath)) {
    return undefined
  }

  return readFileSync(kubeconfigPath, 'utf-8')
}

function createTempKubeconfig(
  kubeconfig: string,
  includeAmbientContext = false,
): {
  args: string[]
  cleanup: () => void
} {
  const dir = mkdtempSync(join(tmpdir(), 'sc-saas-kube-'))
  const path = join(dir, 'kubeconfig')
  const loopbackHost = process.env.KUBECONFIG_LOOPBACK_HOST ?? 'host.lima.internal'
  const rewritten = rewriteLoopbackKubeconfig(kubeconfig, loopbackHost)
  writeFileSync(path, rewritten, { mode: 0o600 })

  const args = ['--kubeconfig', path]
  if (includeAmbientContext && process.env.KUBECONFIG_CONTEXT?.trim()) {
    args.push('--context', process.env.KUBECONFIG_CONTEXT.trim())
  }

  return {
    args,
    cleanup: () => {
      try {
        rmSync(dir, { recursive: true, force: true })
      } catch {
        /* ignore */
      }
    },
  }
}

function withKubeconfig<T>(kubeconfig: string | undefined, fn: (kubeArgs: string[]) => T): T {
  const explicitKubeconfig = kubeconfig?.trim() ? kubeconfig : undefined
  const effectiveKubeconfig = explicitKubeconfig ?? resolveAmbientKubeconfig()
  if (!effectiveKubeconfig) {
    return fn([])
  }

  const { args, cleanup } = createTempKubeconfig(effectiveKubeconfig, !explicitKubeconfig)
  try {
    return fn(args)
  } finally {
    cleanup()
  }
}

function execKubectl(args: string[], kubeconfig?: string, timeout = 15_000): string {
  return withKubeconfig(kubeconfig, (kubeArgs) =>
    execFileSync('kubectl', [...kubeArgs, ...args], {
      encoding: 'utf-8',
      timeout,
      stdio: ['ignore', 'pipe', 'pipe'],
    }),
  )
}

function isNamespaceNotFound(error: unknown): boolean {
  return error instanceof Error && /not found/i.test(error.message)
}

/**
 * List pods in a namespace.
 */
export function listPods(namespace: string, kubeconfig?: string): K8sPodSummary[] {
  try {
    const out = execKubectl(['-n', namespace, 'get', 'pods', '-o', 'json'], kubeconfig)
    const data = JSON.parse(out) as { items?: Array<Record<string, unknown>> }
    return (data.items ?? []).map((item) => {
      const meta = (item.metadata ?? {}) as Record<string, unknown>
      const status = (item.status ?? {}) as Record<string, unknown>
      const containers = (status.containerStatuses ?? []) as Array<Record<string, unknown>>
      const restarts = containers.reduce((s, c) => s + ((c.restartCount as number) ?? 0), 0)
      const ready = containers.filter((c) => c.ready).length
      return {
        name: meta.name as string,
        ready: `${ready}/${containers.length}`,
        status: (status.phase as string) ?? 'Unknown',
        restarts,
        age: (meta.creationTimestamp as string) ?? '',
      }
    })
  } catch {
    return []
  }
}

/**
 * Spawn a `kubectl logs -f` process. Caller must `kill()` on stream abort.
 * Note: the temp kubeconfig file is intentionally NOT removed while the
 * spawned process is alive — the caller closes the stream and we clean up
 * via the returned `cleanup()` function.
 */
export function spawnPodLogStream(opts: {
  namespace: string
  pod: string
  container?: string
  follow?: boolean
  tail?: number
  kubeconfig?: string
}): { proc: ReturnType<typeof spawn>; cleanup: () => void } {
  const args: string[] = []
  let cleanup = () => {}

  const explicitKubeconfig = opts.kubeconfig?.trim() ? opts.kubeconfig : undefined
  const effectiveKubeconfig = explicitKubeconfig ?? resolveAmbientKubeconfig()
  if (effectiveKubeconfig) {
    const tempKubeconfig = createTempKubeconfig(effectiveKubeconfig, !explicitKubeconfig)
    args.push(...tempKubeconfig.args)
    cleanup = tempKubeconfig.cleanup
  }

  args.push('logs', '-n', opts.namespace, opts.pod)
  if (opts.container) args.push('-c', opts.container)
  if (opts.follow !== false) args.push('-f')
  if (opts.tail !== undefined) args.push(`--tail=${opts.tail}`)
  args.push('--timestamps')

  const proc = spawn('kubectl', args, { stdio: ['ignore', 'pipe', 'pipe'] })
  return { proc, cleanup }
}

/**
 * List all namespaces tagged as managed by Shadow Cloud on the *default*
 * cluster (KUBECONFIG). Used for orphan reconcile in the SaaS API. Returns
 * `null` if kubectl is not installed (so callers can degrade gracefully).
 */
export function listManagedNamespaces(kubeconfig?: string): string[] | null {
  try {
    const out = execKubectl(
      [
        'get',
        'ns',
        '-l',
        'shadowob-cloud/managed=true',
        '-o',
        'jsonpath={.items[*].metadata.name}',
      ],
      kubeconfig,
      10_000,
    ).trim()
    return out.length === 0 ? [] : out.split(/\s+/)
  } catch {
    return null
  }
}

/**
 * Check whether a namespace exists. Returns `null` when the cluster is not
 * reachable so callers can skip destructive or state-changing fallbacks.
 */
export function namespaceExists(namespace: string, kubeconfig?: string): boolean | null {
  try {
    const out = execKubectl(
      ['get', 'ns', namespace, '--ignore-not-found', '-o', 'name'],
      kubeconfig,
      10_000,
    ).trim()
    return out.length > 0
  } catch (error) {
    if (isNamespaceNotFound(error)) {
      return false
    }
    return null
  }
}

/**
 * Delete a namespace without waiting for termination to complete.
 */
export function deleteNamespace(namespace: string, kubeconfig?: string): void {
  execKubectl(['delete', 'namespace', namespace, '--wait=false'], kubeconfig)
}
