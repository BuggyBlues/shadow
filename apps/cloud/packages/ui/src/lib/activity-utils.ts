import { type ActivityEntry, type ActivityTypeValue } from '@/stores/app'

type RawActivityRecord = Record<string, unknown>
type MetadataEntry = { label: string; value: string }

const DATE_KEY_SET = new Set(['createdAt', 'createdat', 'created_at'])

const METADATA_KEY_ALIASES: Record<string, string> = {
  template: 'template_slug',
  templateSlug: 'template_slug',
  template_slug: 'template_slug',
  slug: 'template_slug',
  taskId: 'task_id',
  task_id: 'task_id',
  deploymentId: 'deployment_id',
  deployment_id: 'deployment_id',
  clusterId: 'cluster_id',
  cluster_id: 'cluster_id',
  configId: 'config_id',
  config_id: 'config_id',
  resourceTier: 'resource_tier',
  resource_tier: 'resource_tier',
  monthlyCost: 'monthly_cost',
  monthly_cost: 'monthly_cost',
  hourlyCost: 'hourly_cost',
  hourly_cost: 'hourly_cost',
  billingPrecisionMinutes: 'billing_precision_minutes',
  billing_precision_minutes: 'billing_precision_minutes',
  userId: 'user_id',
  user_id: 'user_id',
  redeployFrom: 'redeploy_from',
  wasApproved: 'was_approved',
  name: 'name',
  key: 'key',
  count: 'count',
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return (
    typeof value === 'object' && value !== null && Object.getPrototypeOf(value) === Object.prototype
  )
}

function toRecord(value: unknown): Record<string, unknown> {
  return isRecord(value) ? (value as Record<string, unknown>) : {}
}

function toFiniteNumber(value: unknown): number | undefined {
  if (typeof value === 'number') return Number.isFinite(value) ? value : undefined
  if (typeof value === 'string') {
    const trimmed = value.trim()
    if (!trimmed) return undefined
    const parsed = Number(trimmed)
    return Number.isFinite(parsed) ? parsed : undefined
  }
  return undefined
}

function toStringValue(value: unknown): string | undefined {
  if (value === null || value === undefined || value === '') return undefined
  if (typeof value === 'string') {
    const normalized = value.trim()
    return normalized.length > 0 ? normalized : undefined
  }
  if (typeof value === 'number' || typeof value === 'boolean' || typeof value === 'bigint') {
    return String(value)
  }
  if (value instanceof Date) return value.toISOString()
  if (value instanceof Error) return value.message || value.name

  if (isRecord(value)) {
    try {
      return JSON.stringify(value)
    } catch {
      return undefined
    }
  }

  if (Array.isArray(value)) {
    return value.length > 0 ? JSON.stringify(value) : undefined
  }

  return String(value)
}

function toSnakeCase(input: string): string {
  return input
    .trim()
    .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
    .replace(/[\s-]+/g, '_')
    .toLowerCase()
}

function normalizeMetadataLabel(label: string): string {
  return METADATA_KEY_ALIASES[label] ?? toSnakeCase(label)
}

function parseActivityTimestamp(value: unknown): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string') {
    const parsed = Date.parse(value)
    if (!Number.isNaN(parsed)) return parsed
    const direct = toFiniteNumber(value)
    if (direct !== undefined) return direct
  }
  if (value instanceof Date) {
    const parsed = value.getTime()
    if (!Number.isNaN(parsed)) return parsed
  }
  return Date.now()
}

function firstNonEmpty(values: unknown[]): string | undefined {
  for (const value of values) {
    const text = toStringValue(value)
    if (text) return text
  }
  return undefined
}

function normalizeActivityType(value: unknown): ActivityTypeValue {
  return typeof value === 'string' && value.trim()
    ? (value.trim() as ActivityTypeValue)
    : 'settings'
}

function collectMetadataEntries(
  rawMeta: Record<string, unknown>,
  explicitPairs: Array<[string, unknown]>,
): MetadataEntry[] {
  const list: MetadataEntry[] = []
  const seen = new Set<string>()

  const addEntry = (label: string, rawValue: unknown) => {
    const normalizedLabel = normalizeMetadataLabel(label)
    if (seen.has(normalizedLabel)) return
    const value = toStringValue(rawValue)
    if (!value) return
    seen.add(normalizedLabel)
    list.push({ label: normalizedLabel, value })
  }

  for (const [label, rawValue] of explicitPairs) {
    if (!DATE_KEY_SET.has(label)) addEntry(label, rawValue)
  }

  for (const [label, rawValue] of Object.entries(rawMeta)) {
    if (DATE_KEY_SET.has(label)) continue
    if (label === 'meta') continue
    addEntry(label, rawValue)
  }

  return list
}

