import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import {
  ArrowLeft,
  BookOpen,
  Check,
  CheckCircle,
  ClipboardCopy,
  Copy,
  Edit2,
  Key,
  MessageSquare,
  Plus,
  Terminal,
  Trash2,
  XCircle,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { UserAvatar } from '../components/common/avatar'
import { AvatarEditor } from '../components/common/avatar-editor'
import { useAppStatus } from '../hooks/use-app-status'
import { useUnreadCount } from '../hooks/use-unread-count'
import { fetchApi } from '../lib/api'
import { useUIStore } from '../stores/ui.store'

/* ── Types ───────────────────────────────────────────── */

interface Buddy {
  id: string
  userId: string
  kernelType: string
  config: Record<string, unknown>
  ownerId: string
  status: 'running' | 'stopped' | 'error'
  containerId: string | null
  lastHeartbeat: string | null
  totalOnlineSeconds: number
  createdAt: string
  updatedAt: string
  isListed?: boolean
  isRented?: boolean
  listingInfo?: {
    listingId: string
    listingStatus: string
    isListed: boolean
  } | null
  buddyUser?: {
    id: string
    username: string
    displayName: string | null
    avatarUrl: string | null
    email: string
  } | null
  owner?: {
    id: string
    username: string
    displayName: string | null
    avatarUrl: string | null
  } | null
}

interface TokenResponse {
  token: string
  buddy: { id: string; userId: string; status: string }
  buddyUser: { id: string; username: string; displayName: string | null; avatarUrl: string | null }
}

/** Renders a compact status badge for a buddy's rental/listing status */
function BuddyListingBadge({ buddy }: { buddy: Buddy }) {
  const { t } = useTranslation()
  if (buddy.isRented) {
    return (
      <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-500 font-bold shrink-0">
        🔒 {t('buddyMgmt.rented')}
      </span>
    )
  }
  if (buddy.isListed) {
    return (
      <span className="text-[10px] px-1.5 py-0.5 rounded bg-green-500/20 text-green-500 font-bold shrink-0">
        📋 {t('buddyMgmt.listed')}
      </span>
    )
  }
  if (buddy.listingInfo) {
    const statusMap: Record<string, { label: string; className: string }> = {
      draft: {
        label: t('buddyMgmt.listingDraft'),
        className: 'bg-gray-500/20 text-gray-400',
      },
      paused: {
        label: t('buddyMgmt.listingPaused'),
        className: 'bg-yellow-500/20 text-yellow-500',
      },
      expired: {
        label: t('buddyMgmt.listingExpired'),
        className: 'bg-gray-500/20 text-gray-400',
      },
      closed: {
        label: t('buddyMgmt.listingClosed'),
        className: 'bg-red-500/20 text-red-400',
      },
    }
    const info = statusMap[buddy.listingInfo.listingStatus]
    if (info) {
      return (
        <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold shrink-0 ${info.className}`}>
          {info.label}
        </span>
      )
    }
  }
  return null
}

/** Returns the status dot color class for a buddy based on heartbeat-based online detection */
function getBuddyOnlineDotClass(buddy: Buddy): string {
  if (buddy.status === 'error') return 'bg-[#da373c]'
  if (buddy.status === 'stopped') return 'bg-[#80848e]'
  // running — check heartbeat
  if (buddy.lastHeartbeat && Date.now() - new Date(buddy.lastHeartbeat).getTime() < 90000) {
    return 'bg-green-500'
  }
  return 'bg-[#80848e]' // running but heartbeat stale → show as offline
}

/** Formats total online seconds into a human-readable duration string */
function formatOnlineDuration(
  totalSeconds: number,
  t: (key: string, defaultValue?: string) => string,
): string {
  if (totalSeconds < 60) return `${totalSeconds}${t('time.seconds', '秒')}`
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  if (hours === 0) return `${minutes}${t('time.minutes', '分钟')}`
  if (hours < 24)
    return `${hours}${t('time.hours', '小时')}${minutes > 0 ? `${minutes}${t('time.minutes', '分钟')}` : ''}`
  const days = Math.floor(hours / 24)
  const remainHours = hours % 24
  return `${days}${t('time.days', '天')}${remainHours > 0 ? `${remainHours}${t('time.hours', '小时')}` : ''}`
}

/* ── Buddy Management Page ──────────────────────────── */

export function BuddyManagementPage() {
  const { t } = useTranslation()
  const unreadCount = useUnreadCount()
  useAppStatus({
    title: t('buddyMgmt.title'),
    unreadCount,
    hasNotification: unreadCount > 0,
    variant: 'workspace',
  })
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const [showCreate, setShowCreate] = useState(false)
  const [showEdit, setShowEdit] = useState(false)
  const [selectedBuddy, setSelectedBuddy] = useState<Buddy | null>(null)
  const [generatedToken, setGeneratedToken] = useState<string | null>(null)
  const [tokenCopied, setTokenCopied] = useState(false)
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)
  const [message, setMessage] = useState<{ text: string; success: boolean } | null>(null)
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; buddy: Buddy } | null>(
    null,
  )

  // Fetch buddies
  const { data: buddies = [], isLoading } = useQuery({
    queryKey: ['buddies'],
    queryFn: () => fetchApi<Buddy[]>('/api/buddies'),
    refetchInterval: 30000, // Refresh every 30s for heartbeat status
  })

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: (id: string) => fetchApi(`/api/buddies/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['buddies'] })
      setDeleteConfirmId(null)
      if (selectedBuddy?.id === deleteConfirmId) setSelectedBuddy(null)
      showMessage(t('buddyMgmt.deleteSuccess'), true)
    },
    onError: () => showMessage(t('buddyMgmt.deleteFailed'), false),
  })

  // Token mutation
  const tokenMutation = useMutation({
    mutationFn: (id: string) =>
      fetchApi<TokenResponse>(`/api/buddies/${id}/token`, { method: 'POST' }),
    onSuccess: (data) => {
      setGeneratedToken(data.token)
      setTokenCopied(false)
      queryClient.invalidateQueries({ queryKey: ['buddies'] })
    },
  })

  // Toggle (start/stop) mutation
  const toggleMutation = useMutation({
    mutationFn: (buddy: Buddy) =>
      fetchApi<Buddy>(`/api/buddies/${buddy.id}/${buddy.status === 'running' ? 'stop' : 'start'}`, {
        method: 'POST',
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['buddies'] })
      // Refresh selected buddy
      if (selectedBuddy) {
        fetchApi<Buddy>(`/api/buddies/${selectedBuddy.id}`).then((a) => setSelectedBuddy(a))
      }
    },
  })

  const showMessage = (text: string, success: boolean) => {
    setMessage({ text, success })
    setTimeout(() => setMessage(null), 3000)
  }

  const copyToken = async (token: string) => {
    await navigator.clipboard.writeText(token)
    setTokenCopied(true)
    showMessage(t('buddyMgmt.tokenCopied'), true)
  }

  const handleBuddyContextMenu = (e: React.MouseEvent, buddy: Buddy) => {
    e.preventDefault()
    setContextMenu({ x: e.clientX, y: e.clientY, buddy })
  }

  // Close context menu on click outside
  useEffect(() => {
    const handleClick = () => setContextMenu(null)
    if (contextMenu) {
      document.addEventListener('click', handleClick)
      return () => document.removeEventListener('click', handleClick)
    }
  }, [contextMenu])

  const statusColor = (status: string) => {
    switch (status) {
      case 'running':
        return 'text-green-400'
      case 'stopped':
        return 'text-zinc-400'
      case 'error':
        return 'text-red-400'
      default:
        return 'text-zinc-400'
    }
  }

  const statusLabel = (status: string) => {
    switch (status) {
      case 'running':
        return t('buddyMgmt.statusRunning')
      case 'stopped':
        return t('buddyMgmt.statusStopped')
      case 'error':
        return t('buddyMgmt.statusError')
      default:
        return status
    }
  }

  return (
    <div className="flex-1 flex flex-col md:flex-row bg-bg-primary overflow-hidden">
      {/* Mobile header */}
      <div className="md:hidden flex items-center gap-2 px-4 py-3 bg-bg-secondary border-b border-border-subtle shrink-0">
        {selectedBuddy ? (
          <button
            onClick={() => {
              setSelectedBuddy(null)
              setGeneratedToken(null)
            }}
            className="flex items-center gap-2 text-text-muted hover:text-text-primary transition text-sm font-medium"
          >
            <ArrowLeft size={16} />
            {t('buddyMgmt.title')}
          </button>
        ) : (
          <>
            <button
              onClick={() => navigate({ to: '/' })}
              className="flex items-center gap-2 text-text-muted hover:text-text-primary transition text-sm font-medium"
            >
              <ArrowLeft size={16} />
              {t('common.back')}
            </button>
            <span className="flex-1" />
            <button
              onClick={() => setShowCreate(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-[#23a559] bg-[#23a559]/10 hover:bg-[#23a559]/20 transition"
            >
              <Plus size={14} />
              {t('buddyMgmt.newBuddy')}
            </button>
          </>
        )}
      </div>

      {/* Mobile buddy list (when no buddy selected) */}
      {!selectedBuddy && (
        <div className="md:hidden flex-1 overflow-y-auto px-3 py-2 space-y-[2px]">
          {buddies.map((buddy) => (
            <button
              key={buddy.id}
              onClick={() => {
                setSelectedBuddy(buddy)
                setGeneratedToken(null)
              }}
              className="flex items-center gap-3 w-full px-3 py-2 rounded-md text-[15px] font-medium text-text-secondary hover:bg-bg-modifier-hover hover:text-text-primary transition"
            >
              <UserAvatar
                userId={buddy.buddyUser?.id ?? buddy.userId}
                avatarUrl={buddy.buddyUser?.avatarUrl}
                displayName={buddy.buddyUser?.displayName ?? undefined}
                size="sm"
              />
              <span className="truncate flex-1 text-left">
                {buddy.buddyUser?.displayName ?? buddy.buddyUser?.username ?? 'Buddy'}
              </span>
              <BuddyListingBadge buddy={buddy} />
              <span className={`w-2 h-2 rounded-full ${getBuddyOnlineDotClass(buddy)}`} />
            </button>
          ))}
        </div>
      )}

      {/* Desktop Sidebar */}
      <div className="w-60 bg-bg-secondary hidden md:flex flex-col shrink-0">
        <div className="p-4 border-b-2 border-bg-tertiary">
          <button
            onClick={() => navigate({ to: '/' })}
            className="flex items-center gap-2 text-text-secondary hover:text-text-primary transition text-[15px] font-medium"
          >
            <ArrowLeft size={16} />
            {t('common.back')}
          </button>
        </div>
        <div className="px-5 py-3 text-[12px] font-bold uppercase text-text-secondary tracking-wide mt-2">
          {t('buddyMgmt.title')}
        </div>

        {/* Buddy list */}
        <div className="flex-1 overflow-y-auto px-3 space-y-[2px]">
          {buddies.map((buddy) => (
            <button
              key={buddy.id}
              onClick={() => {
                setSelectedBuddy(buddy)
                setGeneratedToken(null)
              }}
              onContextMenu={(e) => handleBuddyContextMenu(e, buddy)}
              className={`flex items-center gap-3 w-full px-3 py-2 rounded-md text-[15px] font-medium transition ${
                selectedBuddy?.id === buddy.id
                  ? 'bg-bg-modifier-active text-text-primary'
                  : 'text-text-secondary hover:bg-bg-modifier-hover hover:text-text-primary'
              }`}
            >
              <UserAvatar
                userId={buddy.buddyUser?.id ?? buddy.userId}
                avatarUrl={buddy.buddyUser?.avatarUrl}
                displayName={buddy.buddyUser?.displayName ?? undefined}
                size="sm"
              />
              <span className="truncate flex-1 text-left">
                {buddy.buddyUser?.displayName ?? buddy.buddyUser?.username ?? 'Buddy'}
              </span>
              <BuddyListingBadge buddy={buddy} />
              <span className={`w-2 h-2 rounded-full ${getBuddyOnlineDotClass(buddy)}`} />
            </button>
          ))}

          {/* New Buddy button */}
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 w-full px-3 py-2 rounded-md text-[15px] font-medium text-[#23a559] hover:bg-[#23a559]/10 transition mt-2 mb-2"
          >
            <Plus size={16} />
            {t('buddyMgmt.newBuddy')}
          </button>
        </div>
      </div>

      {/* Content */}
      <div className={`flex-1 overflow-y-auto ${!selectedBuddy ? 'hidden md:block' : ''}`}>
        <div className="max-w-2xl mx-auto p-4 md:p-8">
          {/* Global message */}
          {message && (
            <div
              className={`mb-4 px-4 py-2 rounded-lg text-sm ${
                message.success ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'
              }`}
            >
              {message.text}
            </div>
          )}

          {selectedBuddy ? (
            <BuddyDetail
              buddy={selectedBuddy}
              generatedToken={generatedToken}
              tokenCopied={tokenCopied}
              tokenMutation={tokenMutation}
              statusColor={statusColor}
              statusLabel={statusLabel}
              onCopyToken={copyToken}
              onDelete={() => setDeleteConfirmId(selectedBuddy.id)}
              onEdit={() => setShowEdit(true)}
              onToggle={(buddy) => toggleMutation.mutate(buddy)}
              togglePending={toggleMutation.isPending}
              t={t}
            />
          ) : (
            <EmptyState
              buddies={buddies}
              isLoading={isLoading}
              onCreateClick={() => setShowCreate(true)}
              t={t}
            />
          )}
        </div>
      </div>

      {/* Create dialog */}
      {showCreate && (
        <CreateBuddyDialog
          onClose={() => setShowCreate(false)}
          onSuccess={(buddy) => {
            queryClient.invalidateQueries({ queryKey: ['buddies'] })
            setShowCreate(false)
            setSelectedBuddy(buddy)
            showMessage(t('buddyMgmt.createSuccess'), true)
          }}
          onError={(msg) => showMessage(msg || t('buddyMgmt.createFailed'), false)}
          t={t}
        />
      )}

      {/* Edit dialog */}
      {showEdit && selectedBuddy && (
        <EditBuddyDialog
          buddy={selectedBuddy}
          onClose={() => setShowEdit(false)}
          onSuccess={(buddy) => {
            queryClient.invalidateQueries({ queryKey: ['buddies'] })
            setShowEdit(false)
            setSelectedBuddy(buddy)
            showMessage(t('buddyMgmt.editSuccess'), true)
          }}
          onError={() => showMessage(t('buddyMgmt.editFailed'), false)}
          t={t}
        />
      )}

      {/* Delete confirmation dialog */}
      {deleteConfirmId && (
        <div
          className="fixed inset-0 bg-black/60 flex items-center justify-center z-50"
          onClick={() => setDeleteConfirmId(null)}
        >
          <div
            className="bg-bg-secondary rounded-xl p-6 w-full max-w-96 mx-4 border border-border-subtle"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-xl font-bold text-text-primary mb-2">{t('common.confirm')}</h2>
            <p className="text-text-muted text-sm mb-6">{t('buddyMgmt.deleteConfirm')}</p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setDeleteConfirmId(null)}
                className="px-4 py-2 text-text-secondary hover:text-text-primary transition rounded-lg"
              >
                {t('common.cancel')}
              </button>
              <button
                onClick={() => deleteMutation.mutate(deleteConfirmId)}
                disabled={deleteMutation.isPending}
                className="px-4 py-2 bg-danger text-white rounded-lg hover:bg-red-600 transition font-bold disabled:opacity-50"
              >
                {t('common.delete')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Buddy context menu */}
      {contextMenu && (
        <div
          className="fixed z-50 bg-bg-tertiary border border-border-dim rounded-lg shadow-xl py-1 min-w-[160px]"
          style={{ top: contextMenu.y, left: contextMenu.x }}
        >
          <button
            type="button"
            onClick={() => {
              tokenMutation.mutate(contextMenu.buddy.id)
              setSelectedBuddy(contextMenu.buddy)
              setContextMenu(null)
            }}
            className="flex items-center gap-2 w-full px-3 py-2 text-sm text-text-secondary hover:bg-bg-primary/50 hover:text-text-primary transition"
          >
            <Key size={14} />
            {t('buddyMgmt.generateToken')}
          </button>
          <button
            type="button"
            onClick={() => {
              toggleMutation.mutate(contextMenu.buddy)
              setContextMenu(null)
            }}
            className="flex items-center gap-2 w-full px-3 py-2 text-sm text-text-secondary hover:bg-bg-primary/50 hover:text-text-primary transition"
          >
            {contextMenu.buddy.status === 'running' ? (
              <XCircle size={14} />
            ) : (
              <CheckCircle size={14} />
            )}
            {contextMenu.buddy.status === 'running'
              ? t('buddyMgmt.disable')
              : t('buddyMgmt.enable')}
          </button>
          <button
            type="button"
            onClick={() => {
              setSelectedBuddy(contextMenu.buddy)
              setShowEdit(true)
              setContextMenu(null)
            }}
            className="flex items-center gap-2 w-full px-3 py-2 text-sm text-text-secondary hover:bg-bg-primary/50 hover:text-text-primary transition"
          >
            <Edit2 size={14} />
            {t('common.edit')}
          </button>
          <div className="h-px bg-border-subtle my-1" />
          <button
            type="button"
            onClick={() => {
              setDeleteConfirmId(contextMenu.buddy.id)
              setContextMenu(null)
            }}
            className="flex items-center gap-2 w-full px-3 py-2 text-sm text-red-400 hover:bg-red-500/10 transition"
          >
            <Trash2 size={14} />
            {t('common.delete')}
          </button>
        </div>
      )}
    </div>
  )
}

/* ── Buddy Detail Panel ──────────────────────────────── */

function BuddyDetail({
  buddy,
  generatedToken,
  tokenCopied,
  tokenMutation,
  statusColor,
  statusLabel,
  onCopyToken,
  onDelete,
  onEdit,
  onToggle,
  togglePending,
  t,
}: {
  buddy: Buddy
  generatedToken: string | null
  tokenCopied: boolean
  tokenMutation: ReturnType<typeof useMutation<TokenResponse, Error, string>>
  statusColor: (s: string) => string
  statusLabel: (s: string) => string
  onCopyToken: (token: string) => void
  onDelete: () => void
  onEdit: () => void
  onToggle: (buddy: Buddy) => void
  togglePending: boolean
  t: (key: string) => string
}) {
  const name = buddy.buddyUser?.displayName ?? buddy.buddyUser?.username ?? 'Buddy'
  const desc = (buddy.config?.description as string) ?? ''

  return (
    <>
      {/* Buddy header */}
      <div className="bg-bg-secondary rounded-xl p-6 mb-6 border border-border-subtle">
        <div className="flex items-center gap-4">
          <UserAvatar
            userId={buddy.buddyUser?.id ?? buddy.userId}
            avatarUrl={buddy.buddyUser?.avatarUrl}
            displayName={name}
            size="xl"
          />
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-bold text-text-primary">{name}</h3>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-primary/20 text-primary">
                {t('common.buddy')}
              </span>
            </div>
            {buddy.buddyUser?.username && (
              <p className="text-sm text-text-muted">@{buddy.buddyUser.username}</p>
            )}
            {desc && <p className="text-sm text-text-secondary mt-1">{desc}</p>}
          </div>
          <div className="flex gap-2">
            <button
              onClick={onEdit}
              className="p-2 text-text-muted hover:text-primary transition rounded-lg hover:bg-primary/10"
              title={t('common.edit')}
            >
              <Edit2 size={18} />
            </button>
            <button
              onClick={onDelete}
              className="p-2 text-text-muted hover:text-danger transition rounded-lg hover:bg-danger/10"
              title={t('common.delete')}
            >
              <Trash2 size={18} />
            </button>
          </div>
        </div>
      </div>

      {/* Status & info */}
      <div className="bg-bg-secondary rounded-xl p-6 mb-6 border border-border-subtle grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-[10px] font-bold uppercase text-text-muted mb-1">
            {t('buddyMgmt.status')}
          </label>
          <div className="flex items-center gap-2">
            {(() => {
              if (buddy.status === 'error') {
                return (
                  <div className="flex items-center gap-2 text-red-400">
                    <XCircle size={14} />
                    <span className="text-sm font-medium">{t('buddyMgmt.statusError')}</span>
                  </div>
                )
              }
              if (buddy.status === 'stopped') {
                return (
                  <div className="flex items-center gap-2 text-zinc-400">
                    <span className="w-3 h-3 rounded-full bg-gray-500" />
                    <span className="text-sm font-medium">{t('buddyMgmt.statusStopped')}</span>
                  </div>
                )
              }
              // running — use heartbeat to determine online/offline
              const isOnline =
                buddy.lastHeartbeat && Date.now() - new Date(buddy.lastHeartbeat).getTime() < 90000
              return (
                <div
                  className={`flex items-center gap-2 ${isOnline ? 'text-green-400' : 'text-zinc-400'}`}
                >
                  <span
                    className={`w-3 h-3 rounded-full ${isOnline ? 'bg-green-500' : 'bg-[#80848e]'}`}
                  />
                  <span className="text-sm font-medium">
                    {isOnline ? t('member.online') : t('member.offline')}
                  </span>
                </div>
              )
            })()}
          </div>
        </div>
        <div>
          <label className="block text-[10px] font-bold uppercase text-text-muted mb-1">
            {t('buddyMgmt.enableDisable')}
          </label>
          <button
            type="button"
            onClick={() => onToggle(buddy)}
            disabled={togglePending}
            className={`relative w-11 h-6 rounded-full transition-colors ${
              buddy.status === 'running' ? 'bg-green-500' : 'bg-zinc-600'
            } ${togglePending ? 'opacity-50' : ''}`}
          >
            <span
              className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform ${
                buddy.status === 'running' ? 'translate-x-5' : ''
              }`}
            />
          </button>
        </div>
        <div>
          <label className="block text-[10px] font-bold uppercase text-text-muted mb-1">
            {t('buddyMgmt.owner')}
          </label>
          <div className="flex items-center gap-2">
            {buddy.owner && (
              <UserAvatar
                userId={buddy.owner.id}
                avatarUrl={buddy.owner.avatarUrl}
                displayName={buddy.owner.displayName ?? buddy.owner.username}
                size="xs"
              />
            )}
            <p className="text-sm text-text-primary">
              {buddy.owner?.displayName ?? buddy.owner?.username ?? '—'}
            </p>
          </div>
        </div>
        <div>
          <label className="block text-[10px] font-bold uppercase text-text-muted mb-1">
            {t('buddyMgmt.createdAt')}
          </label>
          <p className="text-sm text-text-primary">{new Date(buddy.createdAt).toLocaleString()}</p>
        </div>
        <div>
          <label className="block text-[10px] font-bold uppercase text-text-muted mb-1">
            {t('buddyMgmt.totalOnlineTime')}
          </label>
          <p className="text-sm text-text-primary">
            {formatOnlineDuration(
              buddy.totalOnlineSeconds ?? 0,
              t as (key: string, defaultValue?: string) => string,
            )}
          </p>
        </div>
        <div>
          <label className="block text-[10px] font-bold uppercase text-text-muted mb-1">
            {t('buddyMgmt.connection')}
          </label>
          {(() => {
            if (!buddy.lastHeartbeat) {
              return (
                <div className="flex items-center gap-2 text-text-muted">
                  <span className="w-2 h-2 rounded-full bg-zinc-500" />
                  <span className="text-sm">{t('buddyMgmt.neverConnected')}</span>
                </div>
              )
            }
            const lastBeat = new Date(buddy.lastHeartbeat).getTime()
            const now = Date.now()
            const diffSec = Math.floor((now - lastBeat) / 1000)
            const isOnline = diffSec < 90
            const isWarning = diffSec >= 90 && diffSec < 300
            return (
              <div className="flex items-center gap-2">
                <span
                  className={`w-2 h-2 rounded-full ${
                    isOnline ? 'bg-green-400' : isWarning ? 'bg-yellow-400' : 'bg-red-400'
                  }`}
                />
                <span
                  className={`text-sm ${
                    isOnline ? 'text-green-400' : isWarning ? 'text-yellow-400' : 'text-red-400'
                  }`}
                >
                  {isOnline
                    ? t('buddyMgmt.connected')
                    : `${t('buddyMgmt.lastSeen')} ${new Date(buddy.lastHeartbeat).toLocaleString()}`}
                </span>
              </div>
            )
          })()}
        </div>
        <div>
          <label className="block text-[10px] font-bold uppercase text-text-muted mb-1">
            {t('buddyMgmt.rentalStatus')}
          </label>
          <div className="flex items-center gap-2">
            {buddy.isRented ? (
              <>
                <span className="w-2 h-2 rounded-full bg-amber-400" />
                <span className="text-sm text-amber-400 font-medium">{t('buddyMgmt.rented')}</span>
              </>
            ) : buddy.isListed ? (
              <>
                <span className="w-2 h-2 rounded-full bg-green-400" />
                <span className="text-sm text-green-400 font-medium">{t('buddyMgmt.listed')}</span>
              </>
            ) : buddy.listingInfo ? (
              <>
                <span className="w-2 h-2 rounded-full bg-yellow-400" />
                <span className="text-sm text-yellow-400 font-medium">
                  {buddy.listingInfo.listingStatus === 'draft'
                    ? t('buddyMgmt.listingDraft')
                    : buddy.listingInfo.listingStatus === 'paused'
                      ? t('buddyMgmt.listingPaused')
                      : buddy.listingInfo.listingStatus === 'expired'
                        ? t('buddyMgmt.listingExpired')
                        : t('buddyMgmt.listingClosed')}
                </span>
              </>
            ) : (
              <>
                <span className="w-2 h-2 rounded-full bg-zinc-500" />
                <span className="text-sm text-text-muted">{t('buddyMgmt.notListed')}</span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Token section */}
      <div className="bg-bg-secondary rounded-xl p-6 mb-6 border border-border-subtle">
        <div className="flex items-center gap-2 mb-2">
          <Key size={16} className="text-primary" />
          <h3 className="text-sm font-bold text-text-primary uppercase tracking-wider">
            {t('buddyMgmt.tokenTitle')}
          </h3>
        </div>
        <p className="text-sm text-text-muted mb-4">{t('buddyMgmt.tokenDesc')}</p>

        {(() => {
          const displayToken =
            generatedToken ?? (buddy.config?.lastToken as string | undefined) ?? null
          if (displayToken) {
            return (
              <div className="space-y-3">
                <div className="bg-bg-tertiary rounded-lg p-3 break-all font-mono text-xs text-text-secondary border border-border-subtle">
                  {displayToken}
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => onCopyToken(displayToken)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition ${
                      tokenCopied
                        ? 'bg-green-500/20 text-green-400'
                        : 'bg-primary hover:bg-primary-hover text-white'
                    }`}
                  >
                    <ClipboardCopy size={14} />
                    {tokenCopied ? t('common.copied') : t('common.copy')}
                  </button>
                  <button
                    onClick={() => tokenMutation.mutate(buddy.id)}
                    disabled={tokenMutation.isPending}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition bg-bg-tertiary text-text-secondary hover:bg-bg-primary/50 hover:text-text-primary disabled:opacity-50"
                  >
                    <Key size={14} />
                    {tokenMutation.isPending
                      ? t('buddyMgmt.generating')
                      : t('buddyMgmt.regenerateToken')}
                  </button>
                </div>

                {/* YAML example */}
                <div className="mt-4">
                  <label className="block text-[10px] font-bold uppercase text-text-muted mb-2">
                    {t('buddyMgmt.configExample')}
                  </label>
                  <pre className="bg-bg-tertiary rounded-lg p-4 text-xs text-text-secondary border border-border-subtle overflow-x-auto">
                    {`{
  "channels": {
    "shadowob": {
      "token": "${displayToken}...",
      "serverUrl": "https://shadowob.com"
    }
  }
}`}
                  </pre>
                </div>
              </div>
            )
          }
          return (
            <button
              onClick={() => tokenMutation.mutate(buddy.id)}
              disabled={tokenMutation.isPending}
              className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary-hover text-white rounded-lg text-sm font-bold transition disabled:opacity-50"
            >
              <Key size={14} />
              {tokenMutation.isPending ? t('buddyMgmt.generating') : t('buddyMgmt.generateToken')}
            </button>
          )
        })()}
      </div>

      {/* OpenClaw Setup Guide */}
      <OpenClawSetupGuide
        buddy={buddy}
        generatedToken={generatedToken}
        onGenerateToken={() => tokenMutation.mutate(buddy.id)}
        generatingToken={tokenMutation.isPending}
        t={t}
      />
    </>
  )
}

