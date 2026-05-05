import { Alert, AlertDescription } from '@shadowob/ui/components/ui/alert'
import { Button } from '@shadowob/ui/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@shadowob/ui/components/ui/dialog'
import { Divider } from '@shadowob/ui/components/ui/divider'
import { Input } from '@shadowob/ui/components/ui/input'
import { ChevronLeft, Github, KeyRound, Mail, X } from 'lucide-react'
import type React from 'react'
import { useEffect, useMemo, useRef, useState } from 'react'

declare const __SHADOW_APP_BASE_URL__: string | undefined

const CODE_LENGTH = 6
const RESEND_SECONDS = 60

type AuthMode = 'email-code' | 'password'

type AuthSession = {
  user: unknown
  accessToken: string
  refreshToken: string
}

type LoginModalProps = {
  open: boolean
  lang: 'zh' | 'en'
  redirect: string
  onClose: () => void
}

const copy = {
  zh: {
    brand: '虾豆',
    close: '关闭',
    back: '返回',
    welcomeTitle: '欢迎来到虾豆',
    welcomeSubtitle: '登录或注册以继续',
    google: '使用 Google',
    github: '使用 GitHub',
    emailCodeTab: '邮箱验证码',
    passwordTab: '密码登录',
    emailLabel: '电子邮箱',
    emailPlaceholder: '电子邮箱',
    emailOrUsernameLabel: '用户名或邮箱',
    emailOrUsernamePlaceholder: '用户名或邮箱',
    passwordLabel: '密码',
    continueEmail: '使用邮箱继续',
    continuingEmail: '发送中...',
    login: '登录',
    loggingIn: '登录中...',
    switchToPassword: '使用密码登录',
    switchToEmailCode: '使用邮箱验证码登录',
    checkEmailTitle: '查看您的邮箱以继续',
    checkEmailMessage: '我们已向您的邮箱发送了一次性验证码，请查看您的收件箱：',
    codeDigit: (index: number) => `验证码第 ${index} 位`,
    verifying: '验证中...',
    resendIn: (seconds: number) => `${seconds}秒后可重新发送`,
    resend: '重新发送验证码',
    codeSent: '验证码已发送，请查看邮箱。',
    termsPrefix: '继续即表示您同意',
    terms: '使用条款',
    privacy: '隐私政策',
    termsJoiner: '和',
    failed: '登录失败，请稍后再试。',
    or: '或',
  },
  en: {
    brand: 'Shadow',
    close: 'Close',
    back: 'Back',
    welcomeTitle: 'Welcome to Shadow',
    welcomeSubtitle: 'Log in or sign up to continue',
    google: 'Continue with Google',
    github: 'Continue with GitHub',
    emailCodeTab: 'Email code',
    passwordTab: 'Password',
    emailLabel: 'Email',
    emailPlaceholder: 'Email',
    emailOrUsernameLabel: 'Username or email',
    emailOrUsernamePlaceholder: 'Username or email',
    passwordLabel: 'Password',
    continueEmail: 'Continue with email',
    continuingEmail: 'Sending...',
    login: 'Log in',
    loggingIn: 'Logging in...',
    switchToPassword: 'Use password instead',
    switchToEmailCode: 'Use email code instead',
    checkEmailTitle: 'Check your email to continue',
    checkEmailMessage: 'We sent a one-time verification code to your inbox:',
    codeDigit: (index: number) => `Verification code digit ${index}`,
    verifying: 'Verifying...',
    resendIn: (seconds: number) => `Resend in ${seconds}s`,
    resend: 'Resend code',
    codeSent: 'Verification code sent. Check your email.',
    termsPrefix: 'By continuing, you agree to the',
    terms: 'Terms of Service',
    privacy: 'Privacy Policy',
    termsJoiner: 'and',
    failed: 'Login failed. Try again later.',
    or: 'or',
  },
} as const

function configuredAppBase() {
  return (typeof __SHADOW_APP_BASE_URL__ !== 'undefined' ? __SHADOW_APP_BASE_URL__ : '').replace(
    /\/$/,
    '',
  )
}

function legalHref(kind: 'terms' | 'privacy', lang: 'zh' | 'en') {
  return `${lang === 'zh' ? '/zh' : ''}/${kind}`
}

function safeAppRedirect(value: string) {
  if (value.startsWith('//') || /[\r\n\\]/.test(value)) return '/app'
  if (
    value === '/app' ||
    value.startsWith('/app/') ||
    value.startsWith('/app?') ||
    value.startsWith('/app#')
  ) {
    return value
  }
  return '/app'
}

