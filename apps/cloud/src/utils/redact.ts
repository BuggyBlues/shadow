/**
 * Log redaction — filters sensitive patterns from all output channels.
 *
 * Matches known API key patterns:
 *   sk-ant-*  (Anthropic)
 *   sk-proj-* (OpenAI project)
 *   sk-*      (OpenAI legacy)
 *   gsk_*     (Groq)
 *   xai-*     (xAI)
 *   key-*     (generic)
 *   ghp_*     (GitHub PAT)
 *   Bearer *  (auth headers)
 */

const REDACTED = '[REDACTED]'

/**
 * Patterns that match known API key formats.
 * Each pattern captures the prefix so we can show e.g. "sk-ant-***" in logs.
 */
const KEY_PATTERNS: RegExp[] = [
  // Anthropic: sk-ant-api03-...
  /\bsk-ant-[A-Za-z0-9_-]{20,}\b/g,
  // OpenAI project key: sk-proj-...
  /\bsk-proj-[A-Za-z0-9_-]{20,}\b/g,
  // OpenAI legacy: sk-...
  /\bsk-[A-Za-z0-9]{20,}\b/g,
  // Groq: gsk_...
  /\bgsk_[A-Za-z0-9]{20,}\b/g,
  // xAI: xai-...
  /\bxai-[A-Za-z0-9]{20,}\b/g,
  // DeepSeek: sk-... (covered above)
  // Generic key patterns
  /\bkey-[A-Za-z0-9]{20,}\b/g,
  // GitHub PAT
  /\bghp_[A-Za-z0-9]{20,}\b/g,
  // GitHub fine-grained PAT
  /\bgithub_pat_[A-Za-z0-9_]{20,}\b/g,
  // Bearer token in values
  /Bearer\s+[A-Za-z0-9._-]{20,}/g,
]

/**
 * Redact sensitive patterns from a string.
 */
export function redactSecrets(input: string): string {
  let result = input
  for (const pattern of KEY_PATTERNS) {
    // Reset lastIndex for global regexes
    pattern.lastIndex = 0
    result = result.replace(pattern, REDACTED)
  }
  return result
}

/**
 * Known API key prefixes for inline key detection.
 */
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

/**
 * Check if a string value looks like an inline API key (not a template reference).
 * Returns the detected prefix if found, null otherwise.
 */
export function detectInlineKey(value: string): string | null {
  // Skip template references like ${env:...} or ${secret:...}
  if (/^\$\{(env|secret|file):/.test(value)) return null
  for (const prefix of INLINE_KEY_PREFIXES) {
    if (value.startsWith(prefix) && value.length > prefix.length + 10) {
      return prefix
    }
  }
  return null
}
