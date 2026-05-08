import { Alert, AlertDescription, Button, Card, cn, Divider, Input } from '@shadowob/ui'
import { useNavigate } from '@tanstack/react-router'
import { ChevronLeft, Github, KeyRound, Mail, X } from 'lucide-react'
import type React from 'react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { fetchApi } from '../../lib/api'
import { getApiErrorMessage } from '../../lib/api-errors'
import {
  authenticatedRouterPathFromRedirect,
  currentAppRedirect,
  webRedirectFromRouterPath,
} from '../../lib/auth-redirect'
import { type AuthenticatedSession, applyAuthenticatedSession } from '../../lib/auth-session'

const CODE_LENGTH = 6
const RESEND_SECONDS = 60

type GoogleCredentialResponse = {
  credential?: string
}

type GoogleAccounts = {
  accounts?: {
    id?: {
      initialize: (input: {
        client_id: string
        callback: (response: GoogleCredentialResponse) => void
        use_fedcm_for_prompt?: boolean
      }) => void
      prompt: () => void
    }
  }
}

type LoginPanelProps = {
  variant: 'modal' | 'page'
  redirect?: string | null
  onClose?: () => void
  onComplete?: () => void
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

function legalHref(kind: 'terms' | 'privacy', language: string) {
  const prefix = language.startsWith('zh') ? '/zh' : ''
  return `${prefix}/${kind}`
}

export function LoginPanel({ variant, redirect, onClose, onComplete }: LoginPanelProps) {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const digitRefs = useRef<Array<HTMLInputElement | null>>([])
  const lastSubmittedCodeRef = useRef('')
  const verificationInFlightRef = useRef(false)

  const [step, setStep] = useState<'choose' | 'code' | 'password'>('choose')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [digits, setDigits] = useState<string[]>(() => Array(CODE_LENGTH).fill(''))
  const [error, setError] = useState('')
  const [sending, setSending] = useState(false)
  const [verifying, setVerifying] = useState(false)

  const [resendSeconds, setResendSeconds] = useState(0)
  const routerRedirect = useMemo(
    () => authenticatedRouterPathFromRedirect(redirect ?? currentAppRedirect()),
    [redirect],
  )
  const oauthRedirect = useMemo(() => webRedirectFromRouterPath(routerRedirect), [routerRedirect])
  const apiBase = import.meta.env.VITE_API_BASE ?? ''
  const code = digits.join('')
  const trimmedEmail = email.trim()
  const isBusy = sending || verifying

  const completeAuth = useCallback(
    (session: AuthenticatedSession) => {
      applyAuthenticatedSession(session)
      onComplete?.()
      navigate({ to: routerRedirect })
    },
    [navigate, onComplete, routerRedirect],
  )

  useEffect(() => {
    if (resendSeconds <= 0) return
    const timer = window.setTimeout(() => setResendSeconds((seconds) => seconds - 1), 1000)
    return () => window.clearTimeout(timer)
  }, [resendSeconds])

  useEffect(() => {
    if (code.length < CODE_LENGTH) {
      lastSubmittedCodeRef.current = ''
      return
    }

    if (step !== 'code' || !trimmedEmail || code.length !== CODE_LENGTH) return
    const submissionKey = `${trimmedEmail}:${code}`
    if (verificationInFlightRef.current || lastSubmittedCodeRef.current === submissionKey) {
      return
    }
    lastSubmittedCodeRef.current = submissionKey
    void handleVerifyCode({ email: trimmedEmail, code })
  }, [code, step, trimmedEmail])

  useEffect(() => {
    if (variant !== 'page') return

    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID
    if (!clientId) return

    const initialize = () => {
      const google = (window as Window & { google?: GoogleAccounts }).google
      const identity = google?.accounts?.id
      if (!identity) return
      identity.initialize({
        client_id: clientId,
        use_fedcm_for_prompt: true,
        callback: async (response) => {
          if (!response.credential) return
          try {
            const result = await fetchApi<AuthenticatedSession>('/api/auth/google/id-token', {
              method: 'POST',
              body: JSON.stringify({ credential: response.credential }),
            })
            completeAuth(result)
          } catch {
            // One Tap is an enhancement; keep the visible OAuth, email code, and password paths.
          }
        },
      })
      identity.prompt()
    }

    if ((window as Window & { google?: GoogleAccounts }).google?.accounts?.id) {
      initialize()
      return
    }

    const script = document.createElement('script')
    script.src = 'https://accounts.google.com/gsi/client'
    script.async = true
    script.defer = true
    script.onload = initialize
    document.head.appendChild(script)
    return () => {
      script.onload = null
    }
  }, [completeAuth, variant])

  const startEmailLogin = async (event?: React.FormEvent) => {
    event?.preventDefault()
    if (!trimmedEmail || sending) return

    setError('')
    setSending(true)
    try {
      await fetchApi('/api/auth/email/start', {
        method: 'POST',
        body: JSON.stringify({ email: trimmedEmail, locale: i18n.language }),
      })
      setDigits(Array(CODE_LENGTH).fill(''))
      lastSubmittedCodeRef.current = ''
      setStep('code')
      setResendSeconds(RESEND_SECONDS)
      window.setTimeout(() => digitRefs.current[0]?.focus(), 80)
    } catch (err) {
      setError(getApiErrorMessage(err, t, 'auth.loginFailed'))
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
      const result = await fetchApi<AuthenticatedSession>('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email: trimmedEmail, password }),
      })
      completeAuth(result)
    } catch (err) {
      setError(getApiErrorMessage(err, t, 'auth.loginFailed'))
    } finally {
      setVerifying(false)
    }
  }

  async function handleVerifyCode(input: { email: string; code: string }) {
    const nextCode = input.code.trim()
    if (!input.email || nextCode.length !== CODE_LENGTH || verificationInFlightRef.current) return

    setError('')
    verificationInFlightRef.current = true
    setVerifying(true)
    try {
      const result = await fetchApi<AuthenticatedSession>('/api/auth/email/verify', {
        method: 'POST',
        body: JSON.stringify({ email: input.email, code: nextCode }),
      })
      completeAuth(result)
    } catch (err) {
      setError(getApiErrorMessage(err, t, 'auth.loginFailed'))
    } finally {
      verificationInFlightRef.current = false
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

    const nextFocusIndex = Math.min(index + cleaned.length, CODE_LENGTH - 1)
    window.setTimeout(() => digitRefs.current[nextFocusIndex]?.focus(), 0)
  }

  const handleDigitKeyDown = (index: number, event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Backspace' && !digits[index] && index > 0) {
      digitRefs.current[index - 1]?.focus()
    }
    if (event.key === 'ArrowLeft' && index > 0) {
      event.preventDefault()
      digitRefs.current[index - 1]?.focus()
    }
    if (event.key === 'ArrowRight' && index < CODE_LENGTH - 1) {
      event.preventDefault()
      digitRefs.current[index + 1]?.focus()
    }
  }

  const goBack = () => {
    setError('')
    if (step === 'password') {
      setPassword('')
      setStep('code')
      return
    }
    setStep('choose')
    setDigits(Array(CODE_LENGTH).fill(''))
    lastSubmittedCodeRef.current = ''
  }

  const showPasswordLogin = () => {
    setError('')
    setPassword('')
    setStep('password')
  }

  const showEmailCode = () => {
    setError('')
    setPassword('')
    setStep('code')
    window.setTimeout(() => digitRefs.current[0]?.focus(), 80)
  }

  const terms = (
    <p className="mt-7 max-w-[430px] text-center text-[12px] font-bold leading-5 text-text-muted">
      {t('auth.termsPrefix')}{' '}
      <a className="text-primary hover:underline" href={legalHref('terms', i18n.language)}>
        {t('auth.termsOfService')}
      </a>
      {t('auth.termsJoiner')}
      <a className="text-primary hover:underline" href={legalHref('privacy', i18n.language)}>
        {t('auth.privacyPolicy')}
      </a>
    </p>
  )

  return (
    <Card
      variant="glass"
      className={cn(
        'relative w-full overflow-hidden px-5 py-8 text-text-primary sm:px-10 sm:py-10',
        'rounded-[40px] border-white/70 dark:border-white/10',
        variant === 'page' && 'shadow-[0_28px_90px_rgba(0,0,0,0.28)]',
      )}
    >
      <div
        className="pointer-events-none absolute -left-24 -top-28 h-72 w-72 rounded-full bg-primary/35 blur-[95px]"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute -bottom-32 -right-20 h-80 w-80 rounded-full bg-danger/20 blur-[105px]"
        aria-hidden="true"
      />

      {step !== 'choose' ? (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="absolute left-5 top-5 z-10"
          onClick={goBack}
          aria-label={t('common.back')}
        >
          <ChevronLeft size={22} strokeWidth={2.5} />
        </Button>
      ) : null}

      {onClose ? (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="absolute right-5 top-5 z-10"
          onClick={onClose}
          aria-label={t('common.close')}
        >
          <X size={22} strokeWidth={2.5} />
        </Button>
      ) : null}

      <div className="relative z-10 mx-auto flex max-w-[486px] flex-col items-center">
        <div className="mb-10 flex items-center gap-2 text-[24px] font-black tracking-normal">
          <img src="/logo.png" alt={t('common.brandTitle')} className="h-8 w-8 rounded-full" />
          <span>{t('common.brandNameEn')}</span>
        </div>

        {step === 'choose' ? (
          <>
            <div className="mb-8 text-center">
              <h1 className="text-[34px] font-black leading-tight tracking-normal text-text-primary sm:text-[38px]">
                {t('auth.modalWelcomeTitle')}
              </h1>
              <p className="mt-4 text-[15px] font-bold leading-6 text-text-muted">
                {t('auth.modalWelcomeSubtitle')}
              </p>
            </div>

            <div className="flex w-full flex-col gap-3">
              <Button
                asChild
                variant="glass"
                size="lg"
                className="w-full normal-case tracking-normal"
              >
                <a
                  href={`${apiBase}/api/auth/oauth/google?redirect=${encodeURIComponent(oauthRedirect)}`}
                >
                  <GoogleIcon />
                  {t('auth.continueWithGoogle')}
                </a>
              </Button>
              <Button
                asChild
                variant="glass"
                size="lg"
                className="w-full normal-case tracking-normal"
              >
                <a
                  href={`${apiBase}/api/auth/oauth/github?redirect=${encodeURIComponent(oauthRedirect)}`}
                >
                  <Github size={20} fill="currentColor" strokeWidth={0} aria-hidden="true" />
                  {t('auth.continueWithGitHub')}
                </a>
              </Button>
            </div>

            <Divider label={t('auth.orContinueWith')} className="w-full" />

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
                autoComplete="email"
                required
                icon={Mail}
                label={t('auth.emailLabel')}
                placeholder={t('auth.emailPlaceholder')}
              />
              <Button
                type="submit"
                size="xl"
                className="w-full"
                loading={sending}
                disabled={!trimmedEmail || sending}
              >
                {sending ? t('auth.continuingWithEmail') : t('auth.continueWithEmail')}
              </Button>
            </form>

            {terms}
          </>
        ) : step === 'code' ? (
          <>
            <div className="mb-9 text-center">
              <h1 className="text-[32px] font-black leading-tight tracking-normal text-text-primary sm:text-[36px]">
                {t('auth.checkEmailTitle')}
              </h1>
              <p className="mt-5 text-[15px] font-bold leading-7 text-text-muted">
                {t('auth.checkEmailMessage')}
                <br />
                <span className="text-text-secondary">{trimmedEmail}</span>
              </p>
            </div>

            {error ? (
              <Alert variant="destructive" className="mb-5 w-full">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            ) : null}

            <div className="grid w-full grid-cols-6 gap-2 sm:gap-3">
              {digits.map((digit, index) => (
                <input
                  key={`code-${index}`}
                  ref={(node) => {
                    digitRefs.current[index] = node
                  }}
                  type="text"
                  inputMode="numeric"
                  autoComplete={index === 0 ? 'one-time-code' : 'off'}
                  maxLength={CODE_LENGTH}
                  value={digit}
                  onChange={(event) => updateDigit(index, event.target.value)}
                  onKeyDown={(event) => handleDigitKeyDown(index, event)}
                  onFocus={(event) => event.target.select()}
                  aria-label={t('auth.codeDigitLabel', { index: index + 1 })}
                  className="h-16 min-w-0 rounded-2xl border border-border-subtle/60 bg-bg-primary/50 text-center text-[24px] font-black text-text-primary outline-none transition-all focus:border-primary/70 focus:shadow-[0_0_0_4px_rgba(0,198,209,0.12)]"
                />
              ))}
            </div>

            <div className="mt-8 min-h-8 text-center">
              {verifying ? (
                <div className="inline-flex items-center gap-2 text-[15px] font-black text-text-muted">
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  {t('auth.verifyingEmailCode')}
                </div>
              ) : (
                <Button
                  type="button"
                  variant="ghost"
                  disabled={sending || resendSeconds > 0}
                  onClick={() => startEmailLogin()}
                >
                  {resendSeconds > 0
                    ? t('auth.resendIn', { seconds: resendSeconds })
                    : t('auth.resendCode')}
                </Button>
              )}
            </div>

            <div className="mt-6 inline-flex items-center gap-2 text-[13px] font-bold text-text-muted">
              <Mail size={15} aria-hidden="true" />
              {t('auth.emailCodeSent')}
            </div>

            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="mt-3 normal-case tracking-normal text-text-muted"
              onClick={showPasswordLogin}
            >
              {t('auth.switchToPasswordLogin')}
            </Button>
          </>
        ) : (
          <>
            <div className="mb-9 text-center">
              <h1 className="text-[32px] font-black leading-tight tracking-normal text-text-primary sm:text-[36px]">
                {t('auth.passwordLoginTab')}
              </h1>
              <p className="mt-5 text-[15px] font-bold leading-7 text-text-muted">
                <span className="text-text-secondary">{trimmedEmail}</span>
              </p>
            </div>

            <form className="w-full space-y-4" onSubmit={loginWithPassword}>
              {error ? (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              ) : null}
              <Input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete="current-password"
                required
                icon={KeyRound}
                label={t('auth.passwordLabel')}
                placeholder={t('auth.passwordLabel')}
              />
              <Button
                type="submit"
                size="xl"
                className="w-full"
                loading={verifying}
                disabled={!trimmedEmail || !password || verifying}
              >
                {verifying ? t('auth.loginLoading') : t('auth.loginSubmit')}
              </Button>
            </form>

            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="mt-3 normal-case tracking-normal text-text-muted"
              onClick={showEmailCode}
            >
              {t('auth.switchToEmailCodeLogin')}
            </Button>
          </>
        )}
      </div>
    </Card>
  )
}
