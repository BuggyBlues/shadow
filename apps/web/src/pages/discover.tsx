import { Badge, Button, Card, cn, Input } from '@shadowob/ui'
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import {
  Flame,
  Hash,
  MessageCircle,
  MoreHorizontal,
  Search,
  Server,
  Shield,
  Users,
  Zap,
} from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useAppStatus } from '../hooks/use-app-status'
import { useUnreadCount } from '../hooks/use-unread-count'
import { fetchApi } from '../lib/api'
import { getCatAvatar } from '../lib/pixel-cats'

type FeedItemType = 'server' | 'channel' | 'rental'
type FilterType = 'all' | 'servers' | 'channels' | 'rentals'

interface FeedItem {
  id: string
  type: FeedItemType
  heatScore: number
  data: ServerData | ChannelData | RentalData
}

interface ServerData {
  id: string
  name: string
  slug: string | null
  description: string | null
  iconUrl: string | null
  bannerUrl: string | null
  memberCount: number
  isPublic: boolean
  inviteCode: string
  createdAt: string
}

interface ChannelData {
  id: string
  name: string
  type: 'text' | 'voice' | 'announcement'
  topic: string | null
  server: {
    id: string
    name: string
    slug: string | null
    iconUrl: string | null
  }
  memberCount: number
  lastMessage: {
    content: string
    createdAt: string
  } | null
}

interface RentalData {
  contractId: string
  contractNo: string
  startedAt: string
  expiresAt: string | null
  listing: {
    id: string
    title: string
    description: string | null
    deviceTier: string | null
    osType: string | null
    hourlyRate: number
    tags: string[] | null
  } | null
  tenant: {
    id: string
    username: string
    displayName: string | null
    avatarUrl: string | null
  } | null
  owner: {
    id: string
    username: string
    displayName: string | null
    avatarUrl: string | null
  } | null
  agent: {
    id: string
    name: string
    status: string
    lastHeartbeat: string | null
  } | null
}

interface ServerEntry {
  server: { id: string; name: string; slug: string | null; iconUrl: string | null }
  member: { role: string }
}

interface FeedResponse {
  items: FeedItem[]
  total: number
  hasMore: boolean
}

/* ── Neon Frost glass helpers ── */
const neonSpinner =
  'animate-spin w-8 h-8 rounded-full border-2 border-primary border-t-transparent drop-shadow-[0_0_6px_rgba(0,243,255,0.5)]'

