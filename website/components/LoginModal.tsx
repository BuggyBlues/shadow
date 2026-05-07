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
import { useI18n } from 'rspress/runtime'

declare const __SHADOW_APP_BASE_URL__: string | undefined

const CODE_LENGTH = 6
const RESEND_SECONDS = 60

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

function formatI18n(template: string, values: Record<string, string | number>) {
  return template.replace(/\{(\w+)\}/g, (match, key) => String(values[key] ?? match))
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
  const t = useI18n()
  const text = (key: string) => t(`loginModal.${key}`)
  const formatText = (key: string, values: Record<string, string | number>) =>
    formatI18n(text(key), values)
  const digitRefs = useRef<Array<HTMLInputElement | null>>([])
  const emailInputRef = useRef<HTMLInputElement | null>(null)
  const passwordIdentifierRef = useRef<HTMLInputElement | null>(null)
  const lastSubmittedCodeRef = useRef('')
  const passwordOriginRef = useRef<'choose' | 'code'>('choose')

  const [step, setStep] = useState<'choose' | 'code' | 'password'>('choose')
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
      setError('')
      setDigits(Array(CODE_LENGTH).fill(''))
      setPassword('')
      lastSubmittedCodeRef.current = ''
      passwordOriginRef.current = 'choose'
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    const timer = window.setTimeout(() => {
      if (step === 'choose') {
        emailInputRef.current?.focus()
      } else if (step === 'password') {
        passwordIdentifierRef.current?.focus()
      }
    }, 80)
    return () => window.clearTimeout(timer)
  }, [open, step])

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

  const oauthHref = (provider: 'google' | 'github') => {
    const params = new URLSearchParams({ redirect: target })
    return `${apiBase}/api/auth/oauth/${provider}?${params.toString()}`
  }

  const completeAuth = async (session: AuthSession) => {
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

  const startOAuth = (provider: 'google' | 'github') => {
    setError('')
    window.location.assign(oauthHref(provider))
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
      if (!response.ok) throw new Error(await readError(response, text('failed')))
      setDigits(Array(CODE_LENGTH).fill(''))
      lastSubmittedCodeRef.current = ''
      setStep('code')
      setResendSeconds(RESEND_SECONDS)
      window.setTimeout(() => digitRefs.current[0]?.focus(), 80)
    } catch (err) {
      setError(err instanceof Error ? err.message : text('failed'))
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
      if (!response.ok) throw new Error(await readError(response, text('failed')))
      await completeAuth((await response.json()) as AuthSession)
    } catch (err) {
      setError(err instanceof Error ? err.message : text('failed'))
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
      if (!response.ok) throw new Error(await readError(response, text('failed')))
      await completeAuth((await response.json()) as AuthSession)
    } catch (err) {
      setError(err instanceof Error ? err.message : text('failed'))
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
    if (step === 'password') {
      setPassword('')
      setStep(passwordOriginRef.current)
      return
    }
    setDigits(Array(CODE_LENGTH).fill(''))
    lastSubmittedCodeRef.current = ''
    setStep('choose')
  }

  const showPasswordLogin = () => {
    setError('')
    setPassword('')
    passwordOriginRef.current = step === 'code' ? 'code' : 'choose'
    setStep('password')
  }

  const showEmailCode = () => {
    setError('')
    setPassword('')
    setStep(trimmedEmail ? 'code' : 'choose')
    if (trimmedEmail) window.setTimeout(() => digitRefs.current[0]?.focus(), 80)
  }

  return (
    <Dialog isOpen={open} onClose={onClose}>
      <DialogContent
        hideCloseButton
        maxWidth="max-w-[560px]"
        className="max-h-[calc(80dvh+80px)] w-[calc(100vw-24px)] overflow-y-auto overscroll-contain rounded-[28px] border-white/70 px-4 py-5 sm:max-h-[calc(78dvh+80px)] sm:w-full sm:rounded-[40px] sm:px-9 sm:py-7"
      >
        {step !== 'choose' ? (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="absolute left-5 top-5 z-20"
            onClick={goBack}
            aria-label={text('back')}
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
          aria-label={text('close')}
        >
          <X size={22} />
        </Button>

        <div className="relative z-10 mx-auto flex w-full max-w-[440px] flex-col items-center">
          <div className="mb-4 flex max-w-full items-center gap-2 py-2 text-[20px] font-black tracking-normal text-text-primary sm:mb-6 sm:py-3 sm:text-[22px]">
            <img
              src="/Logo.svg"
              alt={text('brand')}
              className="h-7 w-7 rounded-full sm:h-8 sm:w-8"
            />
            <span className="min-w-0 truncate">
              {text('brand')} <strong>OwnBuddy</strong>
            </span>
          </div>

          {step === 'choose' ? (
            <>
              <div className="mb-4 text-center sm:mb-5">
                <DialogTitle className="text-[26px] normal-case leading-tight tracking-normal sm:text-[34px]">
                  {text('welcomeTitle')}
                </DialogTitle>
                <DialogDescription className="mt-2 text-[15px] not-italic leading-6">
                  {text('welcomeSubtitle')}
                </DialogDescription>
              </div>

              <div className="flex w-full flex-col gap-2.5">
                <Button
                  type="button"
                  variant="glass"
                  size="lg"
                  className="w-full normal-case tracking-normal"
                  onClick={() => startOAuth('google')}
                >
                  <GoogleIcon />
                  {text('google')}
                </Button>
                <Button
                  type="button"
                  variant="glass"
                  size="lg"
                  className="w-full normal-case tracking-normal"
                  onClick={() => startOAuth('github')}
                >
                  <Github size={20} fill="currentColor" strokeWidth={0} aria-hidden="true" />
                  {text('github')}
                </Button>
              </div>

              <Divider label={text('or')} className="my-3 w-full sm:my-4" />

              <form className="w-full space-y-3" onSubmit={startEmailLogin}>
                {error ? (
                  <Alert variant="destructive">
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                ) : null}
                <Input
                  ref={emailInputRef}
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder={text('emailPlaceholder')}
                  autoComplete="email"
                  name="email"
                  required
                  icon={Mail}
                  label={text('emailLabel')}
                />
                <Button
                  type="submit"
                  size="lg"
                  className="w-full"
                  loading={sending}
                  disabled={!trimmedEmail || sending}
                >
                  {sending ? text('continuingEmail') : text('continueEmail')}
                </Button>
              </form>

              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="mt-3 normal-case tracking-normal text-text-muted"
                onClick={showPasswordLogin}
              >
                {text('switchToPassword')}
              </Button>

              <p className="mt-4 max-w-[430px] text-center text-[12px] font-bold leading-5 text-text-muted sm:mt-5">
                {text('termsPrefix')}{' '}
                <a className="text-primary hover:underline" href={legalHref('terms', lang)}>
                  {text('terms')}
                </a>
                {` ${text('termsJoiner')} `}
                <a className="text-primary hover:underline" href={legalHref('privacy', lang)}>
                  {text('privacy')}
                </a>
              </p>
            </>
          ) : step === 'code' ? (
            <>
              <div className="mb-5 text-center sm:mb-6">
                <DialogTitle className="text-[26px] normal-case leading-tight tracking-normal sm:text-[34px]">
                  {text('checkEmailTitle')}
                </DialogTitle>
                <DialogDescription className="mt-3 text-[15px] not-italic leading-6">
                  {text('checkEmailMessage')}
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
                    aria-label={formatText('codeDigit', { index: index + 1 })}
                    className="h-14 min-w-0 rounded-2xl border border-border-subtle/60 bg-bg-primary/50 text-center text-[22px] font-black text-text-primary outline-none transition-all focus:border-primary/70 focus:shadow-[0_0_0_4px_rgba(0,198,209,0.12)]"
                  />
                ))}
              </div>

              <div className="mt-5 min-h-8 text-center">
                {verifying ? (
                  <div className="inline-flex items-center gap-2 text-[15px] font-black text-text-muted">
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                    {text('verifying')}
                  </div>
                ) : (
                  <Button
                    type="button"
                    variant="ghost"
                    disabled={sending || resendSeconds > 0}
                    onClick={() => startEmailLogin()}
                  >
                    {resendSeconds > 0
                      ? formatText('resendIn', { seconds: resendSeconds })
                      : text('resend')}
                  </Button>
                )}
              </div>

              <div className="mt-5 inline-flex items-center gap-2 text-[13px] font-bold text-text-muted">
                <Mail size={15} aria-hidden="true" />
                {text('codeSent')}
              </div>

              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="mt-3 normal-case tracking-normal text-text-muted"
                onClick={showPasswordLogin}
              >
                {text('switchToPassword')}
              </Button>
            </>
          ) : (
            <>
              <div className="mb-5 text-center sm:mb-6">
                <DialogTitle className="text-[26px] normal-case leading-tight tracking-normal sm:text-[34px]">
                  {text('passwordTab')}
                </DialogTitle>
                <DialogDescription className="mt-3 text-[15px] not-italic leading-6">
                  {text('passwordSubtitle')}
                </DialogDescription>
              </div>

              <form className="w-full space-y-3" onSubmit={loginWithPassword}>
                {error ? (
                  <Alert variant="destructive">
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                ) : null}
                <Input
                  ref={passwordIdentifierRef}
                  type="text"
                  inputMode="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder={text('emailOrUsernamePlaceholder')}
                  autoComplete="username"
                  name="username"
                  required
                  icon={Mail}
                  label={text('emailOrUsernameLabel')}
                />
                <Input
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder={text('passwordLabel')}
                  autoComplete="current-password"
                  name="password"
                  required
                  icon={KeyRound}
                  label={text('passwordLabel')}
                />
                <Button
                  type="submit"
                  size="lg"
                  className="w-full"
                  loading={verifying}
                  disabled={!trimmedEmail || !password || verifying}
                >
                  {verifying ? text('loggingIn') : text('login')}
                </Button>
              </form>

              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="mt-3 normal-case tracking-normal text-text-muted"
                onClick={showEmailCode}
              >
                {text('switchToEmailCode')}
              </Button>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
