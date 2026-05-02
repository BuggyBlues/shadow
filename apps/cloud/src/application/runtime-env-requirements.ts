import { collectTemplateRefs } from '../config/index.js'
import { loadAllPlugins } from '../plugins/loader.js'
import { getPluginRegistry } from '../plugins/registry.js'
import type {
  PluginAuthField,
  PluginDefinition,
  PluginSecretField,
  ProviderCatalog,
} from '../plugins/types.js'

export interface RuntimeEnvField {
  key: string
  label: string
  description?: string
  required: boolean
  sensitive: boolean
  placeholder?: string
  source: 'template' | 'plugin'
  sourceId: string
  sourceLabel: string
  helpUrl?: string
}

export interface RuntimeEnvRefPolicy {
  /** Env ref aliases that should be satisfied by a canonical field. */
  aliases: Record<string, string>
  /** Env refs intentionally ignored by active plugins. */
  ignoredKeys: string[]
  /** Env refs that should not be exposed as standalone deploy fields. */
  hiddenKeys: string[]
}

function collectPluginIds(value: unknown, out = new Set<string>(), depth = 0): Set<string> {
  if (depth > 32 || !value || typeof value !== 'object') return out

  if (Array.isArray(value)) {
    for (const item of value) collectPluginIds(item, out, depth + 1)
    return out
  }

  const record = value as Record<string, unknown>
  if (typeof record.plugin === 'string') out.add(record.plugin)
  for (const child of Object.values(record)) collectPluginIds(child, out, depth + 1)
  return out
}

function collectEnvRefKeys(configSnapshot: unknown): Set<string> {
  return new Set(
    collectTemplateRefs(configSnapshot)
      .filter((ref) => ref.type === 'env')
      .map((ref) => ref.key),
  )
}

let pluginLoadPromise: Promise<void> | null = null

async function ensurePluginsLoaded(): Promise<void> {
  const registry = getPluginRegistry()
  if (registry.size > 0) return
  pluginLoadPromise ??= loadAllPlugins(registry).finally(() => {
    pluginLoadPromise = null
  })
  await pluginLoadPromise
}

function addProviderCatalogKeys(keys: Set<string>, catalog: ProviderCatalog): void {
  if (catalog.allowEnvDetection === false) return

  keys.add(catalog.envKey)
  for (const alias of catalog.envKeyAliases ?? []) keys.add(alias)
  if (catalog.baseUrlEnvKey) keys.add(catalog.baseUrlEnvKey)
  if (catalog.modelEnvKey) keys.add(catalog.modelEnvKey)
}

function addPluginSecretKeys(keys: Set<string>, plugin: PluginDefinition): void {
  for (const field of plugin.secretFields ?? []) {
    if (field.runtime === false) continue
    keys.add(field.key)
    for (const alias of field.aliases ?? []) keys.add(alias)
  }
}

function collectEnvRefPolicy(
  registry: ReturnType<typeof getPluginRegistry>,
  pluginIds: Set<string>,
): RuntimeEnvRefPolicy {
  const aliases = new Map<string, string>()
  const ignoredKeys = new Set<string>()

  for (const pluginId of pluginIds) {
    const plugin = registry.get(pluginId)
    if (!plugin) continue

    for (const field of plugin.secretFields ?? []) {
      if (field.runtime === false) continue
      for (const alias of field.aliases ?? []) {
        if (alias && alias !== field.key) aliases.set(alias, field.key)
      }
    }

    for (const key of plugin.ignoredEnvRefs ?? []) ignoredKeys.add(key)
  }

  return {
    aliases: Object.fromEntries([...aliases.entries()].sort(([a], [b]) => a.localeCompare(b))),
    ignoredKeys: [...ignoredKeys].sort(),
    hiddenKeys: [...new Set([...aliases.keys(), ...ignoredKeys])].sort(),
  }
}

