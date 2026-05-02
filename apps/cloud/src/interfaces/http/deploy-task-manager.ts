/**
 * Background deployment task manager.
 *
 * Starts deploys independently from the initiating HTTP connection, persists
 * log lines, and allows later SSE subscribers to replay and follow progress.
 */

import { resolveCloudSaasShadowRuntime } from '../../application/cloud-saas-config.js'
import {
  applyRuntimeEnvRefPolicy,
  collectRuntimeEnvRefPolicy,
} from '../../application/runtime-env-requirements.js'
import type { DeploymentDao } from '../../dao/deployment.dao.js'
import type { DeploymentLogDao } from '../../dao/deployment-log.dao.js'
import type { EnvVarDao } from '../../dao/envvar.dao.js'
import type { Deployment } from '../../db/schema.js'
import type { ServiceContainer } from '../../services/container.js'
import { GLOBAL_ENV_SCOPE, toDeploymentEnvScope } from '../../utils/deployment-scope.js'
import { redactSecrets } from '../../utils/redact.js'

function shouldSkipProgressLine(line: string): boolean {
  const trimmed = line.trim()
  return (
    trimmed === '.' ||
    trimmed === '..' ||
    /^@\s+updating\.+/.test(trimmed) ||
    /^\.\.+$/.test(trimmed)
  )
}

export interface DeployTaskDoneEvent {
  exitCode: number
  error?: string
  result?: {
    namespace?: string
    agentCount?: number
  }
}

export type DeployTaskEvent =
  | { type: 'log'; data: { id: number; message: string; createdAt: string | null } }
  | { type: 'done'; data: DeployTaskDoneEvent }

type DeployTaskListener = (event: DeployTaskEvent) => void | Promise<void>

export class DeployTaskManager {
  private subscribers = new Map<number, Set<DeployTaskListener>>()

  private activeTaskIds = new Set<number>()

  private cancelTokens = new Map<
    number,
    {
      cancelled: boolean
      stack?: { cancel: () => Promise<void> }
      cancelSignalled?: boolean
    }
  >()

  constructor(
    private container: ServiceContainer,
    private deploymentDao: DeploymentDao,
    private deploymentLogDao: DeploymentLogDao,
    private envVarDao: EnvVarDao,
  ) {}

  async start(config: Record<string, unknown>): Promise<Deployment> {
    const task = this.deploymentDao.create({
      namespace: (config.namespace as string) ?? 'shadowob-cloud',
      templateSlug: (config.templateSlug as string) ?? (config.name as string) ?? null,
      status: 'pending',
      config,
      agentCount: 0,
    })

    this.activeTaskIds.add(task.id)
    queueMicrotask(() => {
      void this.run(task.id, config)
    })

    return task
  }

  isActive(taskId: number): boolean {
    return this.activeTaskIds.has(taskId)
  }

  async cancel(taskId: number): Promise<{ ok: boolean; status?: string; error?: string }> {
    const task = this.deploymentDao.findById(taskId)
    if (!task) return { ok: false, error: 'Deployment task not found' }

    if (!this.activeTaskIds.has(taskId)) {
      if (task.status === 'pending' || task.status === 'running' || task.status === 'cancelling') {
        this.deploymentDao.update(taskId, { status: 'failed', error: 'cancelled by user' })
        this.appendLog(taskId, '[cancel] Task was not running; marked cancelled')
        return { ok: true, status: 'failed' }
      }
      return { ok: false, error: `Cannot cancel deployment in status "${task.status}"` }
    }

    const token = this.cancelTokens.get(taskId)
    if (!token) return { ok: true, status: 'cancelling' }

    token.cancelled = true
    this.deploymentDao.update(taskId, { status: 'cancelling' })
    this.appendLog(taskId, '[cancel] User requested cancellation')
    if (token.stack && !token.cancelSignalled) {
      token.cancelSignalled = true
      await token.stack.cancel().catch((err) => {
        this.appendLog(taskId, `[cancel] Failed to signal Pulumi cancellation: ${String(err)}`)
      })
    }
    return { ok: true, status: 'cancelling' }
  }

  subscribe(taskId: number, listener: DeployTaskListener): () => void {
    const listeners = this.subscribers.get(taskId) ?? new Set<DeployTaskListener>()
    listeners.add(listener)
    this.subscribers.set(taskId, listeners)

    return () => {
      const current = this.subscribers.get(taskId)
      if (!current) return
      current.delete(listener)
      if (current.size === 0) {
        this.subscribers.delete(taskId)
      }
    }
  }

