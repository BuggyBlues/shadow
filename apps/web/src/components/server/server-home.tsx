import { useQuery } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import {
  Check,
  Copy,
  ExternalLink,
  FileText,
  Hash,
  Megaphone,
  MessageSquare,
  PawPrint,
  ShoppingBag,
  Sparkles,
  TrendingUp,
} from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { fetchApi } from '../../lib/api'
import { copyToClipboardSilent } from '../../lib/clipboard'
import { useChatStore } from '../../stores/chat.store'
import { useUIStore } from '../../stores/ui.store'

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

/** Generate a polished default homepage HTML matching the main site's light glass-morphism style. */
function generateDefaultHtml(server: ServerDetail, t: (key: string) => string): string {
  const initial = server.name.charAt(0).toUpperCase()
  const bannerCss = server.bannerUrl
    ? `background-image: url('${server.bannerUrl}'); background-size: cover; background-position: center;`
    : ''

  const iconHtml = server.iconUrl
    ? `<img src="${server.iconUrl}" alt="" class="server-icon icon-img" />`
    : `<div class="server-icon icon-placeholder">${initial}</div>`

  const desc = server.description || t('serverHome.defaultDesc')

  const features = [
    {
      icon: '💬',
      title: t('serverHome.chatTitle'),
      desc: t('serverHome.chatDesc'),
      color: '#06b6d4',
    },
    { icon: '🐾', title: t('serverHome.aiTitle'), desc: t('serverHome.aiDesc'), color: '#f59e0b' },
    {
      icon: '📢',
      title: t('serverHome.announceTitle'),
      desc: t('serverHome.announceDesc'),
      color: '#8b5cf6',
    },
    {
      icon: '🎨',
      title: t('serverHome.customizeTitle'),
      desc: t('serverHome.customizeDesc'),
      color: '#ec4899',
    },
  ]

  const featureCards = features
    .map(
      (f) => `
    <div class="feature-card" style="--accent: ${f.color};">
      <div class="feature-icon">${f.icon}</div>
      <h3>${f.title}</h3>
      <p>${f.desc}</p>
    </div>
  `,
    )
    .join('')

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<style>
  @import url('https://fonts.googleapis.com/css2?family=Nunito:wght@400;700;800;900&display=swap');

  @keyframes fadeInUp { from { opacity:0; transform:translateY(24px); } to { opacity:1; transform:translateY(0); } }
  @keyframes floatAnim { 0%,100% { transform:translateY(0) rotate(0deg); } 50% { transform:translateY(-12px) rotate(2deg); } }
  @keyframes blobPulse { 0%,100% { transform: scale(1); opacity: 0.45; } 50% { transform: scale(1.1); opacity: 0.55; } }

  * { margin:0; padding:0; box-sizing:border-box; }
  body {
    font-family: 'Nunito', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    background-color: #f2f7fc;
    background-image: radial-gradient(#c2d2ea 2px, transparent 2px);
    background-size: 36px 36px;
    color: #2d3748;
    min-height: 100vh;
    overflow-x: hidden;
    position: relative;
  }

  /* Decorative blobs */
  .blob {
    position: absolute;
    border-radius: 50%;
    filter: blur(70px);
    z-index: 0;
    animation: blobPulse 8s ease-in-out infinite;
    pointer-events: none;
  }
  .blob-1 { width: 260px; height: 260px; background: #67e8f9; top: -40px; right: 10%; }
  .blob-2 { width: 200px; height: 200px; background: #fde68a; top: 180px; left: 5%; animation-delay: 2s; }
  .blob-3 { width: 180px; height: 180px; background: #c4b5fd; bottom: 60px; right: 20%; animation-delay: 4s; }

  /* Banner */
  .banner {
    height: 180px;
    ${bannerCss || 'background: linear-gradient(135deg, #e0f2fe 0%, #cffafe 40%, #fef3c7 100%);'}
    position: relative;
    overflow: hidden;
    border-bottom: 3px solid rgba(255,255,255,0.9);
  }
  .banner::after {
    content: '';
    position: absolute;
    inset: 0;
    background: linear-gradient(to bottom, transparent 50%, rgba(242,247,252,0.8) 100%);
  }

  .content {
    max-width: 640px;
    margin: 0 auto;
    padding: 0 24px 48px;
    position: relative;
    z-index: 1;
  }

  /* Server identity */
  .icon-row {
    display: flex;
    align-items: flex-end;
    gap: 16px;
    margin-top: -40px;
    position: relative;
    z-index: 2;
    margin-bottom: 20px;
    animation: fadeInUp 0.5s ease-out;
  }
  .server-icon {
    width: 84px;
    height: 84px;
    border-radius: 24px;
    border: 4px solid #fff;
    box-shadow: 0 8px 28px rgba(0,0,0,0.1);
    flex-shrink: 0;
  }
  .icon-img { object-fit: cover; }
  .icon-placeholder {
    background: linear-gradient(135deg, #06b6d4, #0891b2);
    display: flex; align-items: center; justify-content: center;
    color: #fff; font-size: 34px; font-weight: 900;
    text-shadow: 0 2px 4px rgba(0,0,0,0.15);
  }
  .info { padding-bottom: 4px; }
  .info h1 {
    font-size: 24px; font-weight: 900; color: #1a202c;
    letter-spacing: -0.3px;
  }
  .badge {
    display: inline-flex; align-items: center; gap: 4px;
    font-size: 11px; color: #0891b2; font-weight: 800;
    margin-top: 4px; text-transform: uppercase; letter-spacing: 0.5px;
  }
  .badge::before {
    content: ''; width: 6px; height: 6px; border-radius: 50%;
    background: #06b6d4; animation: floatAnim 2s ease-in-out infinite;
  }

  .desc {
    color: #4a5568;
    font-size: 15px;
    font-weight: 700;
    line-height: 1.7;
    background: rgba(255,255,255,0.6);
    padding: 12px 16px;
    border-radius: 16px;
    border-left: 4px solid #fbbf24;
    margin-bottom: 24px;
    animation: fadeInUp 0.5s ease-out 0.1s both;
  }

  /* Quick start card */
  .quick-start {
    background: rgba(255,255,255,0.7);
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
    border: 3px solid rgba(255,255,255,0.9);
    border-radius: 24px;
    padding: 24px 28px;
    margin-bottom: 24px;
    animation: fadeInUp 0.5s ease-out 0.2s both;
    box-shadow: 0 8px 32px rgba(0,0,0,0.06);
    transition: all 0.3s;
  }
  .quick-start:hover {
    box-shadow: 0 12px 40px rgba(0,0,0,0.1);
    border-color: #67e8f9;
    transform: translateY(-2px);
  }
  .quick-start h2 {
    font-size: 16px; font-weight: 900; color: #1a202c; margin-bottom: 6px;
    display: flex; align-items: center; gap: 8px;
  }
  .quick-start p { color: #718096; font-size: 14px; font-weight: 700; line-height: 1.6; }

  /* Feature grid */
  .features {
    display: grid; grid-template-columns: 1fr 1fr; gap: 14px;
    animation: fadeInUp 0.5s ease-out 0.3s both;
  }
  .feature-card {
    background: rgba(255,255,255,0.65);
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
    border: 3px solid rgba(255,255,255,0.9);
    border-radius: 24px;
    padding: 22px;
    cursor: pointer;
    position: relative;
    overflow: hidden;
    box-shadow: 0 6px 24px rgba(0,0,0,0.04);
    transition: all 0.3s cubic-bezier(0.25,0.8,0.25,1);
  }
  .feature-card::before {
    content: ''; position: absolute; top: 0; left: 0; right: 0; height: 3px;
    background: var(--accent); opacity: 0; transition: opacity 0.3s;
  }
  .feature-card:hover {
    transform: translateY(-4px);
    box-shadow: 0 16px 40px rgba(0,0,0,0.1);
    border-color: var(--accent);
  }
  .feature-card:hover::before { opacity: 1; }
  .feature-icon {
    font-size: 28px; margin-bottom: 10px;
    display: inline-block; animation: floatAnim 3s ease-in-out infinite;
  }
  .feature-card:nth-child(2) .feature-icon { animation-delay: 0.6s; }
  .feature-card:nth-child(3) .feature-icon { animation-delay: 1.2s; }
  .feature-card:nth-child(4) .feature-icon { animation-delay: 1.8s; }
  .feature-card h3 {
    font-size: 14px; font-weight: 900; color: #1a202c; margin-bottom: 5px;
  }
  .feature-card p {
    font-size: 12px; color: #718096; font-weight: 700; line-height: 1.5;
  }

  /* CTA button */
  .cta-row {
    text-align: center;
    margin-top: 28px;
    animation: fadeInUp 0.5s ease-out 0.4s both;
  }
  .cta-btn {
    display: inline-flex; align-items: center; gap: 8px;
    background: linear-gradient(135deg, #00f3ff, #00a2ff);
    color: #1a1a1c;
    font-size: 15px; font-weight: 900;
    padding: 12px 28px;
    border-radius: 9999px;
    border: 3px solid #1a1a1c;
    text-decoration: none;
    cursor: pointer;
    box-shadow: 0 6px 20px rgba(0,243,255,0.35);
    transition: all 0.2s;
  }
  .cta-btn:hover {
    transform: translateY(-3px) scale(1.05);
    box-shadow: 0 10px 28px rgba(0,243,255,0.5);
  }

  @media (max-width: 480px) {
    .banner { height: 120px; }
    .content { padding: 0 16px 32px; }
    .features { grid-template-columns: 1fr; }
    .server-icon { width: 68px; height: 68px; border-radius: 18px; font-size: 26px; }
    .info h1 { font-size: 20px; }
  }
</style>
</head>
<body>
  <!-- Decorative blobs -->
  <div class="blob blob-1"></div>
  <div class="blob blob-2"></div>
  <div class="blob blob-3"></div>

  <div class="banner"></div>
  <div class="content">
    <div class="icon-row">
      ${iconHtml}
      <div class="info">
        <h1>${server.name}</h1>
        ${server.isPublic ? `<div class="badge">${t('serverHome.publicBadge')}</div>` : ''}
      </div>
    </div>
    <div class="desc">${desc}</div>
    <div class="quick-start">
      <h2>👋 ${t('serverHome.quickStart')}</h2>
      <p>${t('serverHome.quickStartDesc')}</p>
    </div>
    <div class="features">
      ${featureCards}
    </div>
    <div class="cta-row">
      <button class="cta-btn" onclick="window.parent.postMessage({type:'server-home:explore-channels'},'*')">
        ${t('serverHome.exploreChannels')} →
      </button>
    </div>
  </div>
</body>
</html>`
}

interface ServerHomeProps {
  /** Override serverId instead of using chat store */
  serverId?: string
  /** Show enhanced toolbar with actions */
  standalone?: boolean
}

interface HomepageApp {
  id: string
  name: string
  sourceType: 'zip' | 'url'
  sourceUrl: string
  version: string | null
  iconUrl: string | null
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

/* -------------------------------------------------------------------------- */
/*  Widget Components                                                         */
/* -------------------------------------------------------------------------- */

function WidgetCard({
  children,
  className,
  glowColor,
  onClick,
}: {
  children: React.ReactNode
  className?: string
  glowColor?: string
  onClick?: () => void
}) {
  return (
    <div
      onClick={onClick}
      onKeyDown={
        onClick
          ? (e) => {
              if (e.key === 'Enter') onClick()
            }
          : undefined
      }
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      className={`relative bg-[var(--glass-bg)] backdrop-blur-2xl border border-[var(--glass-border)] border-t-white/10 rounded-[28px] p-5 shadow-[var(--shadow-soft)] transition-all duration-500 hover:translate-y-[-4px] hover:shadow-lg ${onClick ? 'cursor-pointer' : ''} ${className ?? ''}`}
      style={glowColor ? { boxShadow: `0 8px 32px ${glowColor}20` } : undefined}
    >
      {children}
    </div>
  )
}

/** Activity Feed Widget — shows latest Buddy actions and channel events */
function ActivityWidget({
  channels,
  serverSlug,
  buddyMembers,
}: {
  channels: ChannelInfo[]
  serverSlug: string
  buddyMembers: BuddyMember[]
}) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const recentChannels = [...channels]
    .filter((ch) => ch.lastMessageAt)
    .sort((a, b) => (b.lastMessageAt ?? '').localeCompare(a.lastMessageAt ?? ''))
    .slice(0, 5)

  const activeBuddies = buddyMembers.filter((m) => m.user?.status === 'online')

  return (
    <WidgetCard className="col-span-2 md:col-span-1">
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
    </WidgetCard>
  )
}

/** Buddy Roster Widget — shows active Buddy residents */
function BuddyWidget({ buddyMembers }: { buddyMembers: BuddyMember[] }) {
  const { t } = useTranslation()
  const activeBuddies = buddyMembers.filter((m) => m.user?.isBot)

  return (
    <WidgetCard glowColor="var(--color-accent)">
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
    </WidgetCard>
  )
}

/** Quick Actions Widget — shortcut buttons */
function QuickActionsWidget({ serverSlug }: { serverSlug: string }) {
  const { t } = useTranslation()
  const navigate = useNavigate()

  const actions = [
    {
      icon: MessageSquare,
      label: t('serverHome.actionChat', '开始聊天'),
      color: 'primary',
      onClick: () => navigate({ to: '/servers/$serverSlug', params: { serverSlug } }),
    },
    {
      icon: ShoppingBag,
      label: t('serverHome.actionStore', '逛逛商店'),
      color: 'accent',
      onClick: () => navigate({ to: '/servers/$serverSlug/shop', params: { serverSlug } }),
    },
    {
      icon: FileText,
      label: t('serverHome.actionWork', '工作区'),
      color: 'primary',
      onClick: () => navigate({ to: '/servers/$serverSlug/workspace', params: { serverSlug } }),
    },
  ]

  return (
    <WidgetCard>
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
    </WidgetCard>
  )
}

/** Channel Overview Widget — shows channel stats */
function ChannelOverviewWidget({
  channels,
  serverSlug,
}: {
  channels: ChannelInfo[]
  serverSlug: string
}) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const textCount = channels.filter((ch) => ch.type === 'text').length
  const voiceCount = channels.filter((ch) => ch.type === 'voice').length
  const announceCount = channels.filter((ch) => ch.type === 'announcement').length

  return (
    <WidgetCard
      glowColor="var(--color-primary)"
      onClick={() => {
        const firstChannel = channels[0]
        if (firstChannel) {
          navigate({
            to: '/servers/$serverSlug/channels/$channelId',
            params: { serverSlug, channelId: firstChannel.id },
          })
        }
      }}
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
    </WidgetCard>
  )
}

/** Server Info Hero Banner — shows server identity */
function ServerHeroBanner({
  server,
  onCopyLink,
  copied,
}: {
  server: ServerDetail
  onCopyLink: () => void
  copied: boolean
}) {
  const { t } = useTranslation()
  const initial = server.name.charAt(0).toUpperCase()

  return (
    <div className="col-span-2 relative overflow-hidden rounded-[32px] bg-gradient-to-br from-primary/10 via-bg-secondary to-accent/10 border border-[var(--glass-border)] p-6">
      {/* Decorative orbs */}
      <div className="absolute -top-20 -right-20 w-48 h-48 rounded-full bg-primary/10 blur-[80px] pointer-events-none" />
      <div className="absolute -bottom-16 -left-16 w-40 h-40 rounded-full bg-accent/10 blur-[60px] pointer-events-none" />
      <div className="relative flex items-center gap-4">
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
                {t('serverHome.publicBadge')}
              </span>
            )}
            <button
              type="button"
              onClick={onCopyLink}
              className="text-[10px] font-bold text-text-muted hover:text-primary transition flex items-center gap-1"
            >
              {copied ? <Check size={10} className="text-success" /> : <Copy size={10} />}
              {t('serverHome.copyLink', '复制链接')}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

/** Native React widget dashboard — renders when no custom HTML is set */
function WidgetDashboard({
  server,
  channels,
  buddyMembers,
  copied,
  onCopyLink,
}: {
  server: ServerDetail
  channels: ChannelInfo[]
  buddyMembers: BuddyMember[]
  copied: boolean
  onCopyLink: () => void
}) {
  const serverSlug = server.slug || server.id

  return (
    <div className="flex-1 overflow-auto scrollbar-hidden">
      <div className="max-w-[960px] mx-auto px-4 md:px-8 py-6 space-y-4">
        {/* Hero Banner */}
        <ServerHeroBanner server={server} onCopyLink={onCopyLink} copied={copied} />

        {/* Widget grid */}
        <div className="grid grid-cols-2 gap-4">
          <ActivityWidget channels={channels} serverSlug={serverSlug} buddyMembers={buddyMembers} />
          <BuddyWidget buddyMembers={buddyMembers} />
          <QuickActionsWidget serverSlug={serverSlug} />
          <ChannelOverviewWidget channels={channels} serverSlug={serverSlug} />
        </div>
      </div>
    </div>
  )
}

export function ServerHome({ serverId: propServerId, standalone }: ServerHomeProps = {}) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { activeServerId } = useChatStore()
  const effectiveServerId = propServerId || activeServerId
  const [copied, setCopied] = useState(false)

  const { data: server } = useQuery({
    queryKey: ['server', effectiveServerId],
    queryFn: () => fetchApi<ServerDetail>(`/api/servers/${effectiveServerId}`),
    enabled: !!effectiveServerId,
  })

  // Fetch channels for navigation
  const { data: channels = [] } = useQuery({
    queryKey: ['channels', effectiveServerId],
    queryFn: () => fetchApi<ChannelInfo[]>(`/api/servers/${effectiveServerId}/channels`),
    enabled: !!effectiveServerId,
  })

  // Fetch members to show Buddy roster in widget dashboard
  const { data: members = [] } = useQuery({
    queryKey: ['members', effectiveServerId],
    queryFn: () => fetchApi<BuddyMember[]>(`/api/servers/${effectiveServerId}/members`),
    enabled: !!effectiveServerId,
  })

  const buddyMembers = members.filter((m) => m.user?.isBot)

  // Check for homepage app
  const { data: homepageApp } = useQuery({
    queryKey: ['homepage-app', effectiveServerId],
    queryFn: () => fetchApi<HomepageApp | null>(`/api/servers/${effectiveServerId}/apps/homepage`),
    enabled: !!effectiveServerId,
  })

  // Handle postMessage from iframe for navigation
  const handleMessage = useCallback(
    (event: MessageEvent) => {
      if (!event.data || typeof event.data !== 'object') return
      const { type, channelName, url } = event.data

      if (type === 'server-home:explore-channels' || type === 'navigate-channel') {
        // Navigate to the first channel, or by name if specified
        const targetChannel = channelName
          ? channels?.find((ch) => ch.name === channelName)
          : channels?.[0]
        if (targetChannel && server) {
          void navigate({
            to: '/servers/$serverSlug/channels/$channelId',
            params: { serverSlug: server.slug || server.id, channelId: targetChannel.id },
          })
        }
      } else if (type === 'server-home:navigate' && url) {
        // Handle link clicks from iframe
        try {
          const parsed = new URL(url, window.location.origin)
          if (parsed.origin === window.location.origin) {
            // Internal link — navigate in parent
            void navigate({ to: parsed.pathname + parsed.search + parsed.hash })
          } else {
            // External link — open in new tab
            window.open(url, '_blank', 'noopener,noreferrer')
          }
        } catch {
          window.open(url, '_blank', 'noopener,noreferrer')
        }
      }
    },
    [channels, server, navigate],
  )

  useEffect(() => {
    window.addEventListener('message', handleMessage)
    return () => window.removeEventListener('message', handleMessage)
  }, [handleMessage])

  if (!server) {
    return (
      <div className="flex-1 flex items-center justify-center bg-bg-primary">
        <div className="text-center">
          <img src="/Logo.svg" alt="Shadow" className="w-16 h-16 mx-auto mb-4 opacity-30" />
          <p className="text-text-muted text-lg">{t('common.loading')}</p>
        </div>
      </div>
    )
  }

  // If a homepage app exists, resolve its URL for the iframe
  const homepageAppUrl = homepageApp
    ? homepageApp.sourceType === 'url'
      ? homepageApp.sourceUrl
      : `/api/media/files/${homepageApp.sourceUrl}`
    : null

  // Determine rendering mode: custom HTML, homepage app, or native widget dashboard
  const hasCustomContent = !!server.homepageHtml || !!homepageAppUrl
  const useWidgetDashboard = !hasCustomContent

  // Inject link interceptor script to prevent app-in-app navigation
  const linkInterceptorScript = `<script>
document.addEventListener('click', function(e) {
  var a = e.target.closest('a');
  if (!a) return;
  var href = a.getAttribute('href');
  if (!href || href.startsWith('#') || href.startsWith('javascript:')) return;
  e.preventDefault();
  window.parent.postMessage({ type: 'server-home:navigate', url: a.href }, '*');
}, true);
</script>`

  const handleCopyLink = async () => {
    const slug = server.slug || server.id
    const url = `${window.location.origin}/s/${slug}`
    const success = await copyToClipboardSilent(url)
    if (success) {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const handleOpenNewWindow = () => {
    const slug = server.slug || server.id
    window.open(`/s/${slug}`, '_blank')
  }

  return (
    <div className="flex-1 flex flex-col bg-bg-primary overflow-hidden">
      {/* Header bar */}
      <div className="desktop-drag-titlebar h-12 px-4 flex items-center border-b border-border-subtle shrink-0">
        {/* Mobile back button — return to channel list */}
        {!standalone && (
          <button
            type="button"
            onClick={() => useUIStore.getState().setMobileView('channels')}
            className="md:hidden p-2 -ml-2 mr-1 text-text-muted hover:text-text-primary hover:bg-bg-modifier-hover rounded-lg transition"
          >
            <ArrowLeft size={18} />
          </button>
        )}
        <Home size={16} className="mr-2 text-text-muted" />
        <h2 className="font-black text-text-primary text-sm truncate flex-1">{server.name}</h2>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={handleCopyLink}
            className="p-2 text-text-muted hover:text-text-primary hover:bg-bg-modifier-hover rounded-lg transition"
            title={t('common.copy')}
          >
            {copied ? <Check size={16} className="text-success" /> : <Copy size={16} />}
          </button>
          <button
            type="button"
            onClick={handleOpenNewWindow}
            className="p-2 text-text-muted hover:text-text-primary hover:bg-bg-modifier-hover rounded-lg transition"
            title={t('serverHome.openNewWindow')}
          >
            <ExternalLink size={16} />
          </button>
          {standalone && (
            <button
              type="button"
              onClick={() => {
                const slug = server.slug || server.id
                navigate({ to: '/servers/$serverSlug', params: { serverSlug: slug } })
              }}
              className="p-2 text-text-muted hover:text-text-primary hover:bg-bg-modifier-hover rounded-lg transition"
              title={t('serverHome.backToServer')}
            >
              <Settings size={16} />
            </button>
          )}
        </div>
      </div>
      {/* Content: Widget Dashboard or custom HTML iframe */}
      {useWidgetDashboard ? (
        <WidgetDashboard
          server={server}
          channels={channels}
          buddyMembers={buddyMembers}
          copied={copied}
          onCopyLink={handleCopyLink}
        />
      ) : (
        <div className="flex-1 overflow-auto">
          {homepageAppUrl ? (
            <iframe
              src={homepageAppUrl}
              title={`${homepageApp?.name ?? server.name} homepage`}
              className="w-full h-full border-0"
              sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-modals"
              allow="fullscreen; clipboard-write"
            />
          ) : (
            <iframe
              srcDoc={(() => {
                const rawHtml = server.homepageHtml ?? generateDefaultHtml(server, t)
                return rawHtml.includes('</body>')
                  ? rawHtml.replace('</body>', `${linkInterceptorScript}</body>`)
                  : rawHtml + linkInterceptorScript
              })()}
              title={`${server.name} homepage`}
              className="w-full h-full border-0"
              sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-modals"
            />
          )}
        </div>
      )}
    </div>
  )
}