function sanitizeDigits(value: string) {
  return value.replace(/\D/g, '').slice(0, CODE_LENGTH)
}

function GoogleIcon() {
  return (
    <svg className="h-[18px] w-[18px]" viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
        fill="#4285F4"
      />
      <path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        fill="#34A853"
      />
      <path
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        fill="#EA4335"
      />
    </svg>
  )
}

async function readError(response: Response, fallback: string) {
  const body = await response.json().catch(() => null)
  if (body && typeof body === 'object') {
    const detail = (body as { detail?: unknown; error?: unknown; message?: unknown }).detail
    const error = (body as { detail?: unknown; error?: unknown; message?: unknown }).error
    const message = (body as { detail?: unknown; error?: unknown; message?: unknown }).message
    if (typeof detail === 'string') return detail
    if (typeof error === 'string') return error
    if (typeof message === 'string') return message
  }
  return fallback
}

export function LoginModal({ open, lang, redirect, onClose }: LoginModalProps) {
  const text = copy[lang]
  const digitRefs = useRef<Array<HTMLInputElement | null>>([])
  const lastSubmittedCodeRef = useRef('')

  const [step, setStep] = useState<'choose' | 'code'>('choose')
  const [mode, setMode] = useState<AuthMode>('email-code')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [digits, setDigits] = useState<string[]>(() => Array(CODE_LENGTH).fill(''))
  const [error, setError] = useState('')
  const [sending, setSending] = useState(false)
  const [verifying, setVerifying] = useState(false)
  const [resendSeconds, setResendSeconds] = useState(0)

  const appBase = configuredAppBase()
  const apiBase = appBase || ''
  const target = useMemo(() => safeAppRedirect(redirect), [redirect])
  const code = digits.join('')
  const trimmedEmail = email.trim()

  useEffect(() => {
    if (!open) {
      setStep('choose')
      setMode('email-code')
      setError('')
      setDigits(Array(CODE_LENGTH).fill(''))
      setPassword('')
      lastSubmittedCodeRef.current = ''
    }
  }, [open])

  useEffect(() => {
    if (resendSeconds <= 0) return
    const timer = window.setTimeout(() => setResendSeconds((seconds) => seconds - 1), 1000)
    return () => window.clearTimeout(timer)
  }, [resendSeconds])

  useEffect(() => {
    if (step !== 'code' || code.length !== CODE_LENGTH || verifying) return
    if (lastSubmittedCodeRef.current === code) return
    lastSubmittedCodeRef.current = code
    void verifyCode(code)
  }, [code, step, verifying])

  const oauthHref = (provider: 'google' | 'github') =>
    `${apiBase}/api/auth/oauth/${provider}?redirect=${encodeURIComponent(target)}`

  const completeAuth = (session: AuthSession) => {
    const externalAppOrigin =
      appBase && new URL(appBase, window.location.origin).origin !== window.location.origin

    if (externalAppOrigin) {
      window.location.assign(
        `${appBase}/app/oauth-callback#access_token=${encodeURIComponent(
          session.accessToken,
        )}&refresh_token=${encodeURIComponent(session.refreshToken)}&redirect=${encodeURIComponent(
          target,
        )}`,
      )
      return
    }

    window.localStorage.setItem('accessToken', session.accessToken)
    window.localStorage.setItem('refreshToken', session.refreshToken)
    window.location.assign(target)
  }

  const startEmailLogin = async (event?: React.FormEvent) => {
    event?.preventDefault()
    if (!trimmedEmail || sending) return
    setError('')
    setSending(true)
    try {
      const response = await fetch(`${apiBase}/api/auth/email/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: trimmedEmail, locale: lang === 'zh' ? 'zh-CN' : 'en' }),
      })
      if (!response.ok) throw new Error(await readError(response, text.failed))
      setDigits(Array(CODE_LENGTH).fill(''))
      lastSubmittedCodeRef.current = ''
      setStep('code')
      setResendSeconds(RESEND_SECONDS)
      window.setTimeout(() => digitRefs.current[0]?.focus(), 80)
    } catch (err) {
      setError(err instanceof Error ? err.message : text.failed)
    } finally {
      setSending(false)
    }
  }

  const loginWithPassword = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!trimmedEmail || !password || verifying) return
    setError('')
    setVerifying(true)
    try {
      const response = await fetch(`${apiBase}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: trimmedEmail, password }),
      })
      if (!response.ok) throw new Error(await readError(response, text.failed))
      completeAuth((await response.json()) as AuthSession)
    } catch (err) {
      setError(err instanceof Error ? err.message : text.failed)
    } finally {
      setVerifying(false)
    }
  }

  async function verifyCode(nextCode: string) {
    if (!trimmedEmail || nextCode.length !== CODE_LENGTH || verifying) return
    setError('')
    setVerifying(true)
    try {
      const response = await fetch(`${apiBase}/api/auth/email/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: trimmedEmail, code: nextCode }),
      })
      if (!response.ok) throw new Error(await readError(response, text.failed))
      completeAuth((await response.json()) as AuthSession)
    } catch (err) {
      setError(err instanceof Error ? err.message : text.failed)
      lastSubmittedCodeRef.current = ''
    } finally {
      setVerifying(false)
    }
  }

  const updateDigit = (index: number, value: string) => {
    const cleaned = sanitizeDigits(value)
    if (!cleaned) {
      setDigits((current) =>
        current.map((digit, digitIndex) => (digitIndex === index ? '' : digit)),
      )
      return
    }
    setDigits((current) => {
      const next = [...current]
      for (let offset = 0; offset < cleaned.length && index + offset < CODE_LENGTH; offset += 1) {
        next[index + offset] = cleaned[offset] ?? ''
      }
      return next
    })
    window.setTimeout(
      () => digitRefs.current[Math.min(index + cleaned.length, CODE_LENGTH - 1)]?.focus(),
      0,
    )
  }

  const goBack = () => {
    setError('')
    setDigits(Array(CODE_LENGTH).fill(''))
    lastSubmittedCodeRef.current = ''
    setStep('choose')
  }

  return (
    <Dialog isOpen={open} onClose={onClose}>
      <DialogContent
        hideCloseButton
        maxWidth="max-w-[600px]"
        className="max-h-[calc(100dvh-32px)] overflow-y-auto border-white/70 px-5 py-8 sm:px-12 sm:py-10"
      >
        <div
          className="pointer-events-none absolute -left-24 -top-28 h-72 w-72 rounded-full bg-primary/35 blur-[95px]"
          aria-hidden="true"
        />
        <div
          className="pointer-events-none absolute -bottom-32 -right-20 h-80 w-80 rounded-full bg-danger/20 blur-[105px]"
          aria-hidden="true"
        />

        {step === 'code' ? (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="absolute left-5 top-5 z-20"
            onClick={goBack}
            aria-label={text.back}
          >
            <ChevronLeft size={22} />
          </Button>
        ) : null}
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="absolute right-5 top-5 z-20"
          onClick={onClose}
          aria-label={text.close}
        >
          <X size={22} />
        </Button>

        <div className="relative z-10 mx-auto flex max-w-[486px] flex-col items-center">
          <div className="mb-10 flex items-center gap-2 text-[24px] font-black tracking-normal text-text-primary">
            <img src="/Logo.svg" alt={text.brand} className="h-8 w-8 rounded-full" />
            <span>
              {text.brand} <strong>OwnBuddy</strong>
            </span>
          </div>

          {step === 'choose' ? (
            <>
              <div className="mb-8 text-center">
                <DialogTitle className="text-[34px] normal-case leading-tight tracking-normal sm:text-[38px]">
                  {text.welcomeTitle}
                </DialogTitle>
                <DialogDescription className="mt-4 text-[15px] not-italic leading-6">
                  {text.welcomeSubtitle}
                </DialogDescription>
              </div>

              <div className="flex w-full flex-col gap-3">
                <Button
                  asChild
                  variant="glass"
                  size="lg"
                  className="w-full normal-case tracking-normal"
                >
                  <a href={oauthHref('google')}>
                    <GoogleIcon />
                    {text.google}
                  </a>
                </Button>
                <Button
                  asChild
                  variant="glass"
                  size="lg"
                  className="w-full normal-case tracking-normal"
                >
                  <a href={oauthHref('github')}>
                    <Github size={20} fill="currentColor" strokeWidth={0} aria-hidden="true" />
                    {text.github}
                  </a>
                </Button>
              </div>

              <Divider label={text.or} className="w-full" />

              {mode === 'email-code' ? (
                <form className="w-full space-y-4" onSubmit={startEmailLogin}>
                  {error ? (
                    <Alert variant="destructive">
                      <AlertDescription>{error}</AlertDescription>
                    </Alert>
                  ) : null}
                  <Input
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder={text.emailPlaceholder}
                    autoComplete="email"
                    required
                    icon={Mail}
                    label={text.emailLabel}
                  />
                  <Button
                    type="submit"
                    size="xl"
                    className="w-full"
                    loading={sending}
                    disabled={!trimmedEmail || sending}
                  >
                    {sending ? text.continuingEmail : text.continueEmail}
                  </Button>
                </form>
              ) : (
                <form className="w-full space-y-4" onSubmit={loginWithPassword}>
                  {error ? (
                    <Alert variant="destructive">
                      <AlertDescription>{error}</AlertDescription>
                    </Alert>
                  ) : null}
                  <Input
                    type="text"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder={text.emailOrUsernamePlaceholder}
                    autoComplete="username"
                    required
                    icon={Mail}
                    label={text.emailOrUsernameLabel}
                  />
                  <Input
                    type="password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder={text.passwordLabel}
                    autoComplete="current-password"
                    required
                    icon={KeyRound}
                    label={text.passwordLabel}
                  />
                  <Button
                    type="submit"
                    size="xl"
                    className="w-full"
                    loading={verifying}
                    disabled={!trimmedEmail || !password || verifying}
                  >
                    {verifying ? text.loggingIn : text.login}
                  </Button>
                </form>
              )}

              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="mt-3 normal-case tracking-normal text-text-muted"
                onClick={() => {
                  setMode(mode === 'email-code' ? 'password' : 'email-code')
                  setError('')
                }}
              >
                {mode === 'email-code' ? text.switchToPassword : text.switchToEmailCode}
              </Button>

              <p className="mt-7 max-w-[430px] text-center text-[12px] font-bold leading-5 text-text-muted">
                {text.termsPrefix}{' '}
                <a className="text-primary hover:underline" href={legalHref('terms', lang)}>
                  {text.terms}
                </a>
                {` ${text.termsJoiner} `}
                <a className="text-primary hover:underline" href={legalHref('privacy', lang)}>
                  {text.privacy}
                </a>
              </p>
            </>
          ) : (
            <>
              <div className="mb-9 text-center">
                <DialogTitle className="text-[32px] normal-case leading-tight tracking-normal sm:text-[36px]">
                  {text.checkEmailTitle}
                </DialogTitle>
                <DialogDescription className="mt-5 text-[15px] not-italic leading-7">
                  {text.checkEmailMessage}
                  <br />
                  <span className="text-text-secondary">{trimmedEmail}</span>
                </DialogDescription>
              </div>

              {error ? (
                <Alert variant="destructive" className="mb-5 w-full">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              ) : null}

              <div className="grid w-full grid-cols-6 gap-2 sm:gap-3">
                {digits.map((digit, index) => (
                  <input
                    key={`digit-${index}`}
                    ref={(node) => {
                      digitRefs.current[index] = node
                    }}
                    type="text"
                    inputMode="numeric"
                    autoComplete={index === 0 ? 'one-time-code' : 'off'}
                    value={digit}
                    maxLength={CODE_LENGTH}
                    onChange={(event) => updateDigit(index, event.target.value)}
                    onFocus={(event) => event.target.select()}
                    onKeyDown={(event) => {
                      if (event.key === 'Backspace' && !digits[index] && index > 0) {
                        digitRefs.current[index - 1]?.focus()
                      }
                    }}
                    aria-label={text.codeDigit(index + 1)}
                    className="h-16 min-w-0 rounded-2xl border border-border-subtle/60 bg-bg-primary/50 text-center text-[24px] font-black text-text-primary outline-none transition-all focus:border-primary/70 focus:shadow-[0_0_0_4px_rgba(0,198,209,0.12)]"
                  />
                ))}
              </div>

              <div className="mt-8 min-h-8 text-center">
                {verifying ? (
                  <div className="inline-flex items-center gap-2 text-[15px] font-black text-text-muted">
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                    {text.verifying}
                  </div>
                ) : (
                  <Button
                    type="button"
                    variant="ghost"
                    disabled={sending || resendSeconds > 0}
                    onClick={() => startEmailLogin()}
                  >
                    {resendSeconds > 0 ? text.resendIn(resendSeconds) : text.resend}
                  </Button>
                )}
              </div>

              <div className="mt-6 inline-flex items-center gap-2 text-[13px] font-bold text-text-muted">
                <Mail size={15} aria-hidden="true" />
                {text.codeSent}
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
