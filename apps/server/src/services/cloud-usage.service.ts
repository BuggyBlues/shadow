import type {
  AgentCostSummary,
  CostOverviewSummary,
  NamespaceCostSummary,
  ProviderUsageSummary,
} from '@shadowob/cloud'
import { extractCloudSaasRuntime, summarizeCostOverview } from '@shadowob/cloud'
import type { AgentDao } from '../dao/agent.dao'
import type { CloudUsageDao } from '../dao/cloud-usage.dao'
import type { cloudDeployments } from '../db/schema'

type CloudDeploymentRow = typeof cloudDeployments.$inferSelect

export type AgentUsageProviderInput = {
  provider: string
  amountUsd?: number | null
  usageLabel?: string | null
  raw?: string | null
  inputTokens?: number | null
  outputTokens?: number | null
  totalTokens?: number | null
}

export type AgentUsageSnapshotInput = {
  source?: string
  model?: string | null
  totalUsd?: number | null
  inputTokens?: number | null
  outputTokens?: number | null
  cacheReadTokens?: number | null
  cacheWriteTokens?: number | null
  totalTokens?: number | null
  providers?: AgentUsageProviderInput[]
  raw?: Record<string, unknown>
  generatedAt?: string
}

type DeploymentAgentRef = {
  agentName: string
  shadowAgentIds: string[]
}

type UsageSnapshotRow = Awaited<ReturnType<CloudUsageDao['findLatestByAgentIds']>>[number]

const TELEMETRY_MISSING_MESSAGE = 'i18n:deployments.costTelemetryMissing'
const USAGE_UNAVAILABLE_MESSAGE = 'i18n:deployments.costUsageUnavailableMessage'

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value)
}

function asString(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null
}

function asNullableNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}

function asNullableInt(value: unknown): number | null {
  const parsed = asNullableNumber(value)
  return parsed === null || parsed < 0 ? null : Math.round(parsed)
}

function sumNullable(values: Array<number | null | undefined>): number | null {
  const filtered = values.filter((value): value is number => typeof value === 'number')
  return filtered.length > 0 ? filtered.reduce((sum, value) => sum + value, 0) : null
}

function normalizeProvider(input: AgentUsageProviderInput): ProviderUsageSummary | null {
  const provider = asString(input.provider)
  if (!provider) return null

  return {
    provider: provider.slice(0, 120),
    amountUsd: asNullableNumber(input.amountUsd),
    usageLabel: asString(input.usageLabel)?.slice(0, 200) ?? null,
    raw: asString(input.raw)?.slice(0, 1000) ?? null,
    inputTokens: asNullableInt(input.inputTokens),
    outputTokens: asNullableInt(input.outputTokens),
    totalTokens: asNullableInt(input.totalTokens),
  }
}

function mergeProviders(providers: ProviderUsageSummary[]): ProviderUsageSummary[] {
  const byProvider = new Map<string, ProviderUsageSummary>()
  for (const provider of providers) {
    const key = provider.provider.toLowerCase()
    const existing = byProvider.get(key)
    if (!existing) {
      byProvider.set(key, provider)
      continue
    }
    byProvider.set(key, {
      provider: existing.provider,
      amountUsd: sumNullable([existing.amountUsd, provider.amountUsd]),
      usageLabel: provider.usageLabel ?? existing.usageLabel,
      raw: provider.raw ?? existing.raw,
      inputTokens: sumNullable([existing.inputTokens, provider.inputTokens]),
      outputTokens: sumNullable([existing.outputTokens, provider.outputTokens]),
      totalTokens: sumNullable([existing.totalTokens, provider.totalTokens]),
    })
  }
  return [...byProvider.values()]
}

type DeploymentAgentConfig = {
  id?: unknown
  replicas?: unknown
}

