/* ─────────────────────────────────────────────────────────────────────────────
 *  Shadow OS — Widget Canvas  (main orchestrator)
 *
 *  The top-level component that replaces the old WidgetDashboard.
 *  Renders the Infinite Canvas with all placed widget instances, plus the
 *  toolbar for editing, adding widgets, and toggling canvas/classic views.
 * ───────────────────────────────────────────────────────────────────────────── */

import { Button, cn } from '@shadowob/ui'
import { useNavigate } from '@tanstack/react-router'
import {
  FileText,
  Grid3x3,
  Hash,
  Layers,
  MessageSquare,
  PawPrint,
  Pencil,
  Plus,
  ShoppingBag,
  Sparkles,
  TrendingUp,
} from 'lucide-react'
import { useCallback, useEffect, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { BUILTIN_WIDGETS, useWidgetEngine, type WidgetInstance } from '../../../lib/widget-engine'
import { InfiniteCanvas } from './InfiniteCanvas'
import { WidgetIframe } from './WidgetIframe'
import { WidgetPicker } from './WidgetPicker'
import { WidgetShell } from './WidgetShell'

// biome-ignore lint/suspicious/noExplicitAny: TFunction from react-i18next has complex generics
type TranslateFn = (...args: any[]) => any

/* ── Types re-exported from server-home ── */

interface ServerDetail {
  id: string
  name: string
  slug: string
  description: string | null
  iconUrl: string | null
  bannerUrl: string | null
  homepageHtml: string | null
  isPublic: boolean
}

interface ChannelInfo {
  id: string
  name: string
  type: string
  lastMessageAt?: string | null
}

interface BuddyMember {
  userId: string
  user?: {
    id: string
    username: string
    displayName: string | null
    avatarUrl: string | null
    isBot: boolean
    status: string
  }
}

/* ── Props ── */

interface WidgetCanvasProps {
  server: ServerDetail
  channels: ChannelInfo[]
  buddyMembers: BuddyMember[]
  copied: boolean
  onCopyLink: () => void
}

/* ── Built-in React widget registry (maps manifest id → React element) ── */

function useBuiltinWidgetRenderer(
  server: ServerDetail,
  channels: ChannelInfo[],
  buddyMembers: BuddyMember[],
  copied: boolean,
  onCopyLink: () => void,
) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const serverSlug = server.slug || server.id

  return useCallback(
    (widgetId: string): React.ReactNode | null => {
      switch (widgetId) {
        case 'builtin:hero-banner':
          return <HeroBannerContent server={server} copied={copied} onCopyLink={onCopyLink} t={t} />
        case 'builtin:activity-feed':
          return (
            <ActivityFeedContent
              channels={channels}
              buddyMembers={buddyMembers}
              serverSlug={serverSlug}
              navigate={navigate}
              t={t}
            />
          )
        case 'builtin:buddy-roster':
          return <BuddyRosterContent buddyMembers={buddyMembers} t={t} />
        case 'builtin:quick-actions':
          return <QuickActionsContent serverSlug={serverSlug} navigate={navigate} t={t} />
        case 'builtin:channel-overview':
          return (
            <ChannelOverviewContent
              channels={channels}
              serverSlug={serverSlug}
              navigate={navigate}
              t={t}
            />
          )
        default:
          return null
      }
    },
    [server, channels, buddyMembers, copied, onCopyLink, serverSlug, navigate, t],
  )
}

/* ── Main Canvas ── */

