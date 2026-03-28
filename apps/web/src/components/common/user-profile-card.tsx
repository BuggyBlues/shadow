import { useNavigate } from '@tanstack/react-router'
import { QrCode } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { QRPoster } from '../qr'
import { UserAvatar } from './avatar'
import { formatDuration, OnlineRank } from './online-rank'

interface UserProfileCardProps {
  user: {
    id: string
    username: string
    displayName: string
    avatarUrl: string | null
    status?: string
    isBot?: boolean
  }
  role?: 'owner' | 'admin' | 'member' | null
  ownerName?: string
  ownerId?: string
  ownerAvatarUrl?: string | null
  description?: string
  totalOnlineSeconds?: number
  className?: string
}

const statusColors: Record<string, string> = {
  online: 'bg-green-500',
  idle: 'bg-yellow-500',
  dnd: 'bg-red-500',
  offline: 'bg-gray-500',
}

const statusLabels: Record<string, string> = {
  online: 'member.online',
  idle: 'member.idle',
  dnd: 'member.dnd',
  offline: 'member.offline',
}

export function UserProfileCard({
  user,
  role,
  ownerName,
  ownerId,
  ownerAvatarUrl,
  description,
  totalOnlineSeconds,
  className = '',
}: UserProfileCardProps) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [showQrCard, setShowQrCard] = useState(false)
  const status = user.status ?? 'offline'

  const goToProfile = (userId: string) => {
    navigate({ to: '/profile/$userId', params: { userId } })
  }

  return (
    <div
      className={`bg-bg-tertiary border border-border-dim rounded-xl shadow-2xl w-64 overflow-hidden ${className}`}
      onClick={(e) => e.stopPropagation()}
    >
      {/* Banner */}
      <div className="h-16 bg-gradient-to-r from-primary/40 to-primary/20" />

      {/* Avatar overlapping banner */}
      <div className="px-4 -mt-8">
        <div className="relative inline-block">
          <UserAvatar
            userId={user.id}
            avatarUrl={user.avatarUrl}
            displayName={user.displayName}
            size="xl"
            className="border-4 border-bg-tertiary"
          />
          <div
            className={`absolute bottom-1 right-1 w-4 h-4 rounded-full border-2 border-bg-tertiary ${statusColors[status]}`}
          />
        </div>
      </div>

      {/* User info */}
      <div className="px-4 pt-2 pb-4">
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => goToProfile(user.id)}
            className="text-base font-bold text-text-primary truncate hover:text-primary hover:underline transition cursor-pointer"
          >
            {user.displayName}
          </button>
          {user.isBot && (
            <span className="text-[10px] bg-primary/20 text-primary px-1.5 py-0.5 rounded font-medium shrink-0">
              {t('common.bot')}
            </span>
          )}
        </div>
        <p className="text-sm text-text-muted">@{user.username}</p>

        {/* Role badge */}
        {role && role !== 'member' && (
          <div className="mt-2">
            <span
              className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                role === 'owner'
                  ? 'bg-yellow-500/20 text-yellow-400'
                  : 'bg-blue-500/20 text-blue-400'
              }`}
            >
              {t(`member.${role}`)}
            </span>
          </div>
        )}

        {/* Status */}
        <div className="flex items-center gap-2 mt-3 pt-3 border-t border-border-subtle">
          <div className={`w-2.5 h-2.5 rounded-full ${statusColors[status]}`} />
          <span className="text-xs text-text-secondary">
            {t(statusLabels[status] ?? 'member.offline')}
          </span>
        </div>

        {/* Online duration + rank (bot only) */}
        {user.isBot && totalOnlineSeconds != null && totalOnlineSeconds > 0 && (
          <div className="flex items-center justify-between mt-2">
            <span className="text-[11px] text-text-muted">
              在线 {formatDuration(totalOnlineSeconds)}
            </span>
            <OnlineRank totalSeconds={totalOnlineSeconds} />
          </div>
        )}

        {user.isBot && ownerName && (
          <div className="mt-3 pt-3 border-t border-border-subtle">
            <p className="text-[10px] uppercase tracking-wide text-text-muted mb-1">OWNER / 主人</p>
            {ownerId ? (
              <button
                type="button"
                onClick={() => goToProfile(ownerId)}
                className="flex items-center gap-2 w-full hover:bg-bg-modifier-hover rounded-md p-1 transition cursor-pointer"
              >
                <UserAvatar
                  userId={ownerId}
                  avatarUrl={ownerAvatarUrl ?? null}
                  displayName={ownerName}
                  size="xs"
                />
                <span className="text-sm text-primary truncate hover:underline">{ownerName}</span>
              </button>
            ) : (
              <p className="text-sm text-text-primary mt-1 truncate">{ownerName}</p>
            )}
          </div>
        )}

        {user.isBot && description && (
          <div className="mt-3 pt-3 border-t border-border-subtle">
            <p className="text-[10px] uppercase tracking-wide text-text-muted">
              Description / 描述
            </p>
            <p className="text-sm text-text-secondary mt-1 whitespace-pre-wrap break-words line-clamp-4">
              {description}
            </p>
          </div>
        )}

        {/* Business Card Button - Show for both users and bots */}
        <div className="mt-3 pt-3 border-t border-border-subtle">
          <button
            type="button"
            onClick={() => setShowQrCard(true)}
            className="flex items-center justify-center gap-2 w-full px-3 py-2 bg-primary/10 hover:bg-primary/20 text-primary rounded-lg transition text-sm font-medium"
          >
            <QrCode className="w-4 h-4" />
            {t('profile.viewBusinessCard', '查看名片')}
          </button>
        </div>
      </div>

      {/* QR Code Business Card Modal */}
      {showQrCard && (
        <QRPoster
          type={user.isBot ? 'buddy' : 'user'}
          entityId={user.id}
          entityName={user.displayName}
          entityAvatar={user.avatarUrl}
          entityDescription={user.isBot ? description : undefined}
          onClose={() => setShowQrCard(false)}
        />
      )}
    </div>
  )
}
