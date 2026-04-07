import { Button, cn, Input } from '@shadowob/ui'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Save } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { UserAvatar } from '../../components/common/avatar'
import { AvatarEditor } from '../../components/common/avatar-editor'
import { LanguageSwitcher } from '../../components/common/language-switcher'
import { PriceDisplay } from '../../components/shop/ui/currency'
import { fetchApi } from '../../lib/api'
import { useAuthStore } from '../../stores/auth.store'
import { useRechargeStore } from '../../stores/recharge.store'

export function ProfileSettings() {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const { user, setUser } = useAuthStore()
  const [displayName, setDisplayName] = useState(user?.displayName ?? '')
  const [selectedAvatar, setSelectedAvatar] = useState<string | null>(null)
  const [message, setMessage] = useState('')
  const [saveSuccess, setSaveSuccess] = useState(false)
  const openRecharge = useRechargeStore((s) => s.openModal)

  const { data: wallet } = useQuery({
    queryKey: ['wallet'],
    queryFn: () => fetchApi<{ balance: number }>('/api/wallet'),
  })

  const updateProfileMutation = useMutation({
    mutationFn: async () => {
      const result = await fetchApi<{
        id: string
        email: string
        username: string
        displayName: string | null
        avatarUrl: string | null
      }>('/api/auth/me', {
        method: 'PATCH',
        body: JSON.stringify({
          displayName: displayName || undefined,
          avatarUrl: selectedAvatar,
        }),
      })
      return result
    },
    onSuccess: (result) => {
      setUser({ ...user!, ...result })
      setMessage(t('common.saveSuccess'))
      setSaveSuccess(true)
      queryClient.invalidateQueries({ queryKey: ['me'] })
    },
    onError: (err) => {
      setMessage(err instanceof Error ? err.message : t('common.saveFailed'))
      setSaveSuccess(false)
    },
  })

  if (!user) return null

  return (
    <>
      <h2 className="text-2xl font-black text-text-primary mb-6">{t('settings.profileTitle')}</h2>

      {/* Preview card */}
      <div className="bg-white/[0.03] backdrop-blur-[32px] rounded-[24px] p-6 mb-8 border border-white/[0.08]">
        <div className="flex items-center gap-4">
          <UserAvatar
            userId={user.id}
            avatarUrl={selectedAvatar ?? user.avatarUrl}
            displayName={displayName || user.username}
            size="xl"
          />
          <div>
            <h3 className="text-lg font-bold text-text-primary">{displayName || user.username}</h3>
            <p className="text-sm text-text-muted">@{user.username}</p>
            <p className="text-xs text-text-muted mt-1">{user.email}</p>
            <div className="mt-2 inline-flex items-center gap-1.5 px-2 py-1 rounded-full bg-white/[0.05] border border-white/[0.08]">
              <span className="text-xs text-text-muted">虾币</span>
              <PriceDisplay amount={wallet?.balance ?? 0} size={13} className="ml-0.5" />
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={openRecharge}
              className="mt-2 ml-2 text-primary hover:bg-primary/10 normal-case tracking-normal font-bold"
            >
              {t('recharge.rechargeNow')}
            </Button>
          </div>
        </div>
      </div>

      {/* Display name */}
      <div className="mb-6">
        <label className="block text-[11px] font-black uppercase text-text-muted tracking-[0.2em] ml-1 mb-2">
          {t('settings.displayNameLabel')}
        </label>
        <Input
          type="text"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          placeholder={user.username}
          className="rounded-[16px] px-4 py-3"
        />
      </div>

      {/* Avatar picker */}
      <div className="mb-8">
        <label className="block text-[11px] font-black uppercase text-text-muted tracking-[0.2em] ml-1 mb-3">
          {t('settings.avatarLabel')}
        </label>
        <AvatarEditor
          value={selectedAvatar ?? user.avatarUrl ?? undefined}
          onChange={setSelectedAvatar}
        />
      </div>

      {/* Language */}
      <div className="mb-8">
        <label className="block text-[11px] font-black uppercase text-text-muted tracking-[0.2em] ml-1 mb-3">
          {t('settings.languageLabel')}
        </label>
        <LanguageSwitcher />
      </div>

      {/* Save */}
      <div className="flex items-center gap-4">
        <Button
          variant="primary"
          onClick={() => updateProfileMutation.mutate()}
          disabled={updateProfileMutation.isPending}
        >
          <Save size={16} />
          {updateProfileMutation.isPending ? t('common.saving') : t('common.saveChanges')}
        </Button>
        {message && (
          <span
            className={cn('text-sm font-bold', saveSuccess ? 'text-green-400' : 'text-red-400')}
          >
            {message}
          </span>
        )}
      </div>
    </>
  )
}