export function WidgetCanvas({
  server,
  channels,
  buddyMembers,
  copied,
  onCopyLink,
}: WidgetCanvasProps) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const {
    layout,
    isEditing,
    setEditing,
    pickerOpen,
    setPickerOpen,
    addWidget,
    registerWidget,
    registry,
  } = useWidgetEngine()

  // Register built-in widgets on mount
  useEffect(() => {
    for (const manifest of BUILTIN_WIDGETS) {
      registerWidget(manifest)
    }
  }, [registerWidget])

  // Auto-populate default layout if empty
  useEffect(() => {
    if (layout.widgets.length > 0 || registry.length === 0) return
    const defaults: WidgetInstance[] = BUILTIN_WIDGETS.map((m, i) => ({
      instanceId: `default_${m.id}`,
      widgetId: m.id,
      rect: { ...m.defaultRect, z: i },
      appearance: {},
      config: {},
      grantedPermissions: [...m.permissions],
      visible: true,
    }))
    for (const d of defaults) addWidget(d)
  }, [layout.widgets.length, registry.length, addWidget])

  const renderWidget = useBuiltinWidgetRenderer(server, channels, buddyMembers, copied, onCopyLink)

  // Sort widgets by z for render order
  const sortedWidgets = useMemo(
    () => [...layout.widgets].sort((a, b) => a.rect.z - b.rect.z),
    [layout.widgets],
  )

  const getManifest = useCallback(
    (widgetId: string) => registry.find((m) => m.id === widgetId),
    [registry],
  )

  const handleAddWidget = useCallback(
    (instance: WidgetInstance) => {
      addWidget(instance)
      setPickerOpen(false)
    },
    [addWidget, setPickerOpen],
  )

  return (
    <div className="flex-1 relative overflow-hidden bg-bg-primary">
      {/* The Infinite Canvas */}
      <InfiniteCanvas>
        {sortedWidgets.map((instance) => {
          const manifest = getManifest(instance.widgetId)
          const builtinContent = renderWidget(instance.widgetId)

          return (
            <WidgetShell key={instance.instanceId} instance={instance} manifest={manifest}>
              {builtinContent ?? (
                <WidgetIframe
                  instance={instance}
                  onNavigate={(url) => {
                    try {
                      const parsed = new URL(url, window.location.origin)
                      if (parsed.origin === window.location.origin) {
                        void navigate({ to: parsed.pathname + parsed.search + parsed.hash })
                      } else {
                        window.open(url, '_blank', 'noopener,noreferrer')
                      }
                    } catch {
                      window.open(url, '_blank', 'noopener,noreferrer')
                    }
                  }}
                />
              )}
            </WidgetShell>
          )
        })}
      </InfiniteCanvas>

      {/* Canvas toolbar (top-right) */}
      <div className="absolute top-3 right-3 flex items-center gap-1 z-50">
        <Button
          variant={isEditing ? 'primary' : 'outline'}
          size="sm"
          onClick={() => setEditing(!isEditing)}
          className={cn(
            'rounded-full text-xs font-black gap-1.5',
            isEditing && 'bg-primary text-white',
          )}
        >
          <Pencil size={12} />
          {isEditing ? t('widget.doneEditing', 'Done') : t('widget.editCanvas', 'Edit')}
        </Button>
        {isEditing && (
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPickerOpen(true)}
              className="rounded-full text-xs font-black gap-1.5"
            >
              <Plus size={12} />
              {t('widget.addWidget', 'Add')}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const snap = useWidgetEngine.getState().layout.gridSnap
                useWidgetEngine.setState((s) => ({
                  layout: { ...s.layout, gridSnap: snap > 0 ? 0 : 20 },
                }))
              }}
              className="rounded-full text-xs font-black gap-1.5"
            >
              <Grid3x3 size={12} />
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="rounded-full text-xs font-black gap-1.5"
              title={t('widget.layers', 'Layers')}
            >
              <Layers size={12} />
            </Button>
          </>
        )}
      </div>

      {/* Widget Picker panel */}
      {pickerOpen && <WidgetPicker onClose={() => setPickerOpen(false)} onAdd={handleAddWidget} />}
    </div>
  )
}

/* ════════════════════════════════════════════════════════════════════════════
 *  Built-in Widget Content Components
 *  (Pure presentation — no shell/container, rendered inside WidgetShell)
 * ════════════════════════════════════════════════════════════════════════════ */

function HeroBannerContent({
  server,
  copied,
  onCopyLink,
  t,
}: {
  server: ServerDetail
  copied: boolean
  onCopyLink: () => void
  t: TranslateFn
}) {
  const initial = server.name.charAt(0).toUpperCase()

  return (
    <div className="relative flex items-center gap-4">
      {/* Decorative orbs */}
      <div className="absolute -top-20 -right-20 w-48 h-48 rounded-full bg-primary/10 blur-[80px] pointer-events-none" />
      <div className="absolute -bottom-16 -left-16 w-40 h-40 rounded-full bg-accent/10 blur-[60px] pointer-events-none" />
      {server.iconUrl ? (
        <img
          src={server.iconUrl}
          alt=""
          className="w-16 h-16 rounded-2xl object-cover ring-2 ring-white/10 shadow-lg"
        />
      ) : (
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-primary-strong flex items-center justify-center text-bg-deep font-black text-2xl ring-2 ring-white/10 shadow-lg">
          {initial}
        </div>
      )}
      <div className="flex-1 min-w-0">
        <h1 className="text-xl font-black text-text-primary truncate">{server.name}</h1>
        {server.description && (
          <p className="text-sm text-text-secondary mt-1 line-clamp-2">{server.description}</p>
        )}
        <div className="flex items-center gap-3 mt-2">
          {server.isPublic && (
            <span className="text-[10px] font-black uppercase tracking-widest text-primary bg-primary/10 px-2 py-0.5 rounded-full">
              {t('serverHome.publicBadge', 'PUBLIC')}
            </span>
          )}
          <button
            type="button"
            onClick={onCopyLink}
            className="text-[10px] font-bold text-text-muted hover:text-primary transition flex items-center gap-1"
          >
            {copied ? (
              <span className="text-success">✓</span>
            ) : (
              <span className="opacity-50">🔗</span>
            )}
            {t('serverHome.copyLink', '复制链接')}
          </button>
        </div>
      </div>
    </div>
  )
}

