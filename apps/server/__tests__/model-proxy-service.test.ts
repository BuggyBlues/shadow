import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { signModelProxyToken } from '../src/lib/model-proxy-token'
import { ModelProxyService } from '../src/services/model-proxy.service'

describe('ModelProxyService', () => {
  const previousEnv: Record<string, string | undefined> = {}
  const walletService = {
    debit: vi.fn(),
    refund: vi.fn(),
    settleReservedMicros: vi.fn(),
  }
  const userDao = {
    findById: vi.fn(),
  }
  const service = new ModelProxyService({
    walletService: walletService as never,
    userDao: userDao as never,
  })

  beforeEach(() => {
    vi.clearAllMocks()
    for (const key of [
      'JWT_SECRET',
      'DEEPSEEK_API_KEY',
      'DEEPSEEK_BASE_URL',
      'SHADOW_MODEL_PROXY_MODEL',
      'SHADOW_MODEL_PROXY_DEFAULT_MODEL',
      'SHADOW_MODEL_PROXY_UPSTREAM_API_KEY',
      'SHADOW_MODEL_PROXY_UPSTREAM_BASE_URL',
      'SHADOW_MODEL_PROXY_SHRIMP_PER_CNY',
      'SHADOW_MODEL_PROXY_SHRIMP_MICROS_PER_COIN',
      'SHADOW_MODEL_PROXY_INPUT_CACHE_HIT_CNY_PER_MILLION',
      'SHADOW_MODEL_PROXY_INPUT_CACHE_MISS_CNY_PER_MILLION',
      'SHADOW_MODEL_PROXY_OUTPUT_CNY_PER_MILLION',
      'SHADOW_MODEL_PROXY_INPUT_CACHE_HIT_SHRIMP_PER_MILLION',
      'SHADOW_MODEL_PROXY_INPUT_CACHE_MISS_SHRIMP_PER_MILLION',
      'SHADOW_MODEL_PROXY_OUTPUT_SHRIMP_PER_MILLION',
      'SHADOW_MODEL_PROXY_BILLING_MODE',
      'SHADOW_MODEL_PROXY_TOKENS_PER_SHRIMP',
      'SHADOW_MODEL_PROXY_INPUT_TOKENS_PER_SHRIMP',
      'SHADOW_MODEL_PROXY_OUTPUT_TOKENS_PER_SHRIMP',
    ]) {
      previousEnv[key] = process.env[key]
    }
    process.env.JWT_SECRET = 'model-proxy-test-secret'
    process.env.SHADOW_MODEL_PROXY_MODEL = 'deepseek-v4-flash'
    process.env.SHADOW_MODEL_PROXY_UPSTREAM_API_KEY = 'official-upstream-key'
    process.env.SHADOW_MODEL_PROXY_UPSTREAM_BASE_URL = 'https://model.example/v1'
    process.env.SHADOW_MODEL_PROXY_SHRIMP_PER_CNY = '10'
    process.env.SHADOW_MODEL_PROXY_SHRIMP_MICROS_PER_COIN = '1000000'
    process.env.SHADOW_MODEL_PROXY_INPUT_CACHE_HIT_CNY_PER_MILLION = '0.02'
    process.env.SHADOW_MODEL_PROXY_INPUT_CACHE_MISS_CNY_PER_MILLION = '1'
    process.env.SHADOW_MODEL_PROXY_OUTPUT_CNY_PER_MILLION = '2'
    delete process.env.SHADOW_MODEL_PROXY_INPUT_CACHE_HIT_SHRIMP_PER_MILLION
    delete process.env.SHADOW_MODEL_PROXY_INPUT_CACHE_MISS_SHRIMP_PER_MILLION
    delete process.env.SHADOW_MODEL_PROXY_OUTPUT_SHRIMP_PER_MILLION
    delete process.env.SHADOW_MODEL_PROXY_BILLING_MODE
    delete process.env.SHADOW_MODEL_PROXY_TOKENS_PER_SHRIMP
    delete process.env.SHADOW_MODEL_PROXY_INPUT_TOKENS_PER_SHRIMP
    delete process.env.SHADOW_MODEL_PROXY_OUTPUT_TOKENS_PER_SHRIMP
    userDao.findById.mockResolvedValue({ id: 'user-1' })
    walletService.debit.mockResolvedValue(998)
    walletService.refund.mockResolvedValue(999)
    walletService.settleReservedMicros.mockResolvedValue({
      chargedAmount: 0,
      pendingMicros: 20_000,
      balanceAfter: 999,
    })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    for (const [key, value] of Object.entries(previousEnv)) {
      if (value === undefined) delete process.env[key]
      else process.env[key] = value
    }
  })

  it('uses deepseek-v4-flash when model env vars are blank', () => {
    process.env.SHADOW_MODEL_PROXY_MODEL = ''
    process.env.SHADOW_MODEL_PROXY_DEFAULT_MODEL = ''

    expect(service.modelsResponse().data).toEqual([
      {
        id: 'deepseek-v4-flash',
        object: 'model',
        created: 0,
        owned_by: 'shadow-official',
      },
    ])
  })

  it('exposes DeepSeek-compatible billing rates without provider secrets', () => {
    expect(service.billingResponse()).toMatchObject({
      enabled: true,
      currency: 'shrimp',
      model: 'deepseek-v4-flash',
      models: ['deepseek-v4-flash'],
      shrimpMicrosPerCoin: 1_000_000,
      shrimpPerCny: 10,
      inputCacheHitCnyPerMillionTokens: 0.02,
      inputCacheMissCnyPerMillionTokens: 1,
      outputCnyPerMillionTokens: 2,
      inputCacheHitShrimpPerMillionTokens: 0.2,
      inputCacheMissShrimpPerMillionTokens: 10,
      outputShrimpPerMillionTokens: 20,
    })
    expect(JSON.stringify(service.billingResponse())).not.toContain('official-upstream-key')
  })

  it('ignores stale legacy token ratios unless legacy billing mode is enabled', () => {
    process.env.SHADOW_MODEL_PROXY_INPUT_TOKENS_PER_SHRIMP = '1000'
    process.env.SHADOW_MODEL_PROXY_OUTPUT_TOKENS_PER_SHRIMP = '500'

    expect(service.billingResponse()).toMatchObject({
      inputTokensPerShrimp: null,
      outputTokensPerShrimp: null,
      inputCacheHitShrimpPerMillionTokens: 0.2,
      inputCacheMissShrimpPerMillionTokens: 10,
      outputShrimpPerMillionTokens: 20,
    })
  })

  it('forwards chat completions through the official upstream key and bills actual usage', async () => {
    const token = signModelProxyToken({ userId: 'user-1', namespace: 'play-bmad' })
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        return new Response(
          JSON.stringify({
            id: 'chatcmpl-test',
            object: 'chat.completion',
            choices: [{ message: { role: 'assistant', content: 'done' } }],
            usage: { prompt_tokens: 1000, completion_tokens: 500, total_tokens: 1500 },
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        )
      }),
    )

    const identity = await service.resolveIdentity(`Bearer ${token}`)
    const response = await service.proxyChatCompletions(identity, {
      model: 'deepseek-v4-flash',
      max_tokens: 500,
      messages: [{ role: 'user', content: 'hello' }],
    })

    expect(response.status).toBe(200)
    const fetchMock = vi.mocked(fetch)
    const [, init] = fetchMock.mock.calls[0]!
    expect(fetchMock.mock.calls[0]?.[0]).toBe('https://model.example/v1/chat/completions')
    expect(init?.headers).toMatchObject({
      Authorization: 'Bearer official-upstream-key',
    })
    expect(JSON.parse(String(init?.body))).toMatchObject({
      model: 'deepseek-v4-flash',
      messages: [{ role: 'user', content: 'hello' }],
    })
    expect(walletService.debit).toHaveBeenCalledWith(
      'user-1',
      1,
      expect.any(String),
      'model_proxy',
      'Official model usage reserve (deepseek-v4-flash)',
    )
    expect(walletService.settleReservedMicros).toHaveBeenCalledWith(
      'user-1',
      20_000,
      1,
      'model_proxy',
      expect.any(String),
      'model_proxy',
      'Official model usage (deepseek-v4-flash)',
    )
  })

  it('returns a recharge chat completion before calling upstream when balance is insufficient', async () => {
    const token = signModelProxyToken({ userId: 'user-1', namespace: 'play-bmad' })
    walletService.debit.mockRejectedValueOnce(
      Object.assign(new Error('Insufficient balance'), {
        status: 402,
        code: 'WALLET_INSUFFICIENT_BALANCE',
        requiredAmount: 2,
        balance: 0,
        shortfall: 2,
        nextAction: 'earn_or_recharge',
      }),
    )
    vi.stubGlobal('fetch', vi.fn())

    const identity = await service.resolveIdentity(`Bearer ${token}`)
    const response = await service.proxyChatCompletions(identity, {
      model: 'deepseek-v4-flash',
      max_tokens: 500,
      messages: [{ role: 'user', content: 'hello' }],
    })
    const body = (await response.json()) as {
      choices: Array<{ message: { content: string } }>
      shadow: { type: string; requiredAmount: number; balance: number; shortfall: number }
    }

    expect(response.status).toBe(200)
    expect(response.headers.get('X-Shadow-Recharge-Required')).toBe('true')
    expect(body.shadow).toMatchObject({
      type: 'wallet_recharge_required',
      requiredAmount: 2,
      balance: 0,
      shortfall: 2,
    })
    expect(body.choices[0]?.message.content).toContain('shadow:wallet-recharge')
    expect(fetch).not.toHaveBeenCalled()
  })

  it('supports token-per-shrimp billing ratios from environment configuration', async () => {
    process.env.SHADOW_MODEL_PROXY_BILLING_MODE = 'token_ratio'
    process.env.SHADOW_MODEL_PROXY_INPUT_TOKENS_PER_SHRIMP = '2000'
    process.env.SHADOW_MODEL_PROXY_OUTPUT_TOKENS_PER_SHRIMP = '1000'
    const token = signModelProxyToken({ userId: 'user-1', namespace: 'play-bmad' })
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        return new Response(
          JSON.stringify({
            id: 'chatcmpl-test',
            object: 'chat.completion',
            choices: [{ message: { role: 'assistant', content: 'done' } }],
            usage: { prompt_tokens: 2000, completion_tokens: 1000, total_tokens: 3000 },
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        )
      }),
    )

    const identity = await service.resolveIdentity(`Bearer ${token}`)
    const response = await service.proxyChatCompletions(identity, {
      model: 'deepseek-v4-flash',
      max_tokens: 1000,
      messages: [{ role: 'user', content: 'x'.repeat(8000) }],
    })

    expect(response.status).toBe(200)
    expect(walletService.debit).toHaveBeenCalledWith(
      'user-1',
      2,
      expect.any(String),
      'model_proxy',
      'Official model usage reserve (deepseek-v4-flash)',
    )
    expect(walletService.settleReservedMicros).toHaveBeenCalledWith(
      'user-1',
      2_000_000,
      2,
      'model_proxy',
      expect.any(String),
      'model_proxy',
      'Official model usage (deepseek-v4-flash)',
    )
  })

  it('bills DeepSeek cache-hit input tokens at the official cached rate', async () => {
    const token = signModelProxyToken({ userId: 'user-1', namespace: 'play-bmad' })
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        return new Response(
          JSON.stringify({
            id: 'chatcmpl-test',
            object: 'chat.completion',
            choices: [{ message: { role: 'assistant', content: 'done' } }],
            usage: {
              prompt_tokens: 1_000_000,
              prompt_cache_hit_tokens: 1_000_000,
              prompt_cache_miss_tokens: 0,
              completion_tokens: 0,
              total_tokens: 1_000_000,
            },
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        )
      }),
    )

    const identity = await service.resolveIdentity(`Bearer ${token}`)
    const response = await service.proxyChatCompletions(identity, {
      model: 'deepseek-v4-flash',
      max_tokens: 1,
      messages: [{ role: 'user', content: 'hello' }],
    })

    expect(response.status).toBe(200)
    expect(walletService.settleReservedMicros).toHaveBeenCalledWith(
      'user-1',
      200_000,
      1,
      'model_proxy',
      expect.any(String),
      'model_proxy',
      'Official model usage (deepseek-v4-flash)',
    )
  })

  it('hides upstream auth details and refunds reserve when the provider key is rejected', async () => {
    const token = signModelProxyToken({ userId: 'user-1', namespace: 'play-bmad' })
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        return new Response(
          JSON.stringify({
            error: {
              message: 'Authentication Fails, Your api key: ****72ea is invalid',
              code: 'invalid_request_error',
            },
          }),
          { status: 401, headers: { 'Content-Type': 'application/json' } },
        )
      }),
    )

    const identity = await service.resolveIdentity(`Bearer ${token}`)
    const response = await service.proxyChatCompletions(identity, {
      model: 'deepseek-v4-flash',
      max_tokens: 500,
      messages: [{ role: 'user', content: 'hello' }],
    })
    const text = await response.text()

    expect(response.status).toBe(503)
    expect(text).toContain('MODEL_PROXY_PROVIDER_AUTH_FAILED')
    expect(text).not.toContain('72ea')
    expect(walletService.refund).toHaveBeenCalledWith(
      'user-1',
      1,
      expect.any(String),
      'model_proxy',
      'Official model usage refund (deepseek-v4-flash)',
    )
  })

  it('does not expose upstream error bodies to chat clients', async () => {
    const token = signModelProxyToken({ userId: 'user-1', namespace: 'play-bmad' })
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        return new Response(
          JSON.stringify({
            error: {
              message: 'Provider quota exhausted for account official-prod',
              code: 'provider_quota_exceeded',
            },
          }),
          { status: 429, headers: { 'Content-Type': 'application/json' } },
        )
      }),
    )

    const identity = await service.resolveIdentity(`Bearer ${token}`)
    const response = await service.proxyChatCompletions(identity, {
      model: 'deepseek-v4-flash',
      max_tokens: 500,
      messages: [{ role: 'user', content: 'hello' }],
    })
    const text = await response.text()

    expect(response.status).toBe(503)
    expect(text).toContain('MODEL_PROXY_UPSTREAM_REJECTED')
    expect(text).toContain('Official model provider is busy')
    expect(text).not.toContain('official-prod')
    expect(text).not.toContain('provider_quota_exceeded')
    expect(walletService.refund).toHaveBeenCalledWith(
      'user-1',
      1,
      expect.any(String),
      'model_proxy',
      'Official model usage refund (deepseek-v4-flash)',
    )
  })

  it('falls back to DeepSeek alias env vars when generic upstream env vars are blank', async () => {
    const token = signModelProxyToken({ userId: 'user-1', namespace: 'play-bmad' })
    process.env.SHADOW_MODEL_PROXY_UPSTREAM_API_KEY = ''
    process.env.SHADOW_MODEL_PROXY_UPSTREAM_BASE_URL = ''
    process.env.DEEPSEEK_API_KEY = 'alias-deepseek-key'
    process.env.DEEPSEEK_BASE_URL = 'https://deepseek.example/v1/'
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        return new Response(
          JSON.stringify({
            id: 'chatcmpl-test',
            object: 'chat.completion',
            choices: [{ message: { role: 'assistant', content: 'done' } }],
            usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 },
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        )
      }),
    )

    const identity = await service.resolveIdentity(`Bearer ${token}`)
    const response = await service.proxyChatCompletions(identity, {
      model: 'deepseek-v4-flash',
      messages: [{ role: 'user', content: 'hello' }],
      max_tokens: 8,
    })

    expect(response.status).toBe(200)
    const fetchMock = vi.mocked(fetch)
    const [, init] = fetchMock.mock.calls[0]!
    expect(fetchMock.mock.calls[0]?.[0]).toBe('https://deepseek.example/v1/chat/completions')
    expect(init?.headers).toMatchObject({
      Authorization: 'Bearer alias-deepseek-key',
    })
  })

  it('requires the upstream base URL to come from environment configuration', async () => {
    const token = signModelProxyToken({ userId: 'user-1', namespace: 'play-bmad' })
    delete process.env.SHADOW_MODEL_PROXY_UPSTREAM_BASE_URL
    delete process.env.DEEPSEEK_BASE_URL
    delete process.env.OPENAI_COMPATIBLE_BASE_URL
    vi.stubGlobal('fetch', vi.fn())

    const identity = await service.resolveIdentity(`Bearer ${token}`)
    const response = await service.proxyChatCompletions(identity, {
      model: 'deepseek-v4-flash',
      messages: [{ role: 'user', content: 'hello' }],
    })
    const body = (await response.json()) as {
      error: { code: string }
    }

    expect(response.status).toBe(503)
    expect(body.error.code).toBe('MODEL_PROXY_PROVIDER_UNCONFIGURED')
    expect(walletService.debit).not.toHaveBeenCalled()
    expect(fetch).not.toHaveBeenCalled()
  })
})
