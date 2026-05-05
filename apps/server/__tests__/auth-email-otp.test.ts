import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { AuthService } from '../src/services/auth.service'

const nodemailerMock = vi.hoisted(() => {
  const sendMail = vi.fn()
  return {
    sendMail,
    createTransport: vi.fn(() => ({ sendMail })),
  }
})

vi.mock('nodemailer', () => ({
  default: {
    createTransport: nodemailerMock.createTransport,
  },
}))

vi.mock('../src/lib/jwt', () => ({
  signAccessToken: vi.fn(),
  signRefreshToken: vi.fn(),
  verifyToken: vi.fn(),
}))

vi.mock('../src/lib/redis', () => ({
  getRedisClient: vi.fn().mockResolvedValue(null),
}))

function createAuthService() {
  return new AuthService({
    userDao: {} as never,
    inviteCodeDao: {} as never,
    agentDao: {} as never,
    taskCenterService: {} as never,
    passwordChangeLogDao: {} as never,
    membershipService: {} as never,
  })
}

describe('AuthService email OTP delivery', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    nodemailerMock.sendMail.mockResolvedValue({})
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('sends verification codes through SMTP when configured', async () => {
    vi.stubEnv('SMTP_HOST', 'smtp.example.com')
    vi.stubEnv('SMTP_PORT', '465')
    vi.stubEnv('SMTP_SECURE', 'true')
    vi.stubEnv('SMTP_USER', 'mailer')
    vi.stubEnv('SMTP_PASSWORD', 'secret')
    vi.stubEnv('SMTP_FROM', 'Shadow <no-reply@example.com>')

    await createAuthService().startEmailLogin({ email: 'User@Test.com', locale: 'zh-CN' })

    expect(nodemailerMock.createTransport).toHaveBeenCalledWith(
      expect.objectContaining({
        host: 'smtp.example.com',
        port: 465,
        secure: true,
        auth: { user: 'mailer', pass: 'secret' },
      }),
    )
    expect(nodemailerMock.sendMail).toHaveBeenCalledWith(
      expect.objectContaining({
        from: 'Shadow <no-reply@example.com>',
        to: 'user@test.com',
        subject: '虾豆登录验证码',
      }),
    )
  })

  it('fails explicitly in production when no email delivery channel is configured', async () => {
    vi.stubEnv('NODE_ENV', 'production')
    vi.stubEnv('EMAIL_OTP_WEBHOOK_URL', '')
    vi.stubEnv('EMAIL_SMTP_HOST', '')
    vi.stubEnv('EMAIL_SMTP_FROM', '')
    vi.stubEnv('SMTP_HOST', '')
    vi.stubEnv('SMTP_FROM', '')
    vi.stubEnv('MAIL_FROM', '')

    await expect(
      createAuthService().startEmailLogin({ email: 'test@test.com' }),
    ).rejects.toMatchObject({
      code: 'EMAIL_DELIVERY_NOT_CONFIGURED',
      status: 503,
    })
  })
})
