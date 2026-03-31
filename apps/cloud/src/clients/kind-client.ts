/**
 * kind cluster management — auto-create local Kubernetes clusters.
 */

import { execSync } from 'node:child_process'
import { log } from '../utils/logger.js'

const KIND_CLUSTER_NAME = 'shadowob-cloud'

/**
 * Check if a command-line tool is installed.
 */
export function isInstalled(cmd: string): boolean {
  try {
    execSync(`which ${cmd}`, { stdio: 'ignore', timeout: 5000 })
    return true
  } catch {
    return false
  }
}

/**
 * Check if kubectl can connect to a cluster.
 */
export function isKubeReachable(): boolean {
  try {
    execSync('kubectl cluster-info', { stdio: 'ignore', timeout: 10_000 })
    return true
  } catch {
    return false
  }
}

/**
 * Check if kind cluster exists.
 */
export function kindClusterExists(name = KIND_CLUSTER_NAME): boolean {
  try {
    const output = execSync('kind get clusters', { encoding: 'utf-8', timeout: 10_000 })
    return output.split('\n').some((l) => l.trim() === name)
  } catch {
    return false
  }
}

/**
 * Create a kind cluster for local development.
 */
export function createKindCluster(name = KIND_CLUSTER_NAME): void {
  if (!isInstalled('kind')) {
    throw new Error(
      'kind is not installed. Install it: https://kind.sigs.k8s.io/docs/user/quick-start/',
    )
  }

  if (kindClusterExists(name)) {
    log.dim(`kind cluster "${name}" already exists`)
    return
  }

  log.step(`Creating kind cluster "${name}"...`)
  execSync(`kind create cluster --name ${name} --wait 60s`, {
    stdio: 'inherit',
    timeout: 120_000,
  })

  log.success(`kind cluster "${name}" created`)
}

/**
 * Load a local Docker image into kind cluster.
 */
export function loadImageToKind(imageName: string, clusterName = KIND_CLUSTER_NAME): void {
  log.dim(`Loading image ${imageName} into kind cluster...`)
  execSync(`kind load docker-image ${imageName} --name ${clusterName}`, {
    stdio: 'inherit',
    timeout: 120_000,
  })
}

/**
 * Delete a kind cluster.
 */
export function deleteKindCluster(name = KIND_CLUSTER_NAME): void {
  if (!kindClusterExists(name)) return
  log.step(`Deleting kind cluster "${name}"...`)
  execSync(`kind delete cluster --name ${name}`, { stdio: 'inherit', timeout: 60_000 })
  log.success(`kind cluster "${name}" deleted`)
}
