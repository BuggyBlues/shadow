import { describe, expect, it } from 'vitest'
import { isChunkLoadError } from './chunk-reload'

describe('chunk reload helpers', () => {
  it('detects CSS chunk failures from the bundler runtime', () => {
    const error = new Error(
      'Loading CSS chunk 658 failed.\n(http://localhost:3000/app/static/css/async/658.old.css)',
    ) as Error & { code?: string }
    error.code = 'CSS_CHUNK_LOAD_FAILED'

    expect(isChunkLoadError(error)).toBe(true)
  })

  it('detects JavaScript chunk failures from the bundler runtime', () => {
    const error = new Error(
      'Loading chunk 658 failed.\n(missing: http://localhost:3000/app/static/js/async/658.old.js)',
    )
    error.name = 'ChunkLoadError'

    expect(isChunkLoadError(error)).toBe(true)
  })

  it('ignores ordinary application errors', () => {
    expect(isChunkLoadError(new Error('Request failed (500)'))).toBe(false)
  })
})
