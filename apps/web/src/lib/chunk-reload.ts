const CHUNK_RELOAD_KEY = 'shadow:chunk-reload-attempted'

export function isChunkLoadError(error: unknown): boolean {
  if (!(error instanceof Error)) return false
  const code = (error as Error & { code?: string }).code
  if (code === 'CSS_CHUNK_LOAD_FAILED') return true
  if (error.name === 'ChunkLoadError') return true
  return /Loading (CSS )?chunk \d+ failed/i.test(error.message)
}

export function reloadOnceForChunkError(error: unknown): boolean {
  if (!isChunkLoadError(error)) return false
  if (typeof window === 'undefined') return false

  const reloadKey = `${CHUNK_RELOAD_KEY}:${window.location.pathname}`
  if (window.sessionStorage.getItem(reloadKey) === '1') return false

  window.sessionStorage.setItem(reloadKey, '1')
  window.location.reload()
  return true
}
