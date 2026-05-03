import { Badge, Button, FormField, Input } from '@shadowob/ui'
import { useMutation } from '@tanstack/react-query'
import { Key, Mail, ShieldCheck, Ticket, User } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { fetchApi } from '../../lib/api'
import { getApiErrorMessage } from '../../lib/api-errors'
import { showToast } from '../../lib/toast'
import { useAuthStore } from '../../stores/auth.store'
import { SettingsCard, SettingsPanel } from './_shared'

export function AccountSettings() {
  const { t } = useTranslation()
  const { user, setUser } = useAuthStore()
  const [oldPassword, setOldPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [inviteCode, setInviteCode] = useState('')
  const [touched, setTouched] = useState<Record<string, boolean>>({})

  const passwordErrors = {
    newPassword:
      touched.newPassword && newPassword.length > 0 && newPassword.length < 8
        ? t('settings.passwordTooShort')
        : null,
    confirmPassword:
      touched.confirmPassword && confirmPassword.length > 0 && newPassword !== confirmPassword
        ? t('settings.passwordMismatch')
        : null,
  }

  const changePasswordMutation = useMutation({
    mutationFn: async () => {
      if (newPassword !== confirmPassword) {
        throw new Error(t('settings.passwordMismatch'))
      }
      if (newPassword.length < 8) {
        throw new Error(t('settings.passwordTooShort'))
      }
      await fetchApi('/api/auth/password', {
        method: 'PUT',
        body: JSON.stringify({ oldPassword, newPassword, confirmPassword }),
      })
    },
    onSuccess: () => {
      showToast(t('settings.passwordChangedSuccess'), 'success')
      setOldPassword('')
      setNewPassword('')
      setConfirmPassword('')
    },
    onError: (err) => {
      showToast(err instanceof Error ? err.message : t('settings.passwordChangeFailed'), 'error')
    },
  })

  const redeemInviteMutation = useMutation({
    mutationFn: async () =>
      fetchApi<NonNullable<typeof user>['membership']>('/api/membership/redeem-invite', {
        method: 'POST',
        body: JSON.stringify({ code: inviteCode }),
      }),
    onSuccess: (membership) => {
      if (membership) setUser({ ...user!, membership })
      setInviteCode('')
      showToast(t('settings.membershipRedeemedSuccess'), 'success')
    },
    onError: (err) => {
      showToast(getApiErrorMessage(err, t, 'settings.membershipRedeemFailed'), 'error')
    },
  })

  if (!user) return null

  const membership = user.membership
  const tierKey = membership?.status ?? 'visitor'
  const tierLabel = t(`settings.membershipTiers.${tierKey}`, membership?.tier?.label ?? tierKey)
  const capabilityLabels =
    membership?.capabilities.map((capability) => {
      const capabilityKey = capability.replace(/[:.]/g, '_')
      return t(`settings.membershipCapabilityLabels.${capabilityKey}`, capability)
    }) ?? []

  return (
    <SettingsPanel>
      {/* Account Info */}
      <SettingsCard>
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-3">
            <Mail size={16} className="text-text-muted shrink-0" />
            <span className="text-sm text-text-muted">{t('settings.emailLabel')}</span>
            <span className="text-sm font-bold text-text-primary ml-auto truncate max-w-[240px]">
              {user.email}
            </span>
          </div>
          <div className="border-t border-border-subtle" />
          <div className="flex items-center gap-3">
            <User size={16} className="text-text-muted shrink-0" />
            <span className="text-sm text-text-muted">{t('settings.usernameLabel')}</span>
            <span className="text-sm font-bold text-text-primary ml-auto">@{user.username}</span>
          </div>
          <div className="border-t border-border-subtle" />
          <div className="flex items-center gap-3">
            <ShieldCheck size={16} className="text-text-muted shrink-0" />
            <span className="text-sm text-text-muted">{t('settings.membershipStatusLabel')}</span>
            <div className="ml-auto flex items-center gap-2">
              <Badge variant={membership?.isMember ? 'success' : 'neutral'}>{tierLabel}</Badge>
              <span className="text-xs font-bold text-text-muted">
                {t('settings.membershipLevelLabel', { level: membership?.level ?? 0 })}
              </span>
            </div>
          </div>
          <div className="border-t border-border-subtle" />
          <div className="flex items-center gap-3">
            <Ticket size={16} className="text-text-muted shrink-0" />
            <span className="text-sm text-text-muted">
              {t('settings.membershipCapabilitiesLabel')}
            </span>
            <span className="text-xs font-bold text-text-primary ml-auto">
              {capabilityLabels.length
                ? capabilityLabels.join(', ')
                : t('settings.membershipNoCapabilities')}
            </span>
          </div>
        </div>
      </SettingsCard>

      {!membership?.isMember ? (
        <SettingsCard>
          <div className="space-y-4">
            <span className="block text-[11px] font-black uppercase tracking-[0.2em] text-text-muted/60">
              {t('settings.membershipRedeemTitle')}
            </span>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Input
                value={inviteCode}
                onChange={(e) => setInviteCode(e.target.value)}
                placeholder={t('settings.membershipRedeemPlaceholder')}
                className="font-mono tracking-widest"
              />
              <Button
                type="button"
                icon={Ticket}
                disabled={!inviteCode.trim()}
                loading={redeemInviteMutation.isPending}
                onClick={() => redeemInviteMutation.mutate()}
              >
                {t('settings.membershipRedeemAction')}
              </Button>
            </div>
            <p className="text-xs text-text-muted">{t('settings.membershipVisitorHint')}</p>
          </div>
        </SettingsCard>
      ) : null}

      {/* Change Password */}
      <SettingsCard>
        <form autoComplete="off" onSubmit={(e) => e.preventDefault()} className="space-y-5">
          <span className="block text-[11px] font-black uppercase tracking-[0.2em] text-text-muted/60">
            {t('settings.changePasswordTitle')}
          </span>

          <FormField label={t('settings.oldPasswordLabel')}>
            <Input
              id="old-password"
              type="password"
              autoComplete="off"
              data-1p-ignore
              data-lpignore="true"
              data-form-type="other"
              value={oldPassword}
              onChange={(e) => setOldPassword(e.target.value)}
              placeholder="••••••••"
            />
          </FormField>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <FormField
              label={t('settings.newPasswordLabel')}
              error={passwordErrors.newPassword ?? undefined}
            >
              <Input
                id="new-password"
                type="password"
                autoComplete="off"
                data-1p-ignore
                data-lpignore="true"
                data-form-type="other"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                onBlur={() => setTouched((prev) => ({ ...prev, newPassword: true }))}
                placeholder="••••••••"
                className={passwordErrors.newPassword ? 'border-danger' : ''}
              />
            </FormField>
            <FormField
              label={t('settings.confirmPasswordLabel')}
              error={passwordErrors.confirmPassword ?? undefined}
            >
              <Input
                id="confirm-password"
                type="password"
                autoComplete="off"
                data-1p-ignore
                data-lpignore="true"
                data-form-type="other"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                onBlur={() => setTouched((prev) => ({ ...prev, confirmPassword: true }))}
                placeholder="••••••••"
                className={passwordErrors.confirmPassword ? 'border-danger' : ''}
              />
            </FormField>
          </div>

          <div className="flex justify-end pt-2">
            <Button
              onClick={() => changePasswordMutation.mutate()}
              disabled={
                !oldPassword ||
                !newPassword ||
                !confirmPassword ||
                !!passwordErrors.newPassword ||
                !!passwordErrors.confirmPassword
              }
              loading={changePasswordMutation.isPending}
              icon={Key}
              size="lg"
              className="px-10"
            >
              {t('settings.changePassword')}
            </Button>
          </div>
        </form>
      </SettingsCard>
    </SettingsPanel>
  )
}
