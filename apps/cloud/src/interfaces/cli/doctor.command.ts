/**
 * CLI: shadowob-cloud doctor — check all prerequisites and system health.
 */

import { execSync } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import { Command } from 'commander'
import type { ServiceContainer } from '../../services/container.js'

interface CheckResult {
  name: string
  status: 'pass' | 'warn' | 'fail'
  message: string
  hint?: string
}

function getVersion(cmd: string, versionFlag = '--version'): string | null {
  try {
    return execSync(`${cmd} ${versionFlag}`, {
      encoding: 'utf-8',
      timeout: 10_000,
      stdio: ['ignore', 'pipe', 'pipe'],
    }).trim()
  } catch {
    return null
  }
}

export function createDoctorCommand(container: ServiceContainer) {
  return new Command('doctor')
    .description('Check prerequisites and system health')
    .option('--security', 'Run security configuration checks')
    .action((options: { security?: boolean }) => {
      const results: CheckResult[] = []

      container.logger.step('Checking dependencies...')

      // Node.js
      const nodeVersion = process.version
      const major = Number.parseInt(nodeVersion.slice(1), 10)
      results.push(
        major >= 22
          ? { name: 'Node.js', status: 'pass', message: nodeVersion }
          : {
              name: 'Node.js',
              status: major >= 20 ? 'warn' : 'fail',
              message: `${nodeVersion} (22+ recommended)`,
              hint: 'Install Node.js 22: https://nodejs.org/',
            },
      )

      // Docker
      if (container.k8s.isToolInstalled('docker')) {
        const ver = getVersion('docker')
        results.push({ name: 'Docker', status: 'pass', message: ver ?? 'installed' })
      } else {
        results.push({
          name: 'Docker',
          status: 'fail',
          message: 'not found',
          hint: 'Install Docker: https://docs.docker.com/get-docker/',
        })
      }

      // kubectl
      if (container.k8s.isToolInstalled('kubectl')) {
        const reachable = container.k8s.isKubeReachable()
        results.push({
          name: 'kubectl',
          status: reachable ? 'pass' : 'warn',
          message: reachable ? 'connected' : 'installed but cluster unreachable',
          hint: reachable
            ? undefined
            : 'Use --local to create a kind cluster, or configure KUBECONFIG',
        })
      } else {
        results.push({
          name: 'kubectl',
          status: 'fail',
          message: 'not found',
          hint: 'Install kubectl: https://kubernetes.io/docs/tasks/tools/',
        })
      }

      // Pulumi (uses `pulumi version` subcommand, not `--version` flag)
      if (container.k8s.isToolInstalled('pulumi')) {
        const ver = getVersion('pulumi', 'version')
        results.push({ name: 'Pulumi', status: 'pass', message: ver ?? 'installed' })
      } else {
        results.push({
          name: 'Pulumi',
          status: 'fail',
          message: 'not found',
          hint: 'Install Pulumi: https://www.pulumi.com/docs/install/',
        })
      }

      // kind
      if (container.k8s.isToolInstalled('kind')) {
        const hasCluster = container.k8s.kindClusterExists()
        results.push({
          name: 'kind',
          status: 'pass',
          message: hasCluster ? 'installed + shadowob-cloud cluster exists' : 'installed',
        })
      } else {
        results.push({
          name: 'kind',
          status: 'warn',
          message: 'not found (optional, for local development)',
          hint: 'Install kind: https://kind.sigs.k8s.io/docs/user/quick-start/',
        })
      }

      // Print results
      for (const r of results) {
        const icon = r.status === 'pass' ? '✓' : r.status === 'warn' ? '⚠' : '✗'
        const color = r.status === 'pass' ? 'success' : r.status === 'warn' ? 'warn' : 'error'
        container.logger[color](`${icon} ${r.name}: ${r.message}`)
        if (r.hint) container.logger.dim(`    → ${r.hint}`)
      }

      // Security checks
      if (options.security) {
        console.log()
        container.logger.step('Checking security configuration...')
        const secResults: CheckResult[] = []

        if (container.k8s.isToolInstalled('kubectl') && container.k8s.isKubeReachable()) {
          try {
            execSync('kubectl auth can-i create deployments', {
              encoding: 'utf-8',
              timeout: 10_000,
            })
            secResults.push({
              name: 'K8s RBAC',
              status: 'pass',
              message: 'can create deployments',
            })
          } catch {
            secResults.push({
              name: 'K8s RBAC',
              status: 'warn',
              message: 'cannot create deployments in current context',
            })
          }

          try {
            const apiResources = execSync('kubectl api-resources --no-headers', {
              encoding: 'utf-8',
              timeout: 10_000,
            })
            const hasNetworkPolicy = apiResources
              .split('\n')
              .some((line) => line.trim().startsWith('networkpolicies'))
            secResults.push({
              name: 'NetworkPolicy',
              status: hasNetworkPolicy ? 'pass' : 'warn',
              message: hasNetworkPolicy ? 'API available' : 'NetworkPolicy API not available',
            })
          } catch {
            secResults.push({
              name: 'NetworkPolicy',
              status: 'warn',
              message: 'NetworkPolicy API not available',
            })
          }
        }

        if (existsSync('.env')) {
          // Check if .env is in .gitignore
          let inGitignore = false
          if (existsSync('.gitignore')) {
            const gitignore = readFileSync('.gitignore', 'utf-8')
            inGitignore = gitignore.split('\n').some((line) => line.trim() === '.env')
          }
          secResults.push({
            name: '.env file',
            status: inGitignore ? 'pass' : 'warn',
            message: inGitignore
              ? 'found, excluded by .gitignore'
              : 'found but NOT in .gitignore — risk of committing secrets',
            hint: inGitignore ? undefined : 'Add .env to your .gitignore file',
          })
        } else {
          secResults.push({
            name: '.env file',
            status: 'warn',
            message: 'not found — API keys should be in .env',
          })
        }

        for (const r of secResults) {
          const icon = r.status === 'pass' ? '✓' : r.status === 'warn' ? '⚠' : '✗'
          const color = r.status === 'pass' ? 'success' : r.status === 'warn' ? 'warn' : 'error'
          container.logger[color](`${icon} ${r.name}: ${r.message}`)
          if (r.hint) container.logger.dim(`    → ${r.hint}`)
        }
      }

      // Summary
      const fails = results.filter((r) => r.status === 'fail')
      console.log()
      if (fails.length === 0) {
        container.logger.success('All checks passed')
      } else {
        container.logger.error(`${fails.length} check(s) failed`)
        process.exit(1)
      }
    })
}
