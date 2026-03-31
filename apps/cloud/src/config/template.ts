/**
 * Template engine — resolves ${env:VAR}, ${secret:NAME}, ${file:PATH} in config values.
 */

import { readFileSync } from 'node:fs'

const TEMPLATE_RE = /\$\{(env|secret|file):([^}]+)\}/g

export interface TemplateContext {
  /** Environment variables (defaults to process.env) */
  env?: Record<string, string | undefined>
  /** Pre-loaded secret values */
  secrets?: Record<string, string>
}

/**
 * Resolve all template references in a string value.
 * Returns the resolved string or throws if a required variable is missing.
 */
export function resolveTemplateString(value: string, ctx: TemplateContext = {}): string {
  const env = ctx.env ?? process.env

  return value.replace(TEMPLATE_RE, (match, type: string, key: string) => {
    switch (type) {
      case 'env': {
        const val = env[key]
        if (val === undefined) {
          throw new Error(`Environment variable ${key} is not set (referenced as ${match})`)
        }
        return val
      }
      case 'secret': {
        const val = ctx.secrets?.[key]
        if (val === undefined) {
          // For K8s secrets, return placeholders that will be mapped as secretKeyRef
          return match
        }
        return val
      }
      case 'file': {
        try {
          return readFileSync(key, 'utf-8').trim()
        } catch {
          throw new Error(`Cannot read file ${key} (referenced as ${match})`)
        }
      }
      default:
        return match
    }
  })
}

/**
 * Check if a string contains unresolved secret references (for K8s secretKeyRef mapping).
 */
export function hasSecretRef(value: string): boolean {
  return /\$\{secret:([^}]+)\}/.test(value)
}

/**
 * Extract secret name and key from a ${secret:k8s/name/key} reference.
 */
export function parseSecretRef(value: string): { name: string; key: string } | null {
  const match = value.match(/\$\{secret:k8s\/([^/]+)\/([^}]+)\}/)
  if (!match?.[1] || !match[2]) return null
  return { name: match[1], key: match[2] }
}

/**
 * Recursively resolve all template strings in a config object.
 * Secret references (${secret:...}) are left as-is for K8s resource generation.
 */
export function resolveTemplates<T>(obj: T, ctx: TemplateContext = {}): T {
  if (typeof obj === 'string') {
    return resolveTemplateString(obj, ctx) as T
  }
  if (Array.isArray(obj)) {
    return obj.map((item) => resolveTemplates(item, ctx)) as T
  }
  if (obj !== null && typeof obj === 'object') {
    const result: Record<string, unknown> = {}
    for (const [key, value] of Object.entries(obj)) {
      result[key] = resolveTemplates(value, ctx)
    }
    return result as T
  }
  return obj
}

/**
 * Collect all template references in a config for validation.
 */
export function collectTemplateRefs(obj: unknown): Array<{
  type: 'env' | 'secret' | 'file'
  key: string
  raw: string
}> {
  const refs: Array<{ type: 'env' | 'secret' | 'file'; key: string; raw: string }> = []

  function walk(val: unknown) {
    if (typeof val === 'string') {
      for (const match of val.matchAll(TEMPLATE_RE)) {
        if (match[1] && match[2]) {
          refs.push({
            type: match[1] as 'env' | 'secret' | 'file',
            key: match[2],
            raw: match[0],
          })
        }
      }
    } else if (Array.isArray(val)) {
      for (const item of val) walk(item)
    } else if (val !== null && typeof val === 'object') {
      for (const v of Object.values(val)) walk(v)
    }
  }

  walk(obj)
  return refs
}