export function formatActivityAbsoluteTime(timestamp: number): string {
  const date = new Date(timestamp)
  const year = date.getFullYear()
  const month = `${date.getMonth() + 1}`.padStart(2, '0')
  const day = `${date.getDate()}`.padStart(2, '0')
  const hour = `${date.getHours()}`.padStart(2, '0')
  const minute = `${date.getMinutes()}`.padStart(2, '0')

  return `${year}/${month}/${day} ${hour}:${minute}`
}

export function normalizeActivityRecord(record: RawActivityRecord): ActivityEntry {
  const rawMeta = toRecord(record.meta)
  const type = normalizeActivityType(record.type)

  const namespace = firstNonEmpty([record.namespace, rawMeta.namespace, rawMeta.namespace_name])
  const template = firstNonEmpty([
    record.template,
    rawMeta.template,
    rawMeta.template_slug,
    rawMeta.templateSlug,
    rawMeta.slug,
  ])
  const templateSlug = firstNonEmpty([record.templateSlug, rawMeta.templateSlug, rawMeta.slug])
  const slug = firstNonEmpty([record.slug, rawMeta.slug, rawMeta.templateSlug])
  const taskId = firstNonEmpty([record.taskId, rawMeta.taskId, rawMeta.task_id])
  const deploymentId = firstNonEmpty([
    record.deploymentId,
    rawMeta.deploymentId,
    rawMeta.deployment_id,
  ])
  const clusterId = firstNonEmpty([rawMeta.clusterId, rawMeta.cluster_id])
  const configId = firstNonEmpty([rawMeta.configId, rawMeta.config_id])
  const userId = firstNonEmpty([record.userId, rawMeta.userId, rawMeta.user_id])
  const resourceTier = firstNonEmpty([
    record.resourceTier,
    rawMeta.resourceTier,
    rawMeta.resource_tier,
  ])
  const name = firstNonEmpty([rawMeta.name, record.template])
  const key = firstNonEmpty([rawMeta.key])
  const count = firstNonEmpty([rawMeta.count])
  const wasApproved = toStringValue(rawMeta.wasApproved ?? rawMeta.was_approved)
  const redeployFrom = firstNonEmpty([rawMeta.redeployFrom, rawMeta.redeploy_from])

  const monthlyCost = toFiniteNumber(
    record.monthlyCost ?? rawMeta.monthlyCost ?? rawMeta.monthly_cost,
  )
  const hourlyCost = toFiniteNumber(rawMeta.hourlyCost ?? rawMeta.hourly_cost)
  const billingPrecisionMinutes = toFiniteNumber(
    rawMeta.billingPrecisionMinutes ?? rawMeta.billing_precision_minutes,
  )

  const metadata = collectMetadataEntries(rawMeta, [
    ['namespace', namespace],
    ['template', template],
    ['template_slug', templateSlug],
    ['template_slug', slug],
    ['slug', slug],
    ['task_id', taskId],
    ['deployment_id', deploymentId],
    ['cluster_id', clusterId],
    ['config_id', configId],
    ['user_id', userId],
    ['resource_tier', resourceTier],
    ['monthly_cost', monthlyCost],
    ['hourly_cost', hourlyCost],
    ['billing_precision_minutes', billingPrecisionMinutes],
    ['name', name],
    ['key', key],
    ['count', count],
    ['was_approved', wasApproved],
    ['redeploy_from', redeployFrom],
  ])

  return {
    ...rawMeta,
    id: toStringValue(record.id) ?? `activity-${Math.random().toString(36).slice(2, 10)}`,
    type,
    title: toStringValue(record.title) ?? '',
    description: toStringValue(record.description),
    detail: toStringValue(record.detail),
    namespace: namespace,
    template,
    templateSlug,
    slug,
    taskId,
    deploymentId,
    monthlyCost,
    resourceTier,
    userId,
    timestamp: parseActivityTimestamp(
      record.timestamp ?? record.createdAt ?? record.created_at ?? record.createdAtTs,
    ),
    metadata,
  }
}
