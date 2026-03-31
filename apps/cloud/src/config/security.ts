/**
 * Config security — inline key detection and validation.
 *
 * Scans shadowob-cloud.json for hardcoded API keys that should use
 * ${env:...} or ${secret:...} template references instead.
 */

import { detectInlineKey } from '../utils/redact.js'

export interface SecurityViolation {
  path: string
  value: string
  prefix: string
  message: string
}

/**
 * Walk a config object and detect inline API keys.
 * Returns an array of violations with JSON path and detected key prefix.
 */
export function validateNoInlineKeys(obj: unknown, basePath = ''): SecurityViolation[] {
  const violations: SecurityViolation[] = []

  if (typeof obj === 'string') {
    const prefix = detectInlineKey(obj)
    if (prefix) {
      violations.push({
        path: basePath,
        value: `${obj.slice(0, 8)}...`,
        prefix,
        message: `Inline API key detected at ${basePath}. Use \${env:VAR_NAME} or \${secret:k8s/name/key} instead.`,
      })
    }
    return violations
  }

  if (Array.isArray(obj)) {
    for (let i = 0; i < obj.length; i++) {
      violations.push(...validateNoInlineKeys(obj[i], `${basePath}[${i}]`))
    }
    return violations
  }

  if (obj !== null && typeof obj === 'object') {
    for (const [key, value] of Object.entries(obj)) {
      const path = basePath ? `${basePath}.${key}` : key
      violations.push(...validateNoInlineKeys(value, path))
    }
  }

  return violations
}
