import { useSearch } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { LoginPanel } from '../components/auth/login-panel'
import { useAppStatus } from '../hooks/use-app-status'

export function LoginPage() {
  const { t } = useTranslation()
  const searchParams = useSearch({ strict: false }) as { redirect?: string }
  useAppStatus({ title: t('auth.loginTitle'), variant: 'auth' })

  return (
    <div className="relative min-h-screen overflow-hidden bg-bg-deep px-4 py-8 text-text-primary sm:px-6">
      <div
        className="pointer-events-none absolute -left-24 -top-28 h-[520px] w-[520px] rounded-full bg-primary/25 blur-[120px]"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute -bottom-32 -right-24 h-[560px] w-[560px] rounded-full bg-danger/20 blur-[130px]"
        aria-hidden="true"
      />
      <div className="relative z-10 mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-[580px] items-center justify-center">
        <LoginPanel variant="page" redirect={searchParams.redirect} />
      </div>
    </div>
  )
}
