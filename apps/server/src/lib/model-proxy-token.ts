import { createHmac, timingSafeEqual } from 'node:crypto'

const TOKEN_PREFIX = 'smp_'

export type ModelProxyTokenPayload = {
  v: 1
  scope: 'model_proxy'
  userId: string
  playId?: string
  templateSlug?: string
  namespace?: string
  iat: number
  exp: number
}

function secret() {
  const value = process.env.MODEL_PROXY_TOKEN_SECRET ?? process.env.JWT_SECRET
  if (!value) {
    throw new Error('MODEL_PROXY_TOKEN_SECRET or JWT_SECRET is required for model proxy tokens')
  }
  return value
}

function base64url(input: Buffer | string) {
  return Buffer.from(input).toString('base64url')
}

function signPart(payloadPart: string) {
  return createHmac('sha256', secret()).update(payloadPart).digest('base64url')
}

function safeEqual(left: string, right: string) {
  const leftBuffer = Buffer.from(left)
  const rightBuffer = Buffer.from(right)
  if (leftBuffer.length !== rightBuffer.length) return false
  return timingSafeEqual(leftBuffer, rightBuffer)
}

export function signModelProxyToken(
  payload: Omit<ModelProxyTokenPayload, 'v' | 'scope' | 'iat' | 'exp'>,
  ttlSeconds = Number.parseInt(process.env.MODEL_PROXY_TOKEN_TTL_SECONDS ?? '', 10) ||
    30 * 24 * 60 * 60,
) {
  const now = Math.floor(Date.now() / 1000)
  const fullPayload: ModelProxyTokenPayload = {
    v: 1,
    scope: 'model_proxy',
    userId: payload.userId,
    ...(payload.playId ? { playId: payload.playId } : {}),
    ...(payload.templateSlug ? { templateSlug: payload.templateSlug } : {}),
    ...(payload.namespace ? { namespace: payload.namespace } : {}),
    iat: now,
    exp: now + Math.max(ttlSeconds, 60),
  }
  const payloadPart = base64url(JSON.stringify(fullPayload))
  return `${TOKEN_PREFIX}${payloadPart}.${signPart(payloadPart)}`
}

export function verifyModelProxyToken(token: string): ModelProxyTokenPayload {
  if (!token.startsWith(TOKEN_PREFIX)) {
    throw Object.assign(new Error('Invalid model proxy token'), {
      status: 401,
      code: 'MODEL_PROXY_INVALID_TOKEN',
    })
  }

  const body = token.slice(TOKEN_PREFIX.length)
  const [payloadPart, signature] = body.split('.')
  if (!payloadPart || !signature || !safeEqual(signPart(payloadPart), signature)) {
    throw Object.assign(new Error('Invalid model proxy token'), {
      status: 401,
      code: 'MODEL_PROXY_INVALID_TOKEN',
    })
  }

  const payload = JSON.parse(
    Buffer.from(payloadPart, 'base64url').toString('utf8'),
  ) as Partial<ModelProxyTokenPayload>
  const now = Math.floor(Date.now() / 1000)
  if (payload.v !== 1 || payload.scope !== 'model_proxy' || !payload.userId || !payload.exp) {
    throw Object.assign(new Error('Invalid model proxy token'), {
      status: 401,
      code: 'MODEL_PROXY_INVALID_TOKEN',
    })
  }
  if (payload.exp <= now) {
    throw Object.assign(new Error('Model proxy token expired'), {
      status: 401,
      code: 'MODEL_PROXY_TOKEN_EXPIRED',
    })
  }

  return payload as ModelProxyTokenPayload
}

export function isModelProxyToken(token: string | undefined): boolean {
  return Boolean(token?.startsWith(TOKEN_PREFIX))
}
