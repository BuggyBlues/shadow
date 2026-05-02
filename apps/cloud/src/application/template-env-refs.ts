import { collectTemplateRefs } from '../config/index.js'

export interface TemplateEnvRefPolicy {
  aliases?: Record<string, string>
  ignoredKeys?: string[]
}

function normalizeEnvRefKey(key: string, policy?: TemplateEnvRefPolicy): string | null {
  if (policy?.ignoredKeys?.includes(key)) return null
  return policy?.aliases?.[key] ?? key
}

export function extractRequiredEnvVars(config: unknown, policy?: TemplateEnvRefPolicy): string[] {
  return [
    ...new Set(
      collectTemplateRefs(config)
        .filter((ref) => ref.type === 'env')
        .map((ref) => normalizeEnvRefKey(ref.key, policy))
        .filter((key): key is string => Boolean(key)),
    ),
  ].sort()
}