/* ── OpenClaw Setup Guide ─────────────────────────────── */

function CopyBlock({
  content,
  label,
  t,
}: {
  content: string
  label?: string
  t: (key: string) => string
}) {
  const [copied, setCopied] = useState(false)
  const handleCopy = async () => {
    await navigator.clipboard.writeText(content)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  return (
    <div className="relative group">
      {label && <p className="text-[10px] font-bold uppercase text-text-muted mb-1">{label}</p>}
      <pre className="bg-bg-tertiary rounded-lg p-3 pr-10 font-mono text-xs text-text-secondary border border-border-subtle overflow-x-auto whitespace-pre-wrap break-all">
        {content}
      </pre>
      <button
        type="button"
        onClick={handleCopy}
        className="absolute top-1.5 right-1.5 p-1.5 rounded-md bg-bg-secondary/80 text-text-muted hover:text-text-primary hover:bg-bg-secondary transition opacity-0 group-hover:opacity-100"
        title={t('common.copy')}
      >
        {copied ? <Check size={12} className="text-green-400" /> : <Copy size={12} />}
      </button>
    </div>
  )
}

function OpenClawSetupGuide({
  buddy,
  generatedToken,
  onGenerateToken,
  generatingToken,
  t,
}: {
  buddy: Buddy
  generatedToken: string | null
  onGenerateToken: () => void
  generatingToken: boolean
  t: (key: string) => string
}) {
  const token = (buddy.config?.lastToken as string | undefined) ?? generatedToken ?? ''
  const hasToken = !!token.trim()
  const serverUrl = window.location.origin
  const [activeTab, setActiveTab] = useState<'manual' | 'chat'>('chat')

  // Bash one-liner for manual setup
  const bashCommand = `openclaw plugins install @shadowob/openclaw-shadowob && openclaw config set channels.shadowob.token "${token || '<TOKEN>'}" && openclaw config set channels.shadowob.serverUrl "${serverUrl}" && openclaw gateway restart`

  // AI prompt for chat-based setup
  const aiPrompt = `请帮我安装和配置 ShadowOwnBuddy 插件，连接到 Shadow 服务器。

配置信息：
- 插件名称：@shadowob/openclaw
- 服务器地址：${serverUrl}

请执行以下步骤：
1. 安装插件：openclaw plugins install @shadowob/openclaw
2. 配置 Token：openclaw config set channels.shadowob.token "${token || '<TOKEN>'}"
3. 配置服务器地址：openclaw config set channels.shadowob.serverUrl "${serverUrl}"
4. 重启网关：openclaw gateway restart

请依次执行这些命令，并确认每个步骤是否成功。`

  if (!hasToken) {
    return (
      <div className="bg-bg-secondary rounded-xl p-6 mb-6 border border-border-subtle">
        <div className="flex items-center gap-2 mb-3">
          <BookOpen size={16} className="text-primary" />
          <h3 className="text-sm font-bold text-text-primary uppercase tracking-wider">
            {t('buddyMgmt.openclawGuideTitle')}
          </h3>
        </div>
        <p className="text-sm text-text-muted mb-4">{t('buddyMgmt.setupTokenWarning')}</p>
        <button
          type="button"
          onClick={onGenerateToken}
          disabled={generatingToken}
          className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary-hover text-white rounded-lg text-sm font-bold transition disabled:opacity-50"
        >
          <Key size={14} />
          {generatingToken ? t('buddyMgmt.generating') : t('buddyMgmt.generateToken')}
        </button>
      </div>
    )
  }

  return (
    <div className="bg-bg-secondary rounded-xl p-6 mb-6 border border-border-subtle">
      <div className="flex items-center gap-2 mb-3">
        <BookOpen size={16} className="text-primary" />
        <h3 className="text-sm font-bold text-text-primary uppercase tracking-wider">
          {t('buddyMgmt.openclawGuideTitle')}
        </h3>
      </div>
      <p className="text-sm text-text-muted mb-4">{t('buddyMgmt.openclawGuideDesc')}</p>

      {/* Tab selector */}
      <div className="flex gap-1 mb-4 bg-bg-tertiary rounded-lg p-1">
        <button
          type="button"
          onClick={() => setActiveTab('manual')}
          className={`flex items-center gap-1.5 flex-1 px-3 py-2 rounded-md text-xs font-bold transition ${
            activeTab === 'manual'
              ? 'bg-bg-secondary text-text-primary shadow-sm'
              : 'text-text-muted hover:text-text-secondary'
          }`}
        >
          <Terminal size={12} />
          {t('buddyMgmt.setupManual')}
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('chat')}
          className={`flex items-center gap-1.5 flex-1 px-3 py-2 rounded-md text-xs font-bold transition ${
            activeTab === 'chat'
              ? 'bg-bg-secondary text-text-primary shadow-sm'
              : 'text-text-muted hover:text-text-secondary'
          }`}
        >
          <MessageSquare size={12} />
          {t('buddyMgmt.setupChat')}
        </button>
      </div>

      {activeTab === 'manual' ? (
        <>
          {/* Quick bash one-liner */}
          <div className="mb-4">
            <p className="text-xs font-bold text-text-secondary mb-2">
              {t('buddyMgmt.setupBashTitle')}
            </p>
            <CopyBlock content={bashCommand} t={t} />
            {!token && (
              <p className="text-[10px] text-yellow-400 mt-1.5 ml-1">
                ⚠ {t('buddyMgmt.setupTokenWarning')}
              </p>
            )}
          </div>

          <div className="h-px bg-border-subtle my-4" />

          {/* Step-by-step */}
          <p className="text-xs font-bold text-text-muted uppercase tracking-wider mb-3">
            {t('buddyMgmt.setupStepByStep')}
          </p>

          {/* Step 1: Install */}
          <div className="mb-3">
            <div className="flex items-center gap-2 mb-1.5">
              <span className="w-5 h-5 rounded-full bg-primary/20 text-primary text-xs font-bold flex items-center justify-center">
                1
              </span>
              <span className="text-sm font-bold text-text-primary">
                {t('docs.openclawStep1Title')}
              </span>
            </div>
            <div className="ml-7">
              <CopyBlock content="openclaw plugins install @shadowob/openclaw-shadowob" t={t} />
            </div>
          </div>

          {/* Step 2: Config Token */}
          <div className="mb-3">
            <div className="flex items-center gap-2 mb-1.5">
              <span className="w-5 h-5 rounded-full bg-primary/20 text-primary text-xs font-bold flex items-center justify-center">
                2
              </span>
              <span className="text-sm font-bold text-text-primary">
                {t('buddyMgmt.setupConfigToken')}
              </span>
            </div>
            <div className="ml-7">
              <CopyBlock content={`openclaw config set channels.shadowob.token "${token}"`} t={t} />
            </div>
          </div>

          {/* Step 3: Config Server URL */}
          <div className="mb-3">
            <div className="flex items-center gap-2 mb-1.5">
              <span className="w-5 h-5 rounded-full bg-primary/20 text-primary text-xs font-bold flex items-center justify-center">
                3
              </span>
              <span className="text-sm font-bold text-text-primary">
                {t('buddyMgmt.setupConfigServer')}
              </span>
            </div>
            <div className="ml-7">
              <CopyBlock
                content={`openclaw config set channels.shadowob.serverUrl "${serverUrl}"`}
                t={t}
              />
            </div>
          </div>

          {/* Step 4: Run */}
          <div className="mb-3">
            <div className="flex items-center gap-2 mb-1.5">
              <span className="w-5 h-5 rounded-full bg-primary/20 text-primary text-xs font-bold flex items-center justify-center">
                4
              </span>
              <span className="text-sm font-bold text-text-primary">
                {t('buddyMgmt.openclawRunTitle')}
              </span>
            </div>
            <div className="ml-7">
              <CopyBlock content="openclaw gateway restart" t={t} />
            </div>
          </div>
        </>
      ) : (
        <>
          {/* AI chat prompt */}
          <p className="text-xs text-text-muted mb-3">{t('buddyMgmt.setupChatDesc')}</p>
          <CopyBlock content={aiPrompt} t={t} />
        </>
      )}

      {/* Capabilities */}
      <div className="mt-4 pt-4 border-t border-border-subtle">
        <p className="text-xs font-bold text-text-muted uppercase tracking-wider mb-2">
          {t('docs.openclawCapabilities')}
        </p>
        <div className="grid grid-cols-2 gap-2">
          {['messaging', 'threads', 'reactions', 'media', 'mentions', 'editDelete'].map((cap) => (
            <div key={cap} className="flex items-center gap-1.5 text-xs text-text-secondary">
              <span className="text-green-400">✓</span>
              {t(`docs.openclawCap_${cap}`)}
            </div>
          ))}
        </div>
      </div>

      {/* Link to full docs */}
      <div className="mt-4 pt-3 border-t border-border-subtle">
        <a
          href="/product/index.html"
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-primary hover:text-primary-hover font-bold flex items-center gap-1 transition"
        >
          <BookOpen size={12} />
          {t('buddyMgmt.openclawFullDocs')}
        </a>
      </div>
    </div>
  )
}

