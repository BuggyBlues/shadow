import { signModelProxyToken } from './model-proxy-token'

export const MODEL_PROVIDER_SERVER_SECRET_ENV_KEYS = new Set([
  'ANTHROPIC_API_KEY',
  'ANTHROPIC_AUTH_TOKEN',
  'OPENAI_API_KEY',
  'GEMINI_API_KEY',
  'GOOGLE_API_KEY',
  'GOOGLE_AI_API_KEY',
  'DEEPSEEK_API_KEY',
  'DASHSCOPE_API_KEY',
  'ALIBABA_API_KEY',
  'QWEN_API_KEY',
  'MINIMAX_API_KEY',
  'MOONSHOT_API_KEY',
  'KIMI_API_KEY',
  'ZAI_API_KEY',
  'ZHIPUAI_API_KEY',
  'GLM_API_KEY',
  'BIGMODEL_API_KEY',
  'OPENROUTER_API_KEY',
  'XAI_API_KEY',
  'GROK_API_KEY',
  'OPENAI_COMPATIBLE_API_KEY',
  'SHADOW_MODEL_PROXY_UPSTREAM_API_KEY',
  'MODEL_PROXY_TOKEN_SECRET',
  'JWT_SECRET',
])

const SENSITIVE_SERVER_ENV_PATTERN =
  /(^|_)(API_KEY|AUTH_TOKEN|TOKEN|SECRET|PASSWORD|PRIVATE_KEY|CREDENTIAL|ACCESS_KEY)$/i

export function isOfficialModelProxyEnabled() {
  return process.env.SHADOW_MODEL_PROXY_ENABLED !== 'false'
}

function firstNonEmptyEnv(...keys: string[]) {
  for (const key of keys) {
    const value = process.env[key]?.trim()
    if (value) return value
  }
  return null
}

export function officialModelProxyMissingConfig(runtimeServerUrl?: string): string[] {
  if (!isOfficialModelProxyEnabled()) return ['SHADOW_MODEL_PROXY_ENABLED']

  const missing: string[] = []
  if (!runtimeServerUrl) missing.push('SHADOW_SERVER_URL or SHADOW_AGENT_SERVER_URL')
  if (!firstNonEmptyEnv('SHADOW_MODEL_PROXY_UPSTREAM_BASE_URL')) {
    missing.push('SHADOW_MODEL_PROXY_UPSTREAM_BASE_URL')
  }
  if (!firstNonEmptyEnv('SHADOW_MODEL_PROXY_UPSTREAM_API_KEY')) {
    missing.push('SHADOW_MODEL_PROXY_UPSTREAM_API_KEY')
  }
  return missing
}

export function assertOfficialModelProxyAvailable(runtimeServerUrl?: string) {
  const missing = officialModelProxyMissingConfig(runtimeServerUrl)
  if (missing.length === 0) return

  throw Object.assign(
    new Error(`Official model provider is unavailable: missing ${missing.join(', ')}`),
    {
      status: 503,
      code: 'OFFICIAL_MODEL_PROVIDER_UNCONFIGURED',
      missing,
    },
  )
}

export function officialModelProxyModel() {
  return (
    firstNonEmptyEnv('SHADOW_MODEL_PROXY_MODEL', 'SHADOW_MODEL_PROXY_DEFAULT_MODEL') ??
    'deepseek-v4-flash'
  )
}

export function officialModelProxyBaseUrl(runtimeServerUrl?: string) {
  if (!runtimeServerUrl) return null
  return `${runtimeServerUrl.replace(/\/+$/, '')}/api/ai/v1`
}

export function officialModelProxyEnvVars(input: {
  runtimeServerUrl?: string
  userId: string
  playId?: string
  templateSlug?: string
  namespace?: string
}) {
  if (officialModelProxyMissingConfig(input.runtimeServerUrl).length > 0) return {}
  const baseUrl = officialModelProxyBaseUrl(input.runtimeServerUrl)
  if (!baseUrl) return {}

  return {
    OPENAI_COMPATIBLE_API_KEY: signModelProxyToken({
      userId: input.userId,
      playId: input.playId,
      templateSlug: input.templateSlug,
      namespace: input.namespace,
    }),
    OPENAI_COMPATIBLE_BASE_URL: baseUrl,
  }
}

export function shouldCopyServerRuntimeEnvKey(key: string) {
  if (MODEL_PROVIDER_SERVER_SECRET_ENV_KEYS.has(key)) return false
  return !SENSITIVE_SERVER_ENV_PATTERN.test(key)
}
