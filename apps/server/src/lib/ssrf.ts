import { lookup } from 'node:dns/promises'
import { isIP } from 'node:net'
import ipaddr from 'ipaddr.js'

export function isBlockedAddress(address: string): boolean {
  if (!ipaddr.isValid(address)) return true
  const range = ipaddr.parse(address).range()
  return range !== 'unicast'
}

export async function assertSafeHttpUrl(rawUrl: string): Promise<URL> {
  let parsed: URL
  try {
    parsed = new URL(rawUrl)
  } catch {
    throw Object.assign(new Error('Invalid URL'), { status: 422 })
  }

  if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
    throw Object.assign(new Error('URL must use http or https'), { status: 422 })
  }
  if (parsed.username || parsed.password) {
    throw Object.assign(new Error('URL credentials are not allowed'), { status: 422 })
  }

  const hostname = parsed.hostname.toLowerCase().replace(/^\[|\]$/g, '')
  if (hostname === 'localhost' || hostname.endsWith('.localhost')) {
    throw Object.assign(new Error('Local provider URLs are not allowed'), { status: 422 })
  }

  const literalFamily = isIP(hostname)
  if (literalFamily && isBlockedAddress(hostname)) {
    throw Object.assign(new Error('Private or local provider URLs are not allowed'), {
      status: 422,
    })
  }

  const records = await lookup(hostname, { all: true, verbatim: true }).catch(() => [])
  if (records.length === 0) {
    throw Object.assign(new Error('Provider URL host could not be resolved'), { status: 422 })
  }
  if (records.some((record) => isBlockedAddress(record.address))) {
    throw Object.assign(new Error('Provider URL resolves to a private or local address'), {
      status: 422,
    })
  }

  return parsed
}
