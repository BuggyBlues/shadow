import { readdir, readFile, stat } from 'node:fs/promises'
import { homedir } from 'node:os'
import { join } from 'node:path'
import type { ShadowAgentUsageSnapshotInput, ShadowClient } from '@shadowob/sdk'
import type { ShadowRuntimeLogger } from '../types.js'

type UsageArtifact = {
  sessionId: string
  sessionKey: string
  runId: string | null
  generatedAt: string
  provider: string
  model: string | null
  modelApi: string | null
  inputTokens: number | null
  outputTokens: number | null
  cacheReadTokens: number | null
  cacheWriteTokens: number | null
  totalTokens: number | null
}

type AssistantCostSummary = {
  totalUsd: number | null
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function isSafeOpenClawAgentId(agentId: string): boolean {
  return !agentId.includes('/') && !agentId.includes('\\') && !agentId.includes('..')
}

function stateDir(): string {
  return process.env.OPENCLAW_STATE_DIR ?? join(homedir(), '.openclaw')
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null
}

function asString(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null
}

function asNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}

function parseLine(line: string): Record<string, unknown> | null {
  try {
    return asRecord(JSON.parse(line))
  } catch {
    return null
  }
}

function readUsageNumber(usage: Record<string, unknown>, keys: string[]): number | null {
  for (const key of keys) {
    const value = asNumber(usage[key])
    if (value !== null) return Math.round(value)
  }
  return null
}

function artifactFromLine(line: Record<string, unknown>, sessionKey: string): UsageArtifact | null {
  if (line.type !== 'trace.artifacts' || line.sessionKey !== sessionKey) return null
  const data = asRecord(line.data)
  const usage = asRecord(data?.usage)
  if (!usage) return null

  const sessionId = asString(line.sessionId)
  const generatedAt = asString(line.ts) ?? asString(data?.capturedAt)
  const provider = asString(line.provider) ?? 'openclaw'
  if (!sessionId || !generatedAt) return null

  return {
    sessionId,
    sessionKey,
    runId: asString(line.runId),
    generatedAt,
    provider,
    model: asString(line.modelId),
    modelApi: asString(line.modelApi),
    inputTokens: readUsageNumber(usage, ['input', 'inputTokens', 'promptTokens']),
    outputTokens: readUsageNumber(usage, ['output', 'outputTokens', 'completionTokens']),
    cacheReadTokens: readUsageNumber(usage, ['cacheRead', 'cacheReadTokens']),
    cacheWriteTokens: readUsageNumber(usage, ['cacheWrite', 'cacheWriteTokens']),
    totalTokens: readUsageNumber(usage, ['total', 'totalTokens', 'total_tokens']),
  }
}

async function listTrajectoryFiles(openClawAgentId: string): Promise<string[]> {
  if (!isSafeOpenClawAgentId(openClawAgentId)) return []
  const sessionsDir = join(stateDir(), 'agents', openClawAgentId, 'sessions')
  const entries = await readdir(sessionsDir, { withFileTypes: true }).catch(() => [])
  const files = entries
    .filter((entry) => entry.isFile() && entry.name.endsWith('.trajectory.jsonl'))
    .map((entry) => join(sessionsDir, entry.name))

  const withStats = await Promise.all(
    files.map(async (file) => ({
      file,
      mtimeMs: (await stat(file).catch(() => null))?.mtimeMs ?? 0,
    })),
  )

  return withStats
    .sort((left, right) => right.mtimeMs - left.mtimeMs)
    .slice(0, 8)
    .map((entry) => entry.file)
}

async function readLatestArtifact(params: {
  openClawAgentId: string
  sessionKey: string
  sinceMs: number
}): Promise<UsageArtifact | null> {
  const files = await listTrajectoryFiles(params.openClawAgentId)
  for (const file of files) {
    const text = await readFile(file, 'utf8').catch(() => '')
    if (!text) continue

    const lines = text.split('\n').filter(Boolean)
    for (let index = lines.length - 1; index >= 0; index -= 1) {
      const line = parseLine(lines[index]!)
      if (!line) continue
      const artifact = artifactFromLine(line, params.sessionKey)
      if (!artifact) continue
      if (Date.parse(artifact.generatedAt) + 1000 < params.sinceMs) continue
      return artifact
    }
  }
  return null
}

