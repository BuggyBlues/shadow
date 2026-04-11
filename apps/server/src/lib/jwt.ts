import jwt from 'jsonwebtoken'

const { sign, verify } = jwt

const JWT_SECRET = process.env.JWT_SECRET
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN ?? '7d'
const JWT_REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN ?? '30d'
const JWT_AGENT_EXPIRES_IN = process.env.JWT_AGENT_EXPIRES_IN ?? '365d'

if (!JWT_SECRET) {
  throw new Error(
    'FATAL: JWT_SECRET environment variable is required. ' +
      'Set a strong random secret before starting the server.',
  )
}

export interface JwtPayload {
  userId: string
  email: string
  username: string
}

export function signAccessToken(payload: JwtPayload): string {
  return sign(payload, JWT_SECRET as jwt.Secret, { expiresIn: JWT_EXPIRES_IN } as jwt.SignOptions)
}

export function signRefreshToken(payload: JwtPayload): string {
  return sign(
    payload,
    JWT_SECRET as jwt.Secret,
    { expiresIn: JWT_REFRESH_EXPIRES_IN } as jwt.SignOptions,
  )
}

/** Sign a long-lived token for an Agent (bot user) */
export function signAgentToken(payload: JwtPayload): string {
  return sign(
    payload,
    JWT_SECRET as jwt.Secret,
    { expiresIn: JWT_AGENT_EXPIRES_IN } as jwt.SignOptions,
  )
}

export function verifyToken(token: string): JwtPayload {
  return verify(token, JWT_SECRET as jwt.Secret) as JwtPayload
}