function collectProviderCatalogKeys(
  registry: ReturnType<typeof getPluginRegistry>,
  pluginIds: Set<string>,
): Set<string> {
  const keys = new Set<string>()
  const allProviderCatalogs = registry.getAll().flatMap((plugin) => plugin.providerCatalogs ?? [])

  for (const pluginId of pluginIds) {
    const plugin = registry.get(pluginId)
    if (plugin) {
      for (const catalog of plugin.providerCatalogs ?? []) addProviderCatalogKeys(keys, catalog)
    }

    if (pluginId === 'model-provider') {
      for (const catalog of allProviderCatalogs) addProviderCatalogKeys(keys, catalog)
    }
  }

  return keys
}

function isSensitiveEnvKey(key: string): boolean {
  return /(TOKEN|SECRET|PASSWORD|PRIVATE|CREDENTIAL|API_KEY|_KEY$|_B64$)/i.test(key)
}

function envKeyToLabel(key: string): string {
  return key
    .toLowerCase()
    .split('_')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

function fieldFromEnvRef(key: string): RuntimeEnvField {
  return {
    key,
    label: envKeyToLabel(key),
    required: true,
    sensitive: isSensitiveEnvKey(key),
    source: 'template',
    sourceId: 'template',
    sourceLabel: 'Template',
  }
}

function fieldFromAuth(field: PluginAuthField, plugin: PluginDefinition): RuntimeEnvField {
  return {
    key: field.key,
    label: field.label || envKeyToLabel(field.key),
    description: field.description,
    required: field.required,
    sensitive: field.sensitive,
    placeholder: field.placeholder,
    source: 'plugin',
    sourceId: plugin.manifest.id,
    sourceLabel: plugin.manifest.name,
    helpUrl: field.helpUrl ?? plugin.manifest.docs ?? plugin.manifest.website,
  }
}

function mergeSecretField(
  base: RuntimeEnvField | undefined,
  field: PluginSecretField,
  plugin: PluginDefinition,
): RuntimeEnvField {
  return {
    key: field.key,
    label: field.label ?? base?.label ?? envKeyToLabel(field.key),
    description: field.description ?? base?.description,
    required: field.required ?? base?.required ?? false,
    sensitive: field.sensitive ?? base?.sensitive ?? isSensitiveEnvKey(field.key),
    placeholder: field.placeholder ?? base?.placeholder,
    source: 'plugin',
    sourceId: plugin.manifest.id,
    sourceLabel: plugin.manifest.name,
    helpUrl: field.helpUrl ?? base?.helpUrl ?? plugin.manifest.docs ?? plugin.manifest.website,
  }
}

function addField(fields: Map<string, RuntimeEnvField>, field: RuntimeEnvField): void {
  const existing = fields.get(field.key)
  fields.set(field.key, {
    ...existing,
    ...field,
    required: Boolean(existing?.required || field.required),
    sensitive: Boolean(existing?.sensitive || field.sensitive),
    description: field.description ?? existing?.description,
    placeholder: field.placeholder ?? existing?.placeholder,
    label: field.label || existing?.label || field.key,
    source: existing?.source ?? field.source,
    sourceId: existing?.sourceId ?? field.sourceId,
    sourceLabel: existing?.sourceLabel ?? field.sourceLabel,
    helpUrl: existing?.helpUrl ?? field.helpUrl,
  })
}

function addPluginSecretFields(
  fields: Map<string, RuntimeEnvField>,
  plugin: PluginDefinition,
): void {
  const manifestFields = new Map(
    plugin.manifest.auth.fields.map((field) => [field.key, fieldFromAuth(field, plugin)]),
  )

  for (const manifestField of manifestFields.values()) addField(fields, manifestField)

  for (const field of plugin.secretFields ?? []) {
    if (field.runtime === false) continue
    addField(fields, mergeSecretField(manifestFields.get(field.key), field, plugin))
  }
}

/**
 * Collect runtime env keys a SaaS deployment may need from the plugin graph.
 *
 * This intentionally returns key names only. Values still come from the user's
 * encrypted Cloud env store, explicit deploy input, or local process.env fallback.
 */
export async function collectRuntimeEnvRequirements(configSnapshot: unknown): Promise<string[]> {
  const pluginIds = collectPluginIds(configSnapshot)
  if (pluginIds.size === 0) return []

  await ensurePluginsLoaded()

  const registry = getPluginRegistry()
  const keys = new Set<string>()
  const providerCatalogKeys = collectProviderCatalogKeys(registry, pluginIds)

  for (const pluginId of pluginIds) {
    const plugin = registry.get(pluginId)
    if (plugin) addPluginSecretKeys(keys, plugin)
  }

  for (const key of providerCatalogKeys) keys.add(key)

  return [...keys].sort()
}

export async function collectRuntimeEnvRefPolicy(
  configSnapshot: unknown,
): Promise<RuntimeEnvRefPolicy> {
  const pluginIds = collectPluginIds(configSnapshot)
  if (pluginIds.size === 0) return { aliases: {}, ignoredKeys: [], hiddenKeys: [] }

  await ensurePluginsLoaded()
  const policy = collectEnvRefPolicy(getPluginRegistry(), pluginIds)
  const envRefKeys = collectEnvRefKeys(configSnapshot)
  const ignoredKeys = policy.ignoredKeys.filter((key) => envRefKeys.has(key))
  return {
    ...policy,
    ignoredKeys,
    hiddenKeys: [...new Set([...Object.keys(policy.aliases), ...ignoredKeys])].sort(),
  }
}

export function applyRuntimeEnvRefPolicy(
  envVars: Record<string, string>,
  policy: Pick<RuntimeEnvRefPolicy, 'aliases' | 'ignoredKeys'>,
): Record<string, string> {
  const next = { ...envVars }

  for (const [alias, canonical] of Object.entries(policy.aliases)) {
    const aliasValue = next[alias]
    const canonicalValue = next[canonical]
    if (canonicalValue === undefined && aliasValue !== undefined) {
      next[canonical] = aliasValue
    } else if (canonicalValue !== undefined && aliasValue === undefined) {
      next[alias] = canonicalValue
    }
  }

  for (const key of policy.ignoredKeys) {
    if (next[key] === undefined) next[key] = ''
  }

  return next
}

/**
 * Collect user-fillable runtime env slots for the deploy UI.
 *
 * This includes direct `${env:VAR}` template references plus fields declared by
 * plugins used by the template. The richer metadata lets Cloud render labels,
 * descriptions, sensitivity, required state, and placeholders without
 * hardcoding per-plugin forms.
 */
export async function collectRuntimeEnvFields(configSnapshot: unknown): Promise<RuntimeEnvField[]> {
  const fields = new Map<string, RuntimeEnvField>()
  const pluginIds = collectPluginIds(configSnapshot)
  let providerCatalogKeys = new Set<string>()
  let envRefPolicy: RuntimeEnvRefPolicy = { aliases: {}, ignoredKeys: [], hiddenKeys: [] }

  if (pluginIds.size > 0) {
    await ensurePluginsLoaded()
    const registry = getPluginRegistry()
    providerCatalogKeys = collectProviderCatalogKeys(registry, pluginIds)
    envRefPolicy = collectEnvRefPolicy(registry, pluginIds)
  }
  const aliasToKey = new Map(Object.entries(envRefPolicy.aliases))
  const ignoredKeys = new Set(envRefPolicy.ignoredKeys)

  for (const ref of collectTemplateRefs(configSnapshot)) {
    if (ref.type !== 'env') continue
    if (ignoredKeys.has(ref.key)) continue

    const fieldKey = aliasToKey.get(ref.key) ?? ref.key
    if (!providerCatalogKeys.has(ref.key) && !providerCatalogKeys.has(fieldKey)) {
      addField(fields, fieldFromEnvRef(fieldKey))
    }
  }

  if (pluginIds.size > 0) {
    const registry = getPluginRegistry()

    for (const pluginId of pluginIds) {
      const plugin = registry.get(pluginId)
      if (plugin && pluginId !== 'model-provider') addPluginSecretFields(fields, plugin)
    }
  }

  return [...fields.values()].sort((a, b) => a.key.localeCompare(b.key))
}