function costFromAssistantMessage(message: Record<string, unknown>): number | null {
  const usage = asRecord(message.usage)
  const cost = asRecord(usage?.cost)
  return asNumber(cost?.total)
}

async function readAssistantCosts(
  openClawAgentId: string,
  sessionId: string,
): Promise<AssistantCostSummary> {
  if (!isSafeOpenClawAgentId(openClawAgentId)) return { totalUsd: null }
  const sessionFile = join(stateDir(), 'agents', openClawAgentId, 'sessions', `${sessionId}.jsonl`)
  const text = await readFile(sessionFile, 'utf8').catch(() => '')
  if (!text) return { totalUsd: null }

  let totalUsd = 0
  let foundCost = false
  let sawAssistant = false
  const lines = text.split('\n').filter(Boolean)
  for (let index = lines.length - 1; index >= 0; index -= 1) {
    const line = parseLine(lines[index]!)
    const message = asRecord(line?.message)
    if (!message) continue
    const role = message?.role
    if (role === 'user' && sawAssistant) break
    if (role !== 'assistant') continue

    sawAssistant = true
    const cost = costFromAssistantMessage(message)
    if (cost === null) continue
    foundCost = true
    totalUsd += cost
  }

  return { totalUsd: foundCost ? totalUsd : null }
}

function buildSnapshot(
  artifact: UsageArtifact,
  costs: AssistantCostSummary,
): ShadowAgentUsageSnapshotInput {
  return {
    source: 'openclaw-trajectory',
    model: artifact.model,
    totalUsd: costs.totalUsd,
    inputTokens: artifact.inputTokens,
    outputTokens: artifact.outputTokens,
    cacheReadTokens: artifact.cacheReadTokens,
    cacheWriteTokens: artifact.cacheWriteTokens,
    totalTokens: artifact.totalTokens,
    providers: [
      {
        provider: artifact.provider,
        amountUsd: costs.totalUsd,
        usageLabel: artifact.model,
        inputTokens: artifact.inputTokens,
        outputTokens: artifact.outputTokens,
        totalTokens: artifact.totalTokens,
        raw: artifact.modelApi,
      },
    ],
    raw: {
      sessionId: artifact.sessionId,
      sessionKey: artifact.sessionKey,
      runId: artifact.runId,
      provider: artifact.provider,
      model: artifact.model,
      modelApi: artifact.modelApi,
      cacheReadTokens: artifact.cacheReadTokens,
      cacheWriteTokens: artifact.cacheWriteTokens,
    },
    generatedAt: artifact.generatedAt,
  }
}

export async function reportShadowUsageSnapshot(params: {
  client: ShadowClient
  shadowAgentId: string | null
  openClawAgentId: string
  sessionKey: string | null
  runtime: ShadowRuntimeLogger
  sinceMs: number
}): Promise<void> {
  if (!params.shadowAgentId || !params.sessionKey) return

  let artifact: UsageArtifact | null = null
  for (let attempt = 0; attempt < 6; attempt += 1) {
    artifact = await readLatestArtifact({
      openClawAgentId: params.openClawAgentId,
      sessionKey: params.sessionKey,
      sinceMs: params.sinceMs,
    })
    if (artifact) break
    await delay(250)
  }

  if (!artifact) {
    params.runtime.log?.('[usage] No fresh OpenClaw usage artifact found for this dispatch')
    return
  }

  const costs = await readAssistantCosts(params.openClawAgentId, artifact.sessionId)
  await params.client.reportAgentUsageSnapshot(params.shadowAgentId, buildSnapshot(artifact, costs))
  params.runtime.log?.(
    `[usage] Reported ${artifact.totalTokens ?? 0} token(s) for Shadow agent ${params.shadowAgentId}`,
  )
}
