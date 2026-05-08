const API_BASE = import.meta.env.VITE_API_BASE ?? ''

export function getApiUrl(path: string): string {
  if (/^https?:\/\//.test(path)) return path
  if (API_BASE) return `${API_BASE}${path}`

  if (typeof window !== 'undefined' && window.location?.origin) {
    return new URL(path, window.location.origin).toString()
  }

  return path
}
