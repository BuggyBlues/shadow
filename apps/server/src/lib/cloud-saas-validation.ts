import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { z } from 'zod'

export interface CloudSaasValidationSummary {
  valid: boolean
  agents: number
  configurations: number
  violations: Array<{ path: string; prefix: string }>
  extendsErrors: string[]
  templateRefs: { env: number; secret: number; file: number }
}

const agentConfigurationSchema = z
  .object({
    extends: z.string().min(1).optional(),
  })
  .passthrough()

const cloudConfigSchema = z
  .object({
    version: z.string().min(1),
    deployments: z
      .object({
        agents: z
          .array(
            z
              .object({
                id: z.string().min(1),
                configuration: agentConfigurationSchema.default({}),
              })
              .passthrough(),
          )
          .optional(),
      })
      .passthrough()
      .optional(),
    registry: z
      .object({
        configurations: z
          .array(
            z
              .object({
                id: z.string().min(1),
              })
              .passthrough(),
          )
          .optional(),
      })
      .passthrough()
      .optional(),
  })
  .passthrough()

const TEMPLATE_RE = /\$\{(env|secret|file):([^}]+)\}/g

const INLINE_KEY_PREFIXES = [
  'sk-ant-',
  'sk-proj-',
  'sk-',
  'gsk_',
  'xai-',
  'key-',
  'ghp_',
  'github_pat_',
]

function detectInlineKey(value: string): string | null {
  if (/^\$\{(env|secret|file):/.test(value)) return null
  for (const prefix of INLINE_KEY_PREFIXES) {
    if (value.startsWith(prefix) && value.length > prefix.length + 10) {
      return prefix
    }
  }
  return null
}

function validateNoInlineKeys(
  obj: unknown,
  basePath = '',
): Array<{ path: string; prefix: string }> {
  const violations: Array<{ path: string; prefix: string }> = []

  if (typeof obj === 'string') {
    const prefix = detectInlineKey(obj)
    if (prefix) {
      violations.push({ path: basePath || 'root', prefix })
    }
    return violations
  }

  if (Array.isArray(obj)) {
    for (let index = 0; index < obj.length; index += 1) {
      violations.push(...validateNoInlineKeys(obj[index], `${basePath}[${index}]`))
    }
    return violations
  }

  if (obj && typeof obj === 'object') {
    for (const [key, value] of Object.entries(obj)) {
      const path = basePath ? `${basePath}.${key}` : key
      violations.push(...validateNoInlineKeys(value, path))
    }
  }

  return violations
}

function collectTemplateRefs(
  obj: unknown,
): Array<{ type: 'env' | 'secret' | 'file'; key: string }> {
  const refs: Array<{ type: 'env' | 'secret' | 'file'; key: string }> = []

  function walk(value: unknown) {
    if (typeof value === 'string') {
      for (const match of value.matchAll(TEMPLATE_RE)) {
        const type = match[1]
        const key = match[2]
        if (!type || !key) continue
        refs.push({
          type: type as 'env' | 'secret' | 'file',
          key,
        })
      }
      return
    }

    if (Array.isArray(value)) {
      for (const item of value) walk(item)
      return
    }

    if (value && typeof value === 'object') {
      for (const child of Object.values(value)) walk(child)
    }
  }

  walk(obj)
  return refs
}

export function extractRequiredEnvVars(config: unknown): string[] {
  return [
    ...new Set(
      collectTemplateRefs(config)
        .filter((ref) => ref.type === 'env')
        .map((ref) => ref.key),
    ),
  ].sort()
}

export function summarizeCloudConfigValidation(configData: unknown): CloudSaasValidationSummary {
  const result = cloudConfigSchema.safeParse(configData)
  if (!result.success) {
    return {
      valid: false,
      agents: 0,
      configurations: 0,
      violations: result.error.issues.map((issue) => ({
        path: issue.path.length > 0 ? issue.path.join('.') : 'root',
        prefix: issue.message,
      })),
      extendsErrors: [],
      templateRefs: { env: 0, secret: 0, file: 0 },
    }
  }

  const config = result.data
  const agents = config.deployments?.agents ?? []
  const configurations = config.registry?.configurations ?? []
  const configurationIds = new Set(configurations.map((configuration) => configuration.id))
  const extendsErrors: string[] = []

  for (const agent of agents) {
    if (agent.configuration.extends && !configurationIds.has(agent.configuration.extends)) {
      extendsErrors.push(
        `Agent "${agent.id}" extends "${agent.configuration.extends}" not in registry.configurations`,
      )
    }
  }

  const violations = validateNoInlineKeys(config)
  const refs = collectTemplateRefs(config)

  return {
    valid: violations.length === 0 && extendsErrors.length === 0,
    agents: agents.length,
    configurations: configurations.length,
    violations,
    extendsErrors,
    templateRefs: {
      env: refs.filter((ref) => ref.type === 'env').length,
      secret: refs.filter((ref) => ref.type === 'secret').length,
      file: refs.filter((ref) => ref.type === 'file').length,
    },
  }
}

export function loadCloudConfigSchema(): Record<string, unknown> {
  const schemaPath = resolve(
    fileURLToPath(import.meta.url),
    '..',
    '..',
    '..',
    '..',
    'cloud',
    'schemas',
    'config.schema.json',
  )

  if (!existsSync(schemaPath)) {
    return {}
  }

  return JSON.parse(readFileSync(schemaPath, 'utf-8')) as Record<string, unknown>
}