  private emit(taskId: number, event: DeployTaskEvent): void {
    const listeners = this.subscribers.get(taskId)
    if (!listeners?.size) return

    for (const listener of listeners) {
      void listener(event)
    }
  }

  private appendLog(taskId: number, message: string): void {
    const sanitized = redactSecrets(message)
    const log = this.deploymentLogDao.create({
      deploymentId: taskId,
      event: 'log',
      message: sanitized,
    })
    this.emit(taskId, {
      type: 'log',
      data: { id: log.id, message: sanitized, createdAt: log.createdAt },
    })
  }

  private appendOutput(taskId: number, output: string): void {
    for (const line of output.split('\n').filter(Boolean)) {
      if (shouldSkipProgressLine(line)) continue
      this.appendLog(taskId, line)
    }
  }

  private async buildEnvOverrides(config: Record<string, unknown>): Promise<{
    envOverrides: Record<string, string>
    templateConfig: Record<string, unknown>
  }> {
    const envOverrides: Record<string, string> = {}
    const namespace = typeof config.namespace === 'string' ? config.namespace : undefined
    const scopes = [GLOBAL_ENV_SCOPE]
    if (namespace) scopes.push(toDeploymentEnvScope(namespace))

    const savedEnvVars = this.envVarDao.findAllDecryptedByScopes(scopes)
    Object.assign(envOverrides, savedEnvVars)

    const wizardEnvVars = config.envVars as Record<string, string> | undefined
    if (wizardEnvVars && typeof wizardEnvVars === 'object') {
      for (const [key, value] of Object.entries(wizardEnvVars)) {
        if (typeof value === 'string' && value !== '__SAVED__' && value.trim() !== '') {
          envOverrides[key] = value
        }
      }
    }

    const { envVars: _envVars, ...templateConfig } = config
    const policy = await collectRuntimeEnvRefPolicy(templateConfig)
    return { envOverrides: applyRuntimeEnvRefPolicy(envOverrides, policy), templateConfig }
  }

  private async run(taskId: number, config: Record<string, unknown>): Promise<void> {
    const { envOverrides, templateConfig } = await this.buildEnvOverrides(config)
    const { shadowUrl, podShadowUrl, shadowToken } = resolveCloudSaasShadowRuntime(envOverrides)
    const cancelToken = { cancelled: false } as {
      cancelled: boolean
      stack?: { cancel: () => Promise<void> }
    }
    this.cancelTokens.set(taskId, cancelToken)

    try {
      this.deploymentDao.update(taskId, {
        status: 'running',
        namespace:
          (templateConfig.namespace as string) ?? (config.namespace as string) ?? 'shadowob-cloud',
        templateSlug: (config.templateSlug as string) ?? (config.name as string) ?? null,
        config,
      })

      this.appendLog(taskId, 'Starting deployment...')

      const result = await this.container.deploymentRuntime.deployFromSnapshot({
        configSnapshot: templateConfig,
        runtimeEnvVars: envOverrides,
        namespace: templateConfig.namespace as string | undefined,
        dryRun: templateConfig.dryRun as boolean | undefined,
        shadowUrl,
        shadowToken,
        k8sShadowUrl: podShadowUrl,
        onOutput: (output: string) => {
          this.appendOutput(taskId, output)
        },
        onStackReady: (stack: { cancel: () => Promise<void> }) => {
          cancelToken.stack = stack
        },
        isCancelled: () => cancelToken.cancelled,
      })

      if (cancelToken.cancelled) {
        throw new Error('Deployment cancelled by user')
      }

      this.deploymentDao.update(taskId, {
        namespace: result.namespace ?? (config.namespace as string) ?? 'shadowob-cloud',
        templateSlug: (config.templateSlug as string) ?? (config.name as string) ?? null,
        status: 'deployed',
        config,
        agentCount: result.agentCount ?? 0,
        error: null,
      })

      const doneEvent: DeployTaskDoneEvent = {
        exitCode: 0,
        result: {
          namespace: result.namespace,
          agentCount: result.agentCount,
        },
      }
      this.emit(taskId, { type: 'done', data: doneEvent })
    } catch (error) {
      const message = (error as Error).message
      const cancelled = cancelToken.cancelled || /cancel/i.test(message)
      this.deploymentDao.update(taskId, {
        status: 'failed',
        error: cancelled ? 'cancelled by user' : message,
      })
      this.appendLog(taskId, cancelled ? `Cancelled: ${message}` : `Error: ${message}`)
      this.emit(taskId, { type: 'done', data: { exitCode: 1, error: message } })
    } finally {
      this.activeTaskIds.delete(taskId)
      this.cancelTokens.delete(taskId)
    }
  }
}