/* ── Empty State ──────────────────────────────────────── */

function EmptyState({
  buddies,
  isLoading,
  onCreateClick,
  t,
}: {
  buddies: Buddy[]
  isLoading: boolean
  onCreateClick: () => void
  t: (key: string) => string
}) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-text-muted">{t('common.loading')}</div>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center justify-center h-64 text-center">
      <img src="/Logo.svg" alt="Buddy" className="w-12 h-12 mb-4 opacity-50" />
      <h2 className="text-xl font-bold text-text-primary mb-2">
        {buddies.length === 0 ? t('buddyMgmt.noBuddies') : t('buddyMgmt.title')}
      </h2>
      <p className="text-text-muted mb-6 max-w-md">
        {buddies.length === 0 ? t('buddyMgmt.noBuddiesDesc') : t('buddyMgmt.subtitle')}
      </p>
      {buddies.length === 0 && (
        <button
          onClick={onCreateClick}
          className="flex items-center gap-2 px-6 py-3 bg-primary hover:bg-primary-hover text-white rounded-xl font-bold transition"
        >
          <Plus size={18} />
          {t('buddyMgmt.newBuddy')}
        </button>
      )}
    </div>
  )
}

/* ── Create Buddy Dialog ──────────────────────────────── */

function CreateBuddyDialog({
  onClose,
  onSuccess,
  onError,
  t,
}: {
  onClose: () => void
  onSuccess: (buddy: Buddy) => void
  onError: (message?: string) => void
  t: (key: string) => string
}) {
  const [name, setName] = useState('')
  const [username, setUsername] = useState('')
  const [description, setDescription] = useState('')
  const [selectedAvatar, setSelectedAvatar] = useState<string | null>(null)

  const createMutation = useMutation({
    mutationFn: (data: {
      name: string
      username: string
      description?: string
      avatarUrl?: string
    }) =>
      fetchApi<Buddy>('/api/buddies', {
        method: 'POST',
        body: JSON.stringify({
          name: data.name,
          username: data.username,
          description: data.description,
          avatarUrl: data.avatarUrl,
          kernelType: 'openclaw',
          config: {},
        }),
      }),
    onSuccess: (buddy) => onSuccess(buddy),
    onError: (err: Error) => {
      if (err.message?.toLowerCase().includes('username already taken')) {
        const suffix = Math.random().toString(36).slice(2, 6)
        setUsername((prev) => `${prev.slice(0, 27)}_${suffix}`)
        onError(t('buddyMgmt.usernameTaken'))
      } else {
        onError(err.message || t('buddyMgmt.createFailed'))
      }
    },
  })

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
      <div className="bg-bg-secondary rounded-xl p-6 w-full max-w-[480px] mx-4 max-h-[80vh] overflow-y-auto border border-border-subtle">
        <h2 className="text-xl font-bold text-text-primary mb-6">{t('buddyMgmt.createTitle')}</h2>

        {/* Name */}
        <div className="mb-4">
          <label className="block text-xs font-bold uppercase text-text-secondary mb-2">
            {t('buddyMgmt.nameLabel')}
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t('buddyMgmt.namePlaceholder')}
            className="w-full bg-bg-tertiary text-text-primary rounded-lg px-4 py-3 outline-none focus:ring-2 focus:ring-primary transition"
            maxLength={64}
          />
        </div>

        {/* Username */}
        <div className="mb-4">
          <label className="block text-xs font-bold uppercase text-text-secondary mb-2">
            {t('buddyMgmt.usernameLabel')}
          </label>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value.replace(/[^a-zA-Z0-9_-]/g, ''))}
            placeholder={t('buddyMgmt.usernamePlaceholder')}
            className="w-full bg-bg-tertiary text-text-primary rounded-lg px-4 py-3 outline-none focus:ring-2 focus:ring-primary transition"
            maxLength={32}
          />
        </div>

        {/* Description */}
        <div className="mb-4">
          <label className="block text-xs font-bold uppercase text-text-secondary mb-2">
            {t('buddyMgmt.descLabel')}
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder={t('buddyMgmt.descPlaceholder')}
            className="w-full bg-bg-tertiary text-text-primary rounded-lg px-4 py-3 outline-none focus:ring-2 focus:ring-primary transition resize-none"
            rows={3}
            maxLength={500}
          />
        </div>

        {/* Avatar picker */}
        <div className="mb-6">
          <label className="block text-xs font-bold uppercase text-text-secondary mb-3">
            {t('buddyMgmt.avatarLabel')}
          </label>
          <AvatarEditor value={selectedAvatar ?? undefined} onChange={setSelectedAvatar} />
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-text-secondary hover:text-text-primary transition rounded-lg"
          >
            {t('common.cancel')}
          </button>
          <button
            onClick={() =>
              name.trim() &&
              username.trim() &&
              createMutation.mutate({
                name: name.trim(),
                username: username.trim(),
                description: description.trim() || undefined,
                avatarUrl: selectedAvatar ?? undefined,
              })
            }
            disabled={!name.trim() || !username.trim() || createMutation.isPending}
            className="flex items-center gap-2 px-6 py-2 bg-primary hover:bg-primary-hover text-white font-bold rounded-lg transition disabled:opacity-50"
          >
            <img src="/Logo.svg" alt="Buddy" className="w-4 h-4" />
            {createMutation.isPending ? t('buddyMgmt.creating') : t('common.create')}
          </button>
        </div>
      </div>
    </div>
  )
}

