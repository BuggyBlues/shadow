/**
 * Cluster init — installs k3s on bare servers via SSH and forms a cluster.
 *
 * Flow:
 *   1. SSH → master: install k3s server
 *   2. SSH → master: wait for k3s ready
 *   3. SSH → master: read node-token
 *   4. SSH → workers (parallel): install k3s agent and join
 *   5. SSH → master: read kubeconfig
 *   6. Store kubeconfig locally
 */

import { storeKubeconfig } from './kubeconfig.js'
import { getMasterNode, getWorkerNodes, resolveNodeCredentials } from './parser.js'
import type { ClusterConfig, ClusterMeta, NodeConfig } from './schema.js'
import { SSHClient } from './ssh.js'

export interface InitClusterOptions {
  config: ClusterConfig
  force?: boolean
  onLog?: (msg: string) => void
}

/** k3s install script URL */
const K3S_INSTALL_URL = 'https://get.k3s.io'

function log(onLog: ((m: string) => void) | undefined, msg: string) {
  onLog?.(msg)
}

// ─── Master ───────────────────────────────────────────────────────────────────

async function isK3sInstalled(client: SSHClient): Promise<boolean> {
  const result = await client.exec('which k3s')
  return result.code === 0
}

async function installMaster(
  master: NodeConfig,
  force: boolean,
  onLog?: (m: string) => void,
): Promise<{ token: string; kubeconfig: string }> {
  const creds = resolveNodeCredentials(master)
  const client = new SSHClient()

  log(onLog, `[master ${creds.host}] Connecting via SSH...`)
  await client.connect(creds)

  try {
    const alreadyInstalled = await isK3sInstalled(client)
    if (alreadyInstalled && !force) {
      log(
        onLog,
        `[master ${creds.host}] k3s already installed — skipping install (use --force to reinstall)`,
      )
      log(onLog, `[master ${creds.host}] Reading existing token and kubeconfig...`)
    } else {
      if (alreadyInstalled && force) {
        log(onLog, `[master ${creds.host}] k3s already installed — reinstalling (--force)`)
        await client.exec('/usr/local/bin/k3s-uninstall.sh 2>/dev/null || true')
      }
      // Install k3s server with public IP in TLS SAN so external kubeconfig works
      log(onLog, `[master ${creds.host}] Installing k3s server...`)
      await client.execOrThrow(
        `curl -sfL ${K3S_INSTALL_URL} | INSTALL_K3S_EXEC="server --tls-san ${creds.host}" sh -`,
        {
          onStdout: (c) => log(onLog, `[master] ${c.trimEnd()}`),
          onStderr: (c) => log(onLog, `[master] ${c.trimEnd()}`),
          errorMessage: `Failed to install k3s on master ${creds.host}`,
        },
      )
    }

    // Wait until k3s is ready (kubectl get nodes succeeds)
    log(onLog, `[master ${creds.host}] Waiting for k3s to be ready...`)
    await client.execOrThrow(
      `timeout 120 sh -c 'until k3s kubectl get nodes > /dev/null 2>&1; do sleep 3; done'`,
      { errorMessage: 'k3s master did not become ready within 120s' },
    )

    // Read node token
    log(onLog, `[master ${creds.host}] Reading node token...`)
    const tokenResult = await client.execOrThrow('cat /var/lib/rancher/k3s/server/node-token', {
      errorMessage: 'Failed to read k3s node token',
    })
    const token = tokenResult.stdout.trim()
    if (!token) throw new Error('k3s node token is empty')

    // Read kubeconfig
    log(onLog, `[master ${creds.host}] Reading kubeconfig...`)
    const kubeconfigResult = await client.execOrThrow('cat /etc/rancher/k3s/k3s.yaml', {
      errorMessage: 'Failed to read k3s kubeconfig',
    })

    return { token, kubeconfig: kubeconfigResult.stdout }
  } finally {
    await client.dispose()
  }
}

// ─── Workers ──────────────────────────────────────────────────────────────────

async function installWorker(
  worker: NodeConfig,
  masterHost: string,
  token: string,
  force: boolean,
  onLog?: (m: string) => void,
): Promise<void> {
  const creds = resolveNodeCredentials(worker)
  const client = new SSHClient()

  log(onLog, `[worker ${creds.host}] Connecting via SSH...`)
  await client.connect(creds)

  try {
    const alreadyInstalled = await isK3sInstalled(client)
    if (alreadyInstalled && !force) {
      log(
        onLog,
        `[worker ${creds.host}] k3s already installed — skipping install (use --force to reinstall)`,
      )
      return
    }
    if (alreadyInstalled && force) {
      log(onLog, `[worker ${creds.host}] k3s already installed — reinstalling (--force)`)
      await client.exec('/usr/local/bin/k3s-agent-uninstall.sh 2>/dev/null || true')
    }
    log(onLog, `[worker ${creds.host}] Installing k3s agent and joining cluster...`)
    // Quote token to prevent shell injection if token contains special characters
    const escapedToken = token.replace(/'/g, "'\\''")
    await client.execOrThrow(
      `curl -sfL ${K3S_INSTALL_URL} | K3S_URL=https://${masterHost}:6443 K3S_TOKEN='${escapedToken}' sh -`,
      {
        onStdout: (c) => log(onLog, `[worker ${creds.host}] ${c.trimEnd()}`),
        onStderr: (c) => log(onLog, `[worker ${creds.host}] ${c.trimEnd()}`),
        errorMessage: `Failed to install k3s agent on worker ${creds.host}`,
      },
    )
    log(onLog, `[worker ${creds.host}] Agent joined cluster ✓`)
  } finally {
    await client.dispose()
  }
}

// ─── Entry point ─────────────────────────────────────────────────────────────

/**
 * Bootstrap a k3s cluster on bare servers defined in cluster.json.
 * Returns the stored cluster metadata.
 */
export async function initCluster(options: InitClusterOptions): Promise<ClusterMeta> {
  const { config, force = false, onLog } = options
  const master = getMasterNode(config)
  const workers = getWorkerNodes(config)

  log(onLog, `Initializing cluster "${config.name}" with ${config.nodes.length} nodes...`)

  // Step 1–3: install master and get token
  const { token, kubeconfig } = await installMaster(master, force, onLog)

  // Step 4: install workers in parallel
  if (workers.length > 0) {
    log(onLog, `Installing ${workers.length} worker(s) in parallel...`)
    await Promise.all(workers.map((w) => installWorker(w, master.host, token, force, onLog)))
  }

  // Step 5: store kubeconfig
  const meta = storeKubeconfig(config.name, kubeconfig, master.host, config.nodes.length)
  log(onLog, `Kubeconfig stored at ${meta.kubeconfigPath}`)
  log(onLog, `Cluster "${config.name}" is ready. Use: shadowob-cloud up --cluster ${config.name}`)

  return meta
}