function getDeploymentAgentNames(deployment: {
  name: string
  agentCount?: number | null
  configSnapshot?: unknown
}): string[] {
  const { configSnapshot } = extractCloudSaasRuntime(deployment.configSnapshot)
  const deployments = configSnapshot?.deployments as
    | { agents?: DeploymentAgentConfig[] }
    | undefined
  const agentNames = (deployments?.agents ?? [])
    .map((agent) => (typeof agent?.id === 'string' ? agent.id : null))
    .filter((agentName): agentName is string => Boolean(agentName))

  if (agentNames.length > 0) return agentNames

  if ((deployment.agentCount ?? 0) > 1) {
    return Array.from(
      { length: deployment.agentCount ?? 0 },
      (_, index) => `${deployment.name}-${index + 1}`,
    )
  }

  return [deployment.name]
}

function readShadowobOptions(
  configSnapshot: Record<string, unknown> | null,
): Record<string, unknown> | null {
  if (!configSnapshot) return null

  const useEntries = Array.isArray(configSnapshot.use) ? configSnapshot.use : []
  for (const entry of useEntries) {
    if (!isRecord(entry)) continue
    if (entry.plugin !== 'shadowob' && entry.plugin !== 'openclaw-shadowob') continue
    return isRecord(entry.options) ? entry.options : null
  }

  const plugins = isRecord(configSnapshot.plugins) ? configSnapshot.plugins : null
  const legacy = plugins?.shadowob ?? plugins?.['openclaw-shadowob']
  return isRecord(legacy) ? legacy : null
}

function readProvisionedBuddies(
  provisionState: ReturnType<typeof extractCloudSaasRuntime>['provisionState'],
): Record<string, { agentId: string }> {
  const shadowob = provisionState?.plugins?.shadowob
  if (!isRecord(shadowob) || !isRecord(shadowob.buddies)) return {}

  const buddies: Record<string, { agentId: string }> = {}
  for (const [buddyId, value] of Object.entries(shadowob.buddies)) {
    if (!isRecord(value)) continue
    const agentId = asString(value.agentId)
    if (agentId) buddies[buddyId] = { agentId }
  }
  return buddies
}

function resolveDeploymentAgentRefs(deployment: CloudDeploymentRow): DeploymentAgentRef[] {
  const { configSnapshot, provisionState } = extractCloudSaasRuntime(deployment.configSnapshot)
  const agentNames = getDeploymentAgentNames(deployment)
  const options = readShadowobOptions(configSnapshot)
  const bindings = Array.isArray(options?.bindings) ? options.bindings.filter(isRecord) : []
  const buddies = readProvisionedBuddies(provisionState)
  const onlyProvisionedBuddy =
    Object.keys(buddies).length === 1 ? Object.values(buddies)[0]?.agentId : null

  return agentNames.map((agentName) => {
    const shadowAgentIds = new Set<string>()
    const matchedBindings = bindings.filter((binding) => binding.agentId === agentName)

    for (const binding of matchedBindings) {
      const targetId = asString(binding.targetId)
      const shadowAgentId = targetId ? buddies[targetId]?.agentId : null
      if (shadowAgentId) shadowAgentIds.add(shadowAgentId)
    }

    const directBuddy = buddies[agentName]?.agentId
    if (directBuddy) shadowAgentIds.add(directBuddy)

    if (shadowAgentIds.size === 0 && agentNames.length === 1 && onlyProvisionedBuddy) {
      shadowAgentIds.add(onlyProvisionedBuddy)
    }

    return { agentName, shadowAgentIds: [...shadowAgentIds] }
  })
}

function buildUnavailableAgentCost(
  agentName: string,
  message = USAGE_UNAVAILABLE_MESSAGE,
): AgentCostSummary {
  return {
    agentName,
    podName: null,
    totalUsd: null,
    billingAmount: null,
    billingUnit: 'usd',
    totalTokens: null,
    providers: [],
    source: 'unavailable',
    message,
  }
}