/* ── Edit Buddy Dialog ────────────────────────────────── */

function EditBuddyDialog({
  buddy,
  onClose,
  onSuccess,
  onError,
  t,
}: {
  buddy: Buddy
  onClose: () => void
  onSuccess: (buddy: Buddy) => void
  onError: () => void
  t: (key: string) => string
}) {
  const [name, setName] = useState(
    buddy.buddyUser?.displayName ?? buddy.buddyUser?.username ?? 'Buddy',
  )
  const [description, setDescription] = useState((buddy.config?.description as string) ?? '')
  const [selectedAvatar, setSelectedAvatar] = useState<string | null>(
    buddy.buddyUser?.avatarUrl ?? null,
  )

  const updateMutation = useMutation({
    mutationFn: (data: { name: string; description?: string; avatarUrl?: string | null }) =>
      fetchApi<Buddy>(`/api/buddies/${buddy.id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),
    onSuccess: (buddy) => onSuccess(buddy),
    onError: () => onError(),
  })

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
      <div className="bg-bg-secondary rounded-xl p-6 w-full max-w-[480px] mx-4 max-h-[80vh] overflow-y-auto border border-border-subtle">
        <h2 className="text-xl font-bold text-text-primary mb-6">{t('buddyMgmt.editTitle')}</h2>

        <div className="mb-4">
          <label className="block text-xs font-bold uppercase text-text-secondary mb-2">
            {t('buddyMgmt.nameLabel')}
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t('buddyMgmt.namePlaceholder')}
            className="w-full bg-bg-tertiary text-text-primary rounded-lg px-4 py-3 outline-none focus:ring-2 focus:ring-primary transition"
            maxLength={64}
          />
        </div>

        <div className="mb-4">
          <label className="block text-xs font-bold uppercase text-text-secondary mb-2">
            {t('buddyMgmt.descLabel')}
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder={t('buddyMgmt.descPlaceholder')}
            className="w-full bg-bg-tertiary text-text-primary rounded-lg px-4 py-3 outline-none focus:ring-2 focus:ring-primary transition resize-none"
            rows={3}
            maxLength={500}
          />
        </div>

        <div className="mb-6">
          <label className="block text-xs font-bold uppercase text-text-secondary mb-3">
            {t('buddyMgmt.avatarLabel')}
          </label>
          <AvatarEditor value={selectedAvatar ?? undefined} onChange={setSelectedAvatar} />
        </div>

        <div className="flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-text-secondary hover:text-text-primary transition rounded-lg"
          >
            {t('common.cancel')}
          </button>
          <button
            onClick={() =>
              name.trim() &&
              updateMutation.mutate({
                name: name.trim(),
                description: description.trim() || undefined,
                avatarUrl: selectedAvatar,
              })
            }
            disabled={!name.trim() || updateMutation.isPending}
            className="flex items-center gap-2 px-6 py-2 bg-primary hover:bg-primary-hover text-white font-bold rounded-lg transition disabled:opacity-50"
          >
            {updateMutation.isPending ? t('common.saving') : t('common.save')}
          </button>
        </div>
      </div>
    </div>
  )
}

/* ── Embeddable Buddy Management Content (for Settings page) ── */

export function BuddyManagementContent() {
  const { t } = useTranslation()
  const queryClient = useQueryClient()

  const [showCreate, setShowCreate] = useState(false)
  const [showEdit, setShowEdit] = useState(false)
  const [selectedBuddy, setSelectedBuddy] = useState<Buddy | null>(null)
  const [generatedToken, setGeneratedToken] = useState<string | null>(null)
  const [tokenCopied, setTokenCopied] = useState(false)
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)
  const [message, setMessage] = useState<{ text: string; success: boolean } | null>(null)

  // Listen for 'create-buddy' pending action from task center
  const pendingAction = useUIStore((s) => s.pendingAction)
  const setPendingAction = useUIStore((s) => s.setPendingAction)
  useEffect(() => {
    if (pendingAction === 'create-buddy') {
      setShowCreate(true)
      setPendingAction(null)
    }
  }, [pendingAction, setPendingAction])

  const { data: buddies = [], isLoading } = useQuery({
    queryKey: ['buddies'],
    queryFn: () => fetchApi<Buddy[]>('/api/buddies'),
    refetchInterval: 30000,
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => fetchApi(`/api/buddies/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['buddies'] })
      setDeleteConfirmId(null)
      if (selectedBuddy?.id === deleteConfirmId) setSelectedBuddy(null)
      showMsg(t('buddyMgmt.deleteSuccess'), true)
    },
    onError: () => showMsg(t('buddyMgmt.deleteFailed'), false),
  })

  const tokenMutation = useMutation({
    mutationFn: (id: string) =>
      fetchApi<TokenResponse>(`/api/buddies/${id}/token`, { method: 'POST' }),
    onSuccess: (data) => {
      setGeneratedToken(data.token)
      setTokenCopied(false)
      queryClient.invalidateQueries({ queryKey: ['buddies'] })
    },
  })

  const toggleMutation = useMutation({
    mutationFn: (buddy: Buddy) =>
      fetchApi<Buddy>(`/api/buddies/${buddy.id}/${buddy.status === 'running' ? 'stop' : 'start'}`, {
        method: 'POST',
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['buddies'] })
      if (selectedBuddy) {
        fetchApi<Buddy>(`/api/buddies/${selectedBuddy.id}`).then((a) => setSelectedBuddy(a))
      }
    },
  })

  const showMsg = (text: string, success: boolean) => {
    setMessage({ text, success })
    setTimeout(() => setMessage(null), 3000)
  }

  const copyToken = async (token: string) => {
    await navigator.clipboard.writeText(token)
    setTokenCopied(true)
    showMsg(t('buddyMgmt.tokenCopied'), true)
  }

  const statusColor = (status: string) => {
    switch (status) {
      case 'running':
        return 'text-green-400'
      case 'stopped':
        return 'text-zinc-400'
      case 'error':
        return 'text-red-400'
      default:
        return 'text-zinc-400'
    }
  }

  const statusLabel = (status: string) => {
    switch (status) {
      case 'running':
        return t('buddyMgmt.statusRunning')
      case 'stopped':
        return t('buddyMgmt.statusStopped')
      case 'error':
        return t('buddyMgmt.statusError')
      default:
        return status
    }
  }

  return (
    <>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-text-primary">{t('buddyMgmt.title')}</h2>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary-hover text-white rounded-lg transition font-bold text-sm"
        >
          <Plus size={16} />
          {t('buddyMgmt.newBuddy')}
        </button>
      </div>

      {/* Message */}
      {message && (
        <div
          className={`mb-4 px-4 py-2 rounded-lg text-sm ${
            message.success ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'
          }`}
        >
          {message.text}
        </div>
      )}

      {/* Buddy list */}
      {isLoading ? (
        <div className="text-center text-text-muted py-8">{t('common.loading')}</div>
      ) : buddies.length === 0 ? (
        <div className="text-center text-text-muted py-12 bg-bg-secondary rounded-xl border border-border-subtle">
          <img src="/Logo.svg" alt="Buddy" className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p className="text-sm">{t('buddyMgmt.noBuddiesDesc')}</p>
        </div>
      ) : (
        <div className="space-y-2 mb-6">
          {buddies.map((buddy) => {
            const name = buddy.buddyUser?.displayName ?? buddy.buddyUser?.username ?? 'Buddy'
            const isSelected = selectedBuddy?.id === buddy.id
            return (
              <button
                key={buddy.id}
                onClick={() => {
                  setSelectedBuddy(isSelected ? null : buddy)
                  setGeneratedToken(null)
                }}
                className={`flex items-center gap-3 w-full px-4 py-3 rounded-xl text-left transition border ${
                  isSelected
                    ? 'bg-bg-modifier-active border-primary/30 text-text-primary'
                    : 'bg-bg-secondary border-border-subtle text-text-secondary hover:bg-bg-modifier-hover hover:text-text-primary'
                }`}
              >
                <UserAvatar
                  userId={buddy.buddyUser?.id ?? buddy.userId}
                  avatarUrl={buddy.buddyUser?.avatarUrl}
                  displayName={buddy.buddyUser?.displayName ?? undefined}
                  size="sm"
                />
                <span className="truncate flex-1">{name}</span>
                {(buddy.totalOnlineSeconds ?? 0) > 0 && (
                  <span className="text-[10px] text-text-muted shrink-0">
                    {formatOnlineDuration(
                      buddy.totalOnlineSeconds,
                      t as (key: string, defaultValue?: string) => string,
                    )}
                  </span>
                )}
                <BuddyListingBadge buddy={buddy} />
                <span
                  className={`w-2 h-2 rounded-full shrink-0 ${getBuddyOnlineDotClass(buddy)}`}
                />
              </button>
            )
          })}
        </div>
      )}

      {/* Selected buddy detail */}
      {selectedBuddy && (
        <BuddyDetail
          buddy={selectedBuddy}
          generatedToken={generatedToken}
          tokenCopied={tokenCopied}
          tokenMutation={tokenMutation}
          statusColor={statusColor}
          statusLabel={statusLabel}
          onCopyToken={copyToken}
          onDelete={() => setDeleteConfirmId(selectedBuddy.id)}
          onEdit={() => setShowEdit(true)}
          onToggle={(buddy) => toggleMutation.mutate(buddy)}
          togglePending={toggleMutation.isPending}
          t={t}
        />
      )}

      {/* Create dialog */}
      {showCreate && (
        <CreateBuddyDialog
          onClose={() => setShowCreate(false)}
          onSuccess={(buddy) => {
            queryClient.invalidateQueries({ queryKey: ['buddies'] })
            setShowCreate(false)
            setSelectedBuddy(buddy)
            showMsg(t('buddyMgmt.createSuccess'), true)
          }}
          onError={() => showMsg(t('buddyMgmt.createFailed'), false)}
          t={t}
        />
      )}

      {/* Edit dialog */}
      {showEdit && selectedBuddy && (
        <EditBuddyDialog
          buddy={selectedBuddy}
          onClose={() => setShowEdit(false)}
          onSuccess={(buddy) => {
            queryClient.invalidateQueries({ queryKey: ['buddies'] })
            setShowEdit(false)
            setSelectedBuddy(buddy)
            showMsg(t('buddyMgmt.editSuccess'), true)
          }}
          onError={() => showMsg(t('buddyMgmt.editFailed'), false)}
          t={t}
        />
      )}

      {/* Delete confirmation */}
      {deleteConfirmId && (
        <div
          className="fixed inset-0 bg-black/60 flex items-center justify-center z-50"
          onClick={() => setDeleteConfirmId(null)}
        >
          <div
            className="bg-bg-secondary rounded-xl p-6 w-full max-w-96 mx-4 border border-border-subtle"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-xl font-bold text-text-primary mb-2">{t('common.confirm')}</h2>
            <p className="text-text-muted text-sm mb-6">{t('buddyMgmt.deleteConfirm')}</p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setDeleteConfirmId(null)}
                className="px-4 py-2 text-text-secondary hover:text-text-primary transition rounded-lg"
              >
                {t('common.cancel')}
              </button>
              <button
                onClick={() => deleteMutation.mutate(deleteConfirmId)}
                disabled={deleteMutation.isPending}
                className="px-4 py-2 bg-danger text-white rounded-lg hover:bg-red-600 transition font-bold disabled:opacity-50"
              >
                {t('common.delete')}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