function ActivityFeedContent({
  channels,
  buddyMembers,
  serverSlug,
  navigate,
  t,
}: {
  channels: ChannelInfo[]
  buddyMembers: BuddyMember[]
  serverSlug: string
  navigate: ReturnType<typeof useNavigate>
  t: TranslateFn
}) {
  const recentChannels = [...channels]
    .filter((ch) => ch.lastMessageAt)
    .sort((a, b) => (b.lastMessageAt ?? '').localeCompare(a.lastMessageAt ?? ''))
    .slice(0, 5)
  const activeBuddies = buddyMembers.filter((m) => m.user?.status === 'online')

  return (
    <>
      <div className="flex items-center gap-2 mb-4">
        <div className="w-8 h-8 rounded-xl bg-primary/15 flex items-center justify-center">
          <TrendingUp size={16} className="text-primary" />
        </div>
        <h3 className="font-black text-text-primary text-sm">
          {t('serverHome.widgetActivity', '最新动态')}
        </h3>
      </div>
      <div className="space-y-2">
        {activeBuddies.length > 0 && (
          <div className="flex items-center gap-2 px-3 py-2 rounded-2xl bg-accent/5 border border-accent/10">
            <PawPrint size={14} className="text-accent shrink-0" />
            <span className="text-xs text-text-secondary truncate">
              <span className="font-bold text-accent">
                {activeBuddies[0]?.user?.displayName ?? activeBuddies[0]?.user?.username}
              </span>{' '}
              {activeBuddies.length > 1
                ? t('serverHome.buddiesOnline', {
                    count: activeBuddies.length,
                    defaultValue: `等 ${activeBuddies.length} 个 Buddy 在线`,
                  })
                : t('serverHome.buddyOnline', '正在活跃中...')}
            </span>
          </div>
        )}
        {recentChannels.map((ch) => (
          <button
            type="button"
            key={ch.id}
            onClick={() =>
              navigate({
                to: '/servers/$serverSlug/channels/$channelId',
                params: { serverSlug, channelId: ch.id },
              })
            }
            className="flex items-center gap-2 px-3 py-2 rounded-2xl hover:bg-bg-modifier-hover transition-all w-full text-left group"
          >
            <Hash
              size={14}
              className="text-text-muted shrink-0 group-hover:text-primary transition-colors"
            />
            <span className="text-xs text-text-secondary group-hover:text-text-primary truncate font-bold">
              {ch.name}
            </span>
            <span className="text-[10px] text-text-muted ml-auto shrink-0">
              {ch.lastMessageAt
                ? new Date(ch.lastMessageAt).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  })
                : ''}
            </span>
          </button>
        ))}
        {recentChannels.length === 0 && (
          <p className="text-xs text-text-muted py-2 px-3">
            {t('serverHome.noActivity', '暂无动态')}
          </p>
        )}
      </div>
    </>
  )
}

