export type JsonLimitOptions = {
  maxBytes: number
  maxDepth: number
  maxObjectKeys: number
  maxArrayItems: number
}

export type JsonLimitResult =
  | { ok: true; bytes: number; keys: number; maxDepthSeen: number }
  | { ok: false; error: string }

export function validateJsonLimits(value: unknown, options: JsonLimitOptions): JsonLimitResult {
  let bytes = 0
  try {
    bytes = Buffer.byteLength(JSON.stringify(value), 'utf8')
  } catch {
    return { ok: false, error: 'JSON value must be serializable' }
  }

  if (bytes > options.maxBytes) {
    return { ok: false, error: `JSON payload exceeds ${options.maxBytes} bytes` }
  }

  let keyCount = 0
  let maxDepthSeen = 0
  const stack: Array<{ value: unknown; depth: number }> = [{ value, depth: 1 }]

  while (stack.length > 0) {
    const current = stack.pop()!
    maxDepthSeen = Math.max(maxDepthSeen, current.depth)
    if (current.depth > options.maxDepth) {
      return { ok: false, error: `JSON depth exceeds ${options.maxDepth}` }
    }

    if (!current.value || typeof current.value !== 'object') continue

    if (Array.isArray(current.value)) {
      if (current.value.length > options.maxArrayItems) {
        return { ok: false, error: `JSON array exceeds ${options.maxArrayItems} items` }
      }
      for (const item of current.value) {
        stack.push({ value: item, depth: current.depth + 1 })
      }
      continue
    }

    const entries = Object.entries(current.value as Record<string, unknown>)
    keyCount += entries.length
    if (keyCount > options.maxObjectKeys) {
      return { ok: false, error: `JSON object exceeds ${options.maxObjectKeys} keys` }
    }

    for (const [, child] of entries) {
      stack.push({ value: child, depth: current.depth + 1 })
    }
  }

  return { ok: true, bytes, keys: keyCount, maxDepthSeen }
}