export function DiscoverPage() {
  const { t } = useTranslation()
  const unreadCount = useUnreadCount()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [searchQuery, setSearchQuery] = useState('')
  const [activeFilter, setActiveFilter] = useState<FilterType>('all')
  const [isSearching, setIsSearching] = useState(false)
  const searchInputRef = useRef<HTMLInputElement>(null)

  useAppStatus({
    title: t('discover.title'),
    unreadCount,
    hasNotification: unreadCount > 0,
    variant: 'workspace',
  })

  const { data: myServers = [] } = useQuery({
    queryKey: ['servers'],
    queryFn: () => fetchApi<ServerEntry[]>('/api/servers'),
  })

  const joinedServerIds = useMemo(() => new Set(myServers.map((s) => s.server.id)), [myServers])

  // 无限滚动加载推荐流
  const {
    data: feedData,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading: feedLoading,
  } = useInfiniteQuery({
    queryKey: ['discover-feed', activeFilter],
    queryFn: async ({ pageParam = 0 }) => {
      const res = await fetchApi<FeedResponse>(
        `/api/discover/feed?type=${activeFilter}&limit=20&offset=${pageParam}`,
      )
      return res
    },
    getNextPageParam: (lastPage, pages) => {
      if (!lastPage.hasMore) return undefined
      return pages.length * 20
    },
    initialPageParam: 0,
  })

  // 搜索
  const { data: searchResults, isLoading: searchLoading } = useQuery({
    queryKey: ['discover-search', searchQuery, activeFilter],
    queryFn: async () => {
      if (!searchQuery || searchQuery.length < 2) return { items: [] }
      const res = await fetchApi<{ items: FeedItem[] }>(
        `/api/discover/search?q=${encodeURIComponent(searchQuery)}&type=${activeFilter}`,
      )
      return res
    },
    enabled: isSearching && searchQuery.length >= 2,
  })

  const joinMutation = useMutation({
    mutationFn: ({ inviteCode }: { inviteCode: string }) =>
      fetchApi<{ id: string; slug?: string | null }>('/api/servers/_/join', {
        method: 'POST',
        body: JSON.stringify({ inviteCode }),
      }),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['servers'] })
      navigate({
        to: '/servers/$serverSlug',
        params: { serverSlug: data.slug ?? data.id },
      })
    },
  })

  // 合并所有页面数据
  const allItems = useMemo(() => {
    if (isSearching) return searchResults?.items || []
    return feedData?.pages.flatMap((page) => page.items) || []
  }, [feedData, searchResults, isSearching])

  // 监听滚动加载更多
  const observerRef = useRef<IntersectionObserver>()
  const loadMoreRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (isSearching) return
    observerRef.current = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) {
          fetchNextPage()
        }
      },
      { threshold: 0.1 },
    )

    if (loadMoreRef.current) {
      observerRef.current.observe(loadMoreRef.current)
    }

    return () => observerRef.current?.disconnect()
  }, [fetchNextPage, hasNextPage, isFetchingNextPage, isSearching])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (searchQuery.length >= 2) {
      setIsSearching(true)
    }
  }

  const clearSearch = () => {
    setSearchQuery('')
    setIsSearching(false)
  }

  const formatTimeAgo = (date: string) => {
    const now = new Date()
    const then = new Date(date)
    const diff = now.getTime() - then.getTime()
    const minutes = Math.floor(diff / 60000)
    const hours = Math.floor(diff / 3600000)
    const days = Math.floor(diff / 86400000)

    if (minutes < 1) return t('discover.justNow')
    if (minutes < 60) return t('discover.minutesAgo', { count: minutes })
    if (hours < 24) return t('discover.hoursAgo', { count: hours })
    if (days < 7) return t('discover.daysAgo', { count: days })
    return then.toLocaleDateString()
  }

  const getHeatLevel = (score: number) => {
    if (score >= 100) return { level: 'hot', color: 'text-danger', icon: Flame }
    if (score >= 50) return { level: 'warm', color: 'text-warning', icon: Zap }
    return { level: 'normal', color: 'text-text-muted', icon: null }
  }

  return (
    <div className="relative flex-1 flex flex-col bg-bg-deep overflow-y-auto">
      {/* Ambient orb blurs */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden -z-10">
        <div className="absolute -top-40 -left-40 w-[600px] h-[600px] rounded-full bg-primary/10 blur-[180px]" />
        <div className="absolute bottom-0 right-0 w-[400px] h-[400px] rounded-full bg-secondary/10 blur-[160px]" />
      </div>

      {/* Header */}
      <div className="desktop-drag-titlebar border-b border-border-subtle bg-bg-deep/80 backdrop-blur-[32px]">
        <div className="max-w-5xl mx-auto px-6 py-6">
          {/* Title */}
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center shadow-[0_0_20px_rgba(0,243,255,0.35)]">
              <Flame size={20} className="text-bg-deep" />
            </div>
            <div>
              <h1 className="text-2xl font-black font-[Nunito] text-text-primary tracking-tight">
                {t('discover.title')}
              </h1>
              <p className="text-text-muted text-sm">{t('discover.subtitle')}</p>
            </div>
          </div>

          {/* Search Bar */}
          <form onSubmit={handleSearch} className="relative mb-4">
            <div className="relative">
              <Search
                size={18}
                className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted z-10"
              />
              <Input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() => searchQuery.length >= 2 && setIsSearching(true)}
                placeholder={t('discover.searchPlaceholder')}
                className="w-full rounded-full pl-12 pr-10 py-3 text-[15px]"
              />
              {searchQuery && (
                <Button
                  type="button"
                  variant="ghost"
                  size="xs"
                  onClick={clearSearch}
                  className="absolute right-2 top-1/2 -translate-y-1/2"
                >
                  ×
                </Button>
              )}
            </div>
          </form>

          {/* Filter Tabs */}
          <div className="flex gap-2">
            {[
              { key: 'all', label: t('discover.filters.all'), icon: Flame },
              { key: 'servers', label: t('discover.filters.servers'), icon: Server },
              { key: 'channels', label: t('discover.filters.channels'), icon: Hash },
              { key: 'rentals', label: t('discover.filters.rentals'), icon: Zap },
            ].map(({ key, label, icon: Icon }) => (
              <Button
                key={key}
                type="button"
                variant={activeFilter === key ? 'primary' : 'glass'}
                size="sm"
                onClick={() => {
                  setActiveFilter(key as FilterType)
                  setIsSearching(false)
                }}
                className="rounded-full"
              >
                <Icon size={14} />
                {label}
              </Button>
            ))}
          </div>
        </div>
      </div>

      {/* Content Feed */}
      <div className="flex-1">
        <div className="max-w-5xl mx-auto px-6 py-6">
          {isSearching && searchLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className={neonSpinner} />
            </div>
          ) : allItems.length === 0 ? (
            <NeonEmptyState isSearching={isSearching} t={t} />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {allItems.map((item, index) => (
                <FeedCard
                  key={`${item.type}-${item.id}-${index}`}
                  item={item}
                  joinedServerIds={joinedServerIds}
                  joinMutation={joinMutation}
                  navigate={navigate}
                  t={t}
                  formatTimeAgo={formatTimeAgo}
                  getHeatLevel={getHeatLevel}
                />
              ))}

              {/* Load More Trigger */}
              {!isSearching && (
                <div ref={loadMoreRef} className="col-span-full py-4 text-center">
                  {isFetchingNextPage ? (
                    <div className={cn(neonSpinner, 'w-6 h-6 mx-auto')} />
                  ) : hasNextPage ? (
                    <span className="text-text-muted text-sm">{t('discover.loadMore')}</span>
                  ) : (
                    <span className="text-text-muted text-sm">{t('discover.noMore')}</span>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Empty State ──
function NeonEmptyState({
  isSearching,
  t,
}: {
  isSearching: boolean
  t: (key: string, options?: Record<string, unknown>) => string
}) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="w-20 h-20 rounded-full bg-bg-tertiary backdrop-blur-[32px] border border-border-subtle flex items-center justify-center mb-4 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06)]">
        <Search size={32} className="text-primary/40" />
      </div>
      <h3 className="text-lg font-black font-[Nunito] text-text-primary mb-2">
        {isSearching ? t('discover.noSearchResults') : t('discover.emptyTitle')}
      </h3>
      <p className="text-muted-foreground text-sm max-w-sm">
        {isSearching ? t('discover.noSearchResultsDesc') : t('discover.emptyDesc')}
      </p>
    </div>
  )
}

// ── Feed Card ──
function FeedCard({
  item,
  joinedServerIds,
  joinMutation,
  navigate,
  t,
  formatTimeAgo,
  getHeatLevel,
}: {
  item: FeedItem
  joinedServerIds: Set<string>
  joinMutation: ReturnType<typeof useMutation>
  navigate: ReturnType<typeof useNavigate>
  t: (key: string, options?: Record<string, unknown>) => string
  formatTimeAgo: (date: string) => string
  getHeatLevel: (score: number) => { level: string; color: string; icon: typeof Flame | null }
}) {
  const heat = getHeatLevel(item.heatScore)

  if (item.type === 'server') {
    const server = item.data as ServerData
    const isJoined = joinedServerIds.has(server.id)

    return (
      <Card
        variant="glass"
        onClick={() => {
          if (isJoined) {
            navigate({
              to: '/servers/$serverSlug',
              params: { serverSlug: server.slug ?? server.id },
            })
          }
        }}
        className="rounded-[24px] overflow-hidden cursor-pointer group relative hover:-translate-y-1 hover:shadow-[0_8px_32px_rgba(0,243,255,0.12)] transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)]"
      >
        {/* Banner */}
        <div className="h-[120px] bg-gradient-to-br from-primary/15 to-primary/[0.03] relative">
          {server.bannerUrl ? (
            <img
              src={server.bannerUrl}
              alt=""
              className="w-full h-full object-cover absolute inset-0"
            />
          ) : null}
          {server.isPublic && (
            <Badge
              variant="neutral"
              size="sm"
              className="absolute top-3 right-3 z-10 gap-1 backdrop-blur-md"
            >
              <Shield size={12} />
              {t('discover.public')}
            </Badge>
          )}
        </div>

        {/* Icon overlay */}
        <div className="absolute top-[92px] left-4 p-1.5 bg-bg-deep group-hover:bg-bg-deep/90 rounded-[18px] transition-colors duration-200 z-20 border border-border-subtle">
          <div className="w-[48px] h-[48px] rounded-full overflow-hidden bg-bg-tertiary flex items-center justify-center">
            {server.iconUrl ? (
              <img src={server.iconUrl} alt="" className="w-full h-full object-cover" />
            ) : (
              <img src={getCatAvatar(0)} alt={server.name} className="w-9 h-9" />
            )}
          </div>
        </div>

        {/* Content */}
        <div className="pt-10 p-5 flex flex-col flex-1">
          <h3 className="font-black font-[Nunito] text-text-primary text-[16px] mb-1 truncate">
            {server.name}
          </h3>
          <p className="text-text-muted text-[14px] mb-4 line-clamp-2 min-h-[2.5rem] flex-1">
            {server.description ?? t('discover.noDescription')}
          </p>

          <div className="flex items-center justify-between mt-auto">
            <div className="flex items-center gap-2">
              <span className="flex items-center gap-1.5 text-[12px] font-medium text-text-muted">
                <div className="w-2 h-2 rounded-full bg-success shadow-[0_0_6px_rgba(0,230,118,0.5)]" />
                {server.memberCount} {t('discover.members')}
              </span>
              {heat.icon && (
                <span className={cn('flex items-center gap-1 text-[12px]', heat.color)}>
                  <heat.icon size={12} />
                  {t('discover.heat.hot')}
                </span>
              )}
            </div>

            {isJoined ? (
              <Button
                type="button"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation()
                  navigate({
                    to: '/servers/$serverSlug',
                    params: { serverSlug: server.slug ?? server.id },
                  })
                }}
                className="rounded-full"
              >
                {t('discover.enterButton')}
              </Button>
            ) : (
              <Button
                type="button"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation()
                  joinMutation.mutate({ inviteCode: server.inviteCode })
                }}
                disabled={joinMutation.isPending}
                className="rounded-full"
              >
                {t('discover.joinButton')}
              </Button>
            )}
          </div>
        </div>
      </Card>
    )
  }

  if (item.type === 'channel') {
    const channel = item.data as ChannelData
    const isJoined = joinedServerIds.has(channel.server.id)

    return (
      <Card
        variant="glass"
        onClick={() => {
          if (isJoined) {
            navigate({
              to: '/servers/$serverSlug/channels/$channelId',
              params: {
                serverSlug: channel.server.slug ?? channel.server.id,
                channelId: channel.id,
              },
            })
          } else {
            navigate({
              to: '/servers/$serverSlug',
              params: { serverSlug: channel.server.slug ?? channel.server.id },
            })
          }
        }}
        className="rounded-[24px] overflow-hidden cursor-pointer group relative hover:-translate-y-1 hover:shadow-[0_8px_32px_rgba(0,243,255,0.12)] transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)]"
      >
        {/* Header with server icon and channel badge */}
        <div className="h-[80px] bg-gradient-to-br from-primary/15 to-primary/[0.03] relative p-4">
          {/* Channel Badge */}
          <Badge variant="primary" size="sm" className="absolute top-3 right-3 z-10 gap-1">
            <Hash size={10} />
            {t('discover.channelBadge')}
          </Badge>

          {/* Server Info */}
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full overflow-hidden bg-bg-tertiary shrink-0 border-2 border-border-subtle">
              {channel.server.iconUrl ? (
                <img src={channel.server.iconUrl} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-lg font-bold text-primary/60 bg-bg-tertiary">
                  {channel.server.name.charAt(0)}
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-text-muted text-[12px] truncate">{channel.server.name}</p>
              <div className="flex items-center gap-1">
                <Hash size={14} className="text-primary" />
                <span className="font-bold text-text-primary text-[15px] truncate">
                  {channel.name}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-5 flex flex-col flex-1">
          {channel.topic && (
            <p className="text-text-muted text-[14px] mb-3 line-clamp-2">{channel.topic}</p>
          )}

          {channel.lastMessage && (
            <div className="bg-bg-tertiary rounded-2xl p-3 mb-3 border border-border-subtle">
              <p className="text-text-muted text-[13px] line-clamp-2">
                {channel.lastMessage.content}
              </p>
              <p className="text-text-muted/50 text-[11px] mt-1">
                {formatTimeAgo(channel.lastMessage.createdAt)}
              </p>
            </div>
          )}

          <div className="flex items-center justify-between mt-auto pt-3 border-t border-border-subtle">
            <span className="flex items-center gap-1.5 text-[12px] font-medium text-text-muted">
              <div className="w-2 h-2 rounded-full bg-success shadow-[0_0_6px_rgba(0,230,118,0.5)]" />
              {channel.memberCount} {t('discover.members')}
            </span>
            {!isJoined ? (
              <Badge variant="neutral" size="sm">
                {t('discover.joinToView')}
              </Badge>
            ) : (
              <Badge variant="success" size="sm">
                {t('discover.enterButton')}
              </Badge>
            )}
          </div>
        </div>
      </Card>
    )
  }

  if (item.type === 'rental') {
    const rental = item.data as RentalData

    return (
      <Card
        variant="glass"
        className="rounded-[24px] p-5 hover:-translate-y-1 hover:shadow-[0_8px_32px_rgba(0,243,255,0.12)] transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)]"
      >
        <div className="flex gap-4">
          {/* Agent Avatar */}
          <div className="w-14 h-14 rounded-full bg-gradient-to-br from-accent/20 to-primary/20 flex items-center justify-center shrink-0 border border-border-subtle">
            <span className="text-2xl">🤖</span>
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h3 className="font-black font-[Nunito] text-text-primary text-[16px]">
                  {rental.listing?.title || t('discover.unknownListing')}
                </h3>
                <p className="text-text-muted text-[13px]">
                  {rental.agent?.name || t('discover.unknownAgent')}
                </p>
              </div>
              <div className="flex items-center gap-1 text-[12px] text-text-muted">
                <Zap size={12} />
                {t('discover.rentedSince')} {formatTimeAgo(rental.startedAt)}
              </div>
            </div>

            {rental.listing?.description && (
              <p className="text-text-muted text-[13px] mt-2 line-clamp-2">
                {rental.listing.description}
              </p>
            )}

            <div className="flex flex-wrap gap-2 mt-3">
              {rental.listing?.deviceTier && (
                <Badge variant="neutral" size="sm">
                  {rental.listing.deviceTier}
                </Badge>
              )}
              {rental.listing?.osType && (
                <Badge variant="neutral" size="sm">
                  {rental.listing.osType}
                </Badge>
              )}
              {rental.agent?.status && (
                <Badge
                  variant={
                    rental.agent.status === 'online'
                      ? 'success'
                      : rental.agent.status === 'error'
                        ? 'danger'
                        : 'neutral'
                  }
                  size="sm"
                >
                  {rental.agent.status}
                </Badge>
              )}
            </div>

            <div className="flex items-center gap-2 mt-3 pt-3 border-t border-border-subtle">
              <div className="w-6 h-6 rounded-full bg-bg-tertiary overflow-hidden border border-border-subtle">
                {rental.tenant?.avatarUrl ? (
                  <img
                    src={rental.tenant.avatarUrl}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-[10px]">
                    👤
                  </div>
                )}
              </div>
              <span className="text-text-muted text-[12px]">
                {rental.tenant?.displayName || rental.tenant?.username || t('discover.unknownUser')}
              </span>
              <span className="text-secondary/60 text-[12px] font-medium">
                · {rental.listing?.hourlyRate}虾币/h
              </span>
            </div>
          </div>
        </div>
      </Card>
    )
  }

  return null
}