function BuddyRosterContent({ buddyMembers, t }: { buddyMembers: BuddyMember[]; t: TranslateFn }) {
  const activeBuddies = buddyMembers.filter((m) => m.user?.isBot)

  return (
    <>
      <div className="flex items-center gap-2 mb-4">
        <div className="w-8 h-8 rounded-xl bg-accent/15 flex items-center justify-center">
          <PawPrint size={16} className="text-accent" />
        </div>
        <h3 className="font-black text-text-primary text-sm">
          {t('serverHome.widgetBuddies', '🐾 常驻 Buddy')}
        </h3>
        <span className="text-[10px] font-bold text-text-muted ml-auto bg-bg-tertiary px-2 py-0.5 rounded-full">
          {activeBuddies.length}
        </span>
      </div>
      {activeBuddies.length > 0 ? (
        <div className="space-y-2">
          {activeBuddies.slice(0, 4).map((m) => (
            <div
              key={m.userId}
              className="flex items-center gap-2.5 px-2 py-1.5 rounded-2xl hover:bg-bg-modifier-hover transition-all"
            >
              <div className="relative">
                {m.user?.avatarUrl ? (
                  <img
                    src={m.user.avatarUrl}
                    alt=""
                    className="w-8 h-8 rounded-full object-cover ring-2 ring-accent/20"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-accent/15 flex items-center justify-center ring-2 ring-accent/20">
                    <PawPrint size={14} className="text-accent" />
                  </div>
                )}
                <div
                  className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-bg-primary ${m.user?.status === 'online' ? 'bg-success' : 'bg-text-muted'}`}
                />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-xs font-bold text-text-primary truncate">
                  {m.user?.displayName ?? m.user?.username}
                </div>
                <div className="text-[10px] text-text-muted">
                  {m.user?.status === 'online'
                    ? t('serverHome.buddyActive', '活跃中')
                    : t('serverHome.buddyIdle', '休息中')}
                </div>
              </div>
            </div>
          ))}
          {activeBuddies.length > 4 && (
            <p className="text-[10px] text-text-muted text-center">
              +{activeBuddies.length - 4} {t('serverHome.moreBuddies', '更多 Buddy')}
            </p>
          )}
        </div>
      ) : (
        <div className="text-center py-4">
          <PawPrint size={28} className="text-text-muted/30 mx-auto mb-2" />
          <p className="text-xs text-text-muted">
            {t('serverHome.noBuddies', '还没有 Buddy 入驻')}
          </p>
        </div>
      )}
    </>
  )
}

function QuickActionsContent({
  serverSlug,
  navigate,
  t,
}: {
  serverSlug: string
  navigate: ReturnType<typeof useNavigate>
  t: TranslateFn
}) {
  const actions = [
    {
      icon: MessageSquare,
      label: t('serverHome.actionChat', '开始聊天'),
      color: 'primary' as const,
      onClick: () => navigate({ to: '/servers/$serverSlug', params: { serverSlug } }),
    },
    {
      icon: ShoppingBag,
      label: t('serverHome.actionStore', '逛逛商店'),
      color: 'accent' as const,
      onClick: () => navigate({ to: '/servers/$serverSlug/shop', params: { serverSlug } }),
    },
    {
      icon: FileText,
      label: t('serverHome.actionWork', '工作区'),
      color: 'primary' as const,
      onClick: () => navigate({ to: '/servers/$serverSlug/workspace', params: { serverSlug } }),
    },
  ]

  return (
    <>
      <div className="flex items-center gap-2 mb-4">
        <div className="w-8 h-8 rounded-xl bg-primary/15 flex items-center justify-center">
          <Sparkles size={16} className="text-primary" />
        </div>
        <h3 className="font-black text-text-primary text-sm">
          {t('serverHome.widgetQuickActions', '快捷操作')}
        </h3>
      </div>
      <div className="space-y-2">
        {actions.map((action) => (
          <button
            type="button"
            key={action.label}
            onClick={action.onClick}
            className={`flex items-center gap-3 w-full px-3 py-2.5 rounded-2xl text-xs font-bold transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] ${
              action.color === 'accent'
                ? 'bg-accent/10 text-accent hover:bg-accent/15'
                : 'bg-primary/10 text-primary hover:bg-primary/15'
            }`}
          >
            <action.icon size={16} />
            {action.label}
          </button>
        ))}
      </div>
    </>
  )
}

function ChannelOverviewContent({
  channels,
  serverSlug,
  navigate,
  t,
}: {
  channels: ChannelInfo[]
  serverSlug: string
  navigate: ReturnType<typeof useNavigate>
  t: TranslateFn
}) {
  const textCount = channels.filter((ch) => ch.type === 'text').length
  const voiceCount = channels.filter((ch) => ch.type === 'voice').length
  const announceCount = channels.filter((ch) => ch.type === 'announcement').length

  return (
    <div
      onClick={() => {
        const first = channels[0]
        if (first)
          navigate({
            to: '/servers/$serverSlug/channels/$channelId',
            params: { serverSlug, channelId: first.id },
          })
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          const first = channels[0]
          if (first)
            navigate({
              to: '/servers/$serverSlug/channels/$channelId',
              params: { serverSlug, channelId: first.id },
            })
        }
      }}
      role="button"
      tabIndex={0}
      className="cursor-pointer"
    >
      <div className="flex items-center gap-2 mb-4">
        <div className="w-8 h-8 rounded-xl bg-primary/15 flex items-center justify-center">
          <Hash size={16} className="text-primary" />
        </div>
        <h3 className="font-black text-text-primary text-sm">
          {t('serverHome.widgetChannels', '频道概览')}
        </h3>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div className="text-center">
          <div className="text-2xl font-black text-primary">{textCount}</div>
          <div className="text-[10px] font-bold text-text-muted uppercase tracking-wider">
            {t('serverHome.textChannels', '文字')}
          </div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-black text-accent">{voiceCount}</div>
          <div className="text-[10px] font-bold text-text-muted uppercase tracking-wider">
            {t('serverHome.voiceChannels', '语音')}
          </div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-black text-info">{announceCount}</div>
          <div className="text-[10px] font-bold text-text-muted uppercase tracking-wider">
            {t('serverHome.announceChannels', '公告')}
          </div>
        </div>
      </div>
    </div>
  )
}
