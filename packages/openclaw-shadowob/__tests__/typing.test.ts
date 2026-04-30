import { afterEach, describe, expect, it, vi } from 'vitest'
import { createTypingCallbacks } from '../src/monitor/typing.js'

describe('typing callbacks', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('sends stop on idle and cleanup only once', async () => {
    const start = vi.fn(async () => {})
    const stop = vi.fn(async () => {})
    const callbacks = createTypingCallbacks({
      start,
      stop,
      onStartError: vi.fn(),
      onStopError: vi.fn(),
      keepaliveIntervalMs: 10,
      maxDurationMs: 1000,
    })

    await callbacks.onReplyStart()
    callbacks.onIdle?.()
    callbacks.onCleanup?.()

    expect(start).toHaveBeenCalledTimes(1)
    expect(stop).toHaveBeenCalledTimes(1)
  })

  it('does not leak keepalive timers after repeated reply starts', async () => {
    vi.useFakeTimers()
    const start = vi.fn(async () => {})
    const stop = vi.fn(async () => {})
    const callbacks = createTypingCallbacks({
      start,
      stop,
      onStartError: vi.fn(),
      onStopError: vi.fn(),
      keepaliveIntervalMs: 10,
      maxDurationMs: 1000,
    })

    await callbacks.onReplyStart()
    await callbacks.onReplyStart()
    callbacks.onCleanup?.()
    await vi.advanceTimersByTimeAsync(35)

    expect(start).toHaveBeenCalledTimes(2)
    expect(stop).toHaveBeenCalledTimes(1)
  })
})