function buildAgentCostFromSnapshots(
  ref: DeploymentAgentRef,
  snapshots: UsageSnapshotRow[],
): AgentCostSummary {
  if (ref.shadowAgentIds.length === 0) {
    return buildUnavailableAgentCost(ref.agentName)
  }

  if (snapshots.length === 0) {
    return buildUnavailableAgentCost(ref.agentName, TELEMETRY_MISSING_MESSAGE)
  }

  const totalUsd = sumNullable(snapshots.map((snapshot) => snapshot.totalUsd))
  const totalTokens = sumNullable(snapshots.map((snapshot) => snapshot.totalTokens))
  const providers = mergeProviders(snapshots.flatMap((snapshot) => snapshot.providers ?? []))

  return {
    agentName: ref.agentName,
    podName: null,
    totalUsd,
    billingAmount: totalUsd,
    billingUnit: 'usd',
    totalTokens,
    providers,
    source: 'telemetry',
    message: null,
  }
}

export class CloudUsageService {
  constructor(private deps: { agentDao: AgentDao; cloudUsageDao: CloudUsageDao }) {}

  async recordAgentSnapshot(
    agentId: string,
    requesterUserId: string,
    input: AgentUsageSnapshotInput,
  ) {
    const agent = await this.deps.agentDao.findById(agentId)
    if (!agent) throw Object.assign(new Error('Agent not found'), { status: 404 })
    if (agent.userId !== requesterUserId) {
      throw Object.assign(new Error('User does not match agent'), { status: 403 })
    }

    const providers = (input.providers ?? [])
      .map(normalizeProvider)
      .filter((provider): provider is ProviderUsageSummary => Boolean(provider))
    const totalTokens =
      asNullableInt(input.totalTokens) ??
      sumNullable(providers.map((provider) => provider.totalTokens))
    const generatedAt = input.generatedAt ? new Date(input.generatedAt) : new Date()

    return this.deps.cloudUsageDao.upsertAgentSnapshot({
      agentId,
      agentUserId: agent.userId,
      ownerId: agent.ownerId,
      source: asString(input.source)?.slice(0, 64) ?? 'openclaw-trajectory',
      model: asString(input.model)?.slice(0, 255) ?? null,
      totalUsd: asNullableNumber(input.totalUsd),
      inputTokens: asNullableInt(input.inputTokens),
      outputTokens: asNullableInt(input.outputTokens),
      cacheReadTokens: asNullableInt(input.cacheReadTokens),
      cacheWriteTokens: asNullableInt(input.cacheWriteTokens),
      totalTokens,
      providers,
      raw: input.raw,
      generatedAt: Number.isNaN(generatedAt.getTime()) ? new Date() : generatedAt,
    })
  }

  async collectDeploymentCost(deployment: CloudDeploymentRow): Promise<NamespaceCostSummary> {
    const refs = resolveDeploymentAgentRefs(deployment)
    const shadowAgentIds = [...new Set(refs.flatMap((ref) => ref.shadowAgentIds))]
    const snapshots = await this.deps.cloudUsageDao.findLatestByAgentIds(shadowAgentIds)
    const snapshotByAgentId = new Map(snapshots.map((snapshot) => [snapshot.agentId, snapshot]))
    const agents = refs.map((ref) =>
      buildAgentCostFromSnapshots(
        ref,
        ref.shadowAgentIds
          .map((shadowAgentId) => snapshotByAgentId.get(shadowAgentId))
          .filter((snapshot): snapshot is UsageSnapshotRow => Boolean(snapshot)),
      ),
    )
    const totalUsd = sumNullable(agents.map((agent) => agent.totalUsd))

    return {
      namespace: deployment.namespace,
      totalUsd,
      billingAmount: totalUsd,
      billingUnit: 'usd',
      totalTokens: sumNullable(agents.map((agent) => agent.totalTokens)),
      agents,
      availableAgents: agents.filter((agent) => agent.source !== 'unavailable').length,
      unavailableAgents: agents.filter((agent) => agent.source === 'unavailable').length,
      generatedAt: new Date().toISOString(),
    }
  }

  async collectOverview(deployments: CloudDeploymentRow[]): Promise<CostOverviewSummary> {
    const summaries = await Promise.all(
      deployments.map((deployment) => this.collectDeploymentCost(deployment)),
    )
    return summarizeCostOverview(summaries, 'usd')
  }
}
