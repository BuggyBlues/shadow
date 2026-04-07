import {
  Button,
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
  cn,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
} from '@shadowob/ui'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useLocation, useNavigate } from '@tanstack/react-router'
import {
  AppWindow,
  Archive,
  Check,
  ChevronDown,
  ChevronRight,
  Copy,
  Edit3,
  FolderClosed,
  Hash,
  Home,
  ImageIcon,
  Lock,
  Megaphone,
  Menu,
  PawPrint,
  Plus,
  Save,
  Settings,
  ShoppingBag,
  Trash2,
  UserPlus,
  Volume2,
  X,
} from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useChannelSort } from '../../hooks/use-channel-sort'
import { useSocketEvent } from '../../hooks/use-socket'
import { fetchApi } from '../../lib/api'
import { joinChannel } from '../../lib/socket'
import { useAuthStore } from '../../stores/auth.store'
import { useChatStore } from '../../stores/chat.store'
import { useUIStore } from '../../stores/ui.store'
import { useConfirmStore } from '../common/confirm-dialog'
import { ContextMenu } from '../common/context-menu'
import { InvitePanel } from '../common/invite-panel'
import { ChannelSortFilterButton } from './channel-sort-button'

interface Channel {
  id: string
  name: string
  type: 'text' | 'voice' | 'announcement'
  topic: string | null
  position: number
  isPrivate: boolean
  isMember?: boolean
  createdAt?: string
  updatedAt?: string
  lastMessageAt?: string | null
}

interface Server {
  id: string
  name: string
  description: string | null
  slug: string
  iconUrl: string | null
  bannerUrl: string | null
  homepageHtml: string | null
  isPublic: boolean
  inviteCode: string
  ownerId: string
}

interface NotificationPreference {
  strategy: 'all' | 'mention_only' | 'none'
  mutedServerIds: string[]
  mutedChannelIds: string[]
}

interface ScopedUnread {
  channelUnread: Record<string, number>
  serverUnread: Record<string, number>
}

interface ServerMember {
  userId: string
  role: string
  user?: {
    id: string
    username: string
    displayName: string | null
    avatarUrl: string | null
    isBot: boolean
  } | null
}

const channelIcons = {
  text: Hash,
  voice: Volume2,
  announcement: Megaphone,
}

export function ChannelSidebar({ serverSlug }: { serverSlug: string }) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const location = useLocation()
  const queryClient = useQueryClient()
  const { activeChannelId, setActiveChannel } = useChatStore()
  const _currentUser = useAuthStore((s) => s.user)
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({})
  const [showCreate, setShowCreate] = useState(false)
  const [showServerEdit, setShowServerEdit] = useState(false)
  const [newName, setNewName] = useState('')
  const [newType, setNewType] = useState<'text' | 'voice' | 'announcement'>('text')
  const [newIsPrivate, setNewIsPrivate] = useState(false)

  // Listen for 'create-channel' pending action from task center
  const pendingAction = useUIStore((s) => s.pendingAction)
  const setPendingAction = useUIStore((s) => s.setPendingAction)
  useEffect(() => {
    if (pendingAction === 'create-channel') {
      setShowCreate(true)
      setPendingAction(null)
    }
  }, [pendingAction, setPendingAction])

  // Server settings dialog state
  const [bannerUploading, setBannerUploading] = useState(false)
  const [iconUploading, setIconUploading] = useState(false)
  const [serverEditTab, setServerEditTab] = useState<'basic' | 'advanced'>('basic')

  // Server edit form state - centralized draft state
  const [serverFormDraft, setServerFormDraft] = useState<{
    name: string
    description: string
    slug: string
    isPublic: boolean
    homepageHtml: string
    iconUrl: string | null
    bannerUrl: string | null
  }>({
    name: '',
    description: '',
    slug: '',
    isPublic: false,
    homepageHtml: '',
    iconUrl: null,
    bannerUrl: null,
  })
  const [copiedInvite, setCopiedInvite] = useState(false)
  const [contextMenu, setContextMenu] = useState<{
    x: number
    y: number
    channel: Channel
  } | null>(null)
  const [showInvitePanel, setShowInvitePanel] = useState(false)
  const [inviteInitialTab, setInviteInitialTab] = useState<'members' | 'buddies'>('members')
  const [inviteTargetChannel, setInviteTargetChannel] = useState<Channel | null>(null)
  const [editingChannel, setEditingChannel] = useState<Channel | null>(null)
  const [editChannelName, setEditChannelName] = useState('')
  const [blankContextMenu, setBlankContextMenu] = useState<{ x: number; y: number } | null>(null)
  const scopeReadCooldownRef = useRef<Map<string, number>>(new Map())
  const scopeReadInFlightRef = useRef<Set<string>>(new Set())
  const lastMarkedChannelRef = useRef<string | null>(null)

  const { data: server } = useQuery({
    queryKey: ['server', serverSlug],
    queryFn: () => fetchApi<Server>(`/api/servers/${serverSlug}`),
  })

  const { data: rawChannels = [] } = useQuery<Channel[]>({
    queryKey: ['channels', serverSlug],
    queryFn: () => fetchApi<Channel[]>(`/api/servers/${serverSlug}/channels`),
  })

  // Channel sorting and filter
  const [filterKeyword, setFilterKeyword] = useState('')
  const [showArchived, setShowArchived] = useState(false)
  const hasActiveFilter = filterKeyword.trim().length > 0
  const { sortChannels, updateLastAccessed } = useChannelSort(server?.id)
  const sortedChannels = sortChannels(rawChannels)
  const filteredChannels = hasActiveFilter
    ? sortedChannels.filter((ch) =>
        ch.name.toLowerCase().includes(filterKeyword.toLowerCase().trim()),
      )
    : sortedChannels
  const channels = showArchived ? filteredChannels : filteredChannels.filter((ch) => !ch.isArchived)

  const { data: scopedUnread } = useQuery({
    queryKey: ['notification-scoped-unread'],
    queryFn: () => fetchApi<ScopedUnread>('/api/notifications/scoped-unread'),
    refetchInterval: 15_000,
  })

  const { data: notificationPreference } = useQuery({
    queryKey: ['notification-preferences'],
    queryFn: () => fetchApi<NotificationPreference>('/api/notifications/preferences'),
  })

  const updateNotificationPreference = useMutation({
    mutationFn: (payload: Partial<NotificationPreference>) =>
      fetchApi<NotificationPreference>('/api/notifications/preferences', {
        method: 'PATCH',
        body: JSON.stringify(payload),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notification-preferences'] })
      queryClient.invalidateQueries({ queryKey: ['notification-scoped-unread'] })
      queryClient.invalidateQueries({ queryKey: ['notifications-unread-count'] })
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
    },
  })

  const serverUnreadCount = scopedUnread?.serverUnread?.[server?.id ?? serverSlug] ?? 0

  const createChannel = useMutation({
    mutationFn: (data: { name: string; type: string; isPrivate?: boolean }) =>
      fetchApi<Channel>(`/api/servers/${serverSlug}/channels`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['channels', serverSlug] })
      setShowCreate(false)
      setNewName('')
      setNewIsPrivate(false)
      // Auto-navigate to the newly created channel
      handleSelectChannel(data.id)
      // Show invite panel for the new channel
      setInviteTargetChannel(data)
      setShowInvitePanel(true)
    },
  })

  const requestMarkScopeRead = useCallback(
    async (payload: { serverId?: string; channelId?: string }) => {
      const key = payload.channelId
        ? `channel:${payload.channelId}`
        : payload.serverId
          ? `server:${payload.serverId}`
          : ''
      if (!key) return

      const now = Date.now()
      const last = scopeReadCooldownRef.current.get(key) ?? 0
      if (now - last < 1200) return
      if (scopeReadInFlightRef.current.has(key)) return

      scopeReadCooldownRef.current.set(key, now)
      scopeReadInFlightRef.current.add(key)
      try {
        await fetchApi('/api/notifications/read-scope', {
          method: 'POST',
          body: JSON.stringify(payload),
        })
        queryClient.invalidateQueries({ queryKey: ['notification-scoped-unread'] })
        queryClient.invalidateQueries({ queryKey: ['notifications-unread-count'] })
      } finally {
        scopeReadInFlightRef.current.delete(key)
      }
    },
    [queryClient],
  )

  const updateServer = useMutation({
    mutationFn: (data: {
      name?: string
      description?: string | null
      slug?: string
      iconUrl?: string | null
      bannerUrl?: string | null
      homepageHtml?: string | null
      isPublic?: boolean
    }) =>
      fetchApi<Server>(`/api/servers/${serverSlug}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),
    onSuccess: (updatedServer) => {
      // Invalidate queries with both old and new slug to ensure consistency
      queryClient.invalidateQueries({ queryKey: ['server', serverSlug] })
      if (updatedServer.slug !== serverSlug) {
        queryClient.invalidateQueries({ queryKey: ['server', updatedServer.slug] })
      }
      queryClient.invalidateQueries({ queryKey: ['servers'] })
      queryClient.invalidateQueries({ queryKey: ['discover-servers'] })
      // Redirect to slug-based URL if slug changed
      if (updatedServer.slug !== serverSlug) {
        navigate({ to: '/servers/$serverSlug', params: { serverSlug: updatedServer.slug } })
      }
    },
  })

  const deleteServer = useMutation({
    mutationFn: () => fetchApi(`/api/servers/${serverSlug}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['servers'] })
      navigate({ to: '/' })
    },
  })

  const openServerEdit = () => {
    // Initialize draft state from current server data
    setServerFormDraft({
      name: server?.name ?? '',
      description: server?.description ?? '',
      slug: server?.slug ?? '',
      isPublic: server?.isPublic ?? false,
      homepageHtml: server?.homepageHtml ?? '',
      iconUrl: server?.iconUrl ?? null,
      bannerUrl: server?.bannerUrl ?? null,
    })
    setServerEditTab('basic')
    setShowServerEdit(true)
  }

  // Update draft field helper
  const updateDraftField = <K extends keyof typeof serverFormDraft>(
    field: K,
    value: (typeof serverFormDraft)[K],
  ) => {
    setServerFormDraft((prev) => ({ ...prev, [field]: value }))
  }

  // Check if draft has changes compared to server data
  const hasDraftChanges = () => {
    if (!server) return false
    return (
      serverFormDraft.name !== server.name ||
      serverFormDraft.description !== (server.description ?? '') ||
      serverFormDraft.slug !== (server.slug ?? '') ||
      serverFormDraft.isPublic !== server.isPublic ||
      serverFormDraft.homepageHtml !== (server.homepageHtml ?? '') ||
      serverFormDraft.iconUrl !== server.iconUrl ||
      serverFormDraft.bannerUrl !== server.bannerUrl
    )
  }

  const handleBannerUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setBannerUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      const result = await fetchApi<{ url: string }>('/api/media/upload', {
        method: 'POST',
        body: formData,
      })
      // Update draft state only - don't save to server yet
      updateDraftField('bannerUrl', result.url)
    } catch {
      /* upload failed */
    } finally {
      setBannerUploading(false)
    }
  }

  const handleIconUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setIconUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      const result = await fetchApi<{ url: string }>('/api/media/upload', {
        method: 'POST',
        body: formData,
      })
      // Update draft state only - don't save to server yet
      updateDraftField('iconUrl', result.url)
    } catch {
      /* upload failed */
    } finally {
      setIconUploading(false)
    }
  }

  // Save all draft changes to server
  const saveServerChanges = () => {
    if (!serverFormDraft.name.trim()) return

    updateServer.mutate(
      {
        name: serverFormDraft.name.trim(),
        description: serverFormDraft.description.trim() || null,
        slug: serverFormDraft.slug.trim() || undefined,
        isPublic: serverFormDraft.isPublic,
        homepageHtml: serverFormDraft.homepageHtml.trim() || null,
        iconUrl: serverFormDraft.iconUrl,
        bannerUrl: serverFormDraft.bannerUrl,
      },
      {
        onSuccess: () => {
          setShowServerEdit(false)
        },
      },
    )
  }

  // Discard draft and close dialog
  const discardChanges = () => {
    setShowServerEdit(false)
  }

  const deleteChannel = useMutation({
    mutationFn: (channelId: string) =>
      fetchApi(`/api/channels/${channelId}`, {
        method: 'DELETE',
      }),
    onSuccess: (_data, deletedChannelId) => {
      queryClient.invalidateQueries({ queryKey: ['channels', serverSlug] })
      // If the deleted channel was active, navigate to next available channel
      if (activeChannelId === deletedChannelId) {
        const remaining = channels.filter((ch) => ch.id !== deletedChannelId)
        if (remaining.length > 0) {
          handleSelectChannel(remaining[0]!.id)
        } else {
          // No channels left — go to server home
          setActiveChannel(null)
          navigate({
            to: '/servers/$serverSlug',
            params: { serverSlug: server?.slug ?? serverSlug },
          })
        }
      }
    },
  })

  const archiveChannel = useMutation({
    mutationFn: (channelId: string) =>
      fetchApi(`/api/channels/${channelId}/archive`, {
        method: 'POST',
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['channels', serverSlug] })
    },
  })

  const unarchiveChannel = useMutation({
    mutationFn: (channelId: string) =>
      fetchApi(`/api/channels/${channelId}/unarchive`, {
        method: 'POST',
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['channels', serverSlug] })
    },
  })

  const updateChannel = useMutation({
    mutationFn: (data: { channelId: string; name?: string; isPrivate?: boolean }) =>
      fetchApi(`/api/channels/${data.channelId}`, {
        method: 'PATCH',
        body: JSON.stringify({ name: data.name, isPrivate: data.isPrivate }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['channels', serverSlug] })
      setEditingChannel(null)
      setEditChannelName('')
    },
  })

  const handleContextMenu = (e: React.MouseEvent, channel: Channel) => {
    e.preventDefault()
    setContextMenu({ x: e.clientX, y: e.clientY, channel })
  }

  // Close context menu on click outside
  useEffect(() => {
    const handleClick = () => setContextMenu(null)
    if (contextMenu) {
      document.addEventListener('click', handleClick)
      return () => document.removeEventListener('click', handleClick)
    }
  }, [contextMenu])

  const copyInviteCode = async () => {
    if (server?.inviteCode) {
      const inviteLink = `${window.location.origin}/app/invite/${server.inviteCode}`
      await navigator.clipboard.writeText(inviteLink)
      setCopiedInvite(true)
      setTimeout(() => setCopiedInvite(false), 2000)
    }
  }

  const { setMobileView, openMobileServerSidebar } = useUIStore()

  const handleSelectChannel = useCallback(
    (channelId: string) => {
      requestMarkScopeRead({ channelId })
      updateLastAccessed(channelId)
      setMobileView('chat')
      // Navigate to channel URL using channel ID
      navigate({
        to: '/servers/$serverSlug/channels/$channelId',
        params: { serverSlug: server?.slug ?? serverSlug, channelId },
      })
    },
    [setMobileView, server?.slug, serverSlug, navigate, requestMarkScopeRead, updateLastAccessed],
  )

  // Rejoin active channel room on socket reconnect
  useSocketEvent('connect', () => {
    const currentChannel = useChatStore.getState().activeChannelId
    if (currentChannel) {
      joinChannel(currentChannel)
    }
  })

  useEffect(() => {
    if (!activeChannelId) {
      lastMarkedChannelRef.current = null
      return
    }
    if (lastMarkedChannelRef.current === activeChannelId) return
    lastMarkedChannelRef.current = activeChannelId
    requestMarkScopeRead({ channelId: activeChannelId })
  }, [activeChannelId, requestMarkScopeRead])

  // Auto-refresh channel list when a new channel is created
  useSocketEvent('channel:created', (data: { serverId: string }) => {
    if (data.serverId === serverSlug || data.serverId === server?.id) {
      queryClient.invalidateQueries({ queryKey: ['channels', serverSlug] })
    }
  })

  useSocketEvent('notification:new', () => {
    queryClient.invalidateQueries({ queryKey: ['notification-scoped-unread'] })
    queryClient.invalidateQueries({ queryKey: ['notifications-unread-count'] })
  })

  const toggleGroup = (label: string) => {
    setCollapsedGroups((prev) => ({ ...prev, [label]: !prev[label] }))
  }

  const textChannels = channels.filter((c) => c.type === 'text')
  const voiceChannels = channels.filter((c) => c.type === 'voice')
  const announcementChannels = channels.filter((c) => c.type === 'announcement')
  const isInShop = /\/servers\/[^/]+\/shop(?:\/|$)/.test(location.pathname)
  const isInWorkspace = /\/servers\/[^/]+\/workspace(?:\/|$)/.test(location.pathname)
  const isInApps = /\/servers\/[^/]+\/apps(?:\/|$)/.test(location.pathname)
  const isInChannel = /\/servers\/[^/]+\/channels\//.test(location.pathname)
  const isHomeActive = !isInChannel && !isInShop && !isInWorkspace && !isInApps

  const renderChannelGroup = (label: string, items: Channel[]) => {
    if (items.length === 0) return null
    const isCollapsed = !!collapsedGroups[label]
    return (
      <Collapsible open={!isCollapsed} onOpenChange={() => toggleGroup(label)} className="mb-1">
        <div className="flex items-center justify-between pr-2">
          <CollapsibleTrigger className="flex items-center gap-1 px-4 py-1.5 text-[11px] font-bold tracking-widest uppercase text-muted-foreground hover:text-foreground flex-1 transition-colors">
            {isCollapsed ? (
              <ChevronRight size={12} className="shrink-0" />
            ) : (
              <ChevronDown size={12} className="shrink-0" />
            )}
            <span className="truncate">{label}</span>
          </CollapsibleTrigger>
        </div>
        <CollapsibleContent>
          {items.map((ch) => {
            const Icon = channelIcons[ch.type]
            const isActive = activeChannelId === ch.id
            const isEditing = editingChannel?.id === ch.id
            const unreadCount = scopedUnread?.channelUnread?.[ch.id] ?? 0
            const isUnread = !isActive && unreadCount > 0
            return isEditing ? (
              <div
                key={ch.id}
                className="flex items-center gap-1.5 px-2 mx-2 py-1 bg-primary/10 rounded-lg border border-primary/20"
              >
                <Icon size={16} className="shrink-0 text-muted-foreground" />
                <input
                  type="text"
                  value={editChannelName}
                  onChange={(e) => setEditChannelName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && editChannelName.trim()) {
                      updateChannel.mutate({ channelId: ch.id, name: editChannelName.trim() })
                    } else if (e.key === 'Escape') {
                      setEditingChannel(null)
                    }
                  }}
                  // biome-ignore lint/a11y/noAutofocus: needed for inline edit UX
                  autoFocus
                  className="flex-1 bg-black/20 text-foreground rounded-md px-2 py-1 text-sm outline-none focus:ring-1 focus:ring-primary backdrop-blur-sm border border-white/5"
                />
                <button
                  type="button"
                  onClick={() => {
                    if (editChannelName.trim()) {
                      updateChannel.mutate({ channelId: ch.id, name: editChannelName.trim() })
                    }
                  }}
                  className="text-emerald-400 hover:text-emerald-300 transition-colors"
                >
                  <Check size={14} />
                </button>
                <button
                  type="button"
                  onClick={() => setEditingChannel(null)}
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  <X size={14} />
                </button>
              </div>
            ) : (
              <button
                key={ch.id}
                data-channel-item
                onClick={async () => {
                  if (ch.isMember === false) {
                    await fetchApi(`/api/channels/${ch.id}/members`, {
                      method: 'POST',
                      body: JSON.stringify({}),
                    })
                    queryClient.invalidateQueries({ queryKey: ['channels', serverSlug] })
                  }
                  handleSelectChannel(ch.id)
                }}
                onContextMenu={(e) => handleContextMenu(e, ch)}
                className={cn(
                  'group flex items-center gap-1.5 px-2 py-[6px] mx-2 mb-[2px] rounded-lg text-sm font-medium w-[calc(100%-16px)] text-left transition-all duration-200',
                  isActive
                    ? 'bg-primary/15 text-primary shadow-[0_0_12px_rgba(0,243,255,0.08)]'
                    : 'text-muted-foreground hover:bg-primary/10 hover:text-foreground',
                  isUnread && 'font-semibold text-foreground',
                )}
              >
                <Icon
                  size={16}
                  className={cn(
                    'shrink-0 transition-colors',
                    isActive ? 'text-primary' : 'text-muted-foreground group-hover:text-foreground',
                  )}
                />
                <span className={cn('truncate', ch.isArchived && 'text-muted-foreground italic')}>
                  {ch.name}
                </span>
                {ch.isArchived && (
                  <Archive size={12} className="text-muted-foreground/60 shrink-0" />
                )}
                {ch.isPrivate && <Lock size={12} className="text-muted-foreground/60 shrink-0" />}
                {ch.isMember === false && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-primary/15 text-primary font-semibold shrink-0 border border-primary/20">
                    加入
                  </span>
                )}
                {isUnread && (
                  <span className="ml-auto w-2 h-2 rounded-full bg-primary shadow-[0_0_6px_rgba(0,243,255,0.6)] shrink-0" />
                )}
              </button>
            )
          })}
        </CollapsibleContent>
      </Collapsible>
    )
  }

  return (
    <div className="w-full md:w-60 bg-bg-primary/80 backdrop-blur-xl flex flex-col shrink-0 h-full border-r border-border/10">
      {/* Server name header — glassmorphic bar */}
      <div className="h-12 px-4 flex items-center justify-between border-b border-white/5 bg-white/[0.03] backdrop-blur-md shadow-[0_1px_8px_rgba(0,0,0,0.1)] z-10 transition-colors hover:bg-white/[0.06] cursor-pointer">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          {/* Mobile menu button to open server sidebar */}
          <button
            onClick={openMobileServerSidebar}
            className="md:hidden text-muted-foreground hover:text-foreground transition-colors shrink-0"
          >
            <Menu size={20} />
          </button>
          <h2 className="font-bold text-foreground truncate tracking-tight">
            {server?.name ?? '...'}
          </h2>
          {serverUnreadCount > 0 && (
            <span
              className="w-2 h-2 rounded-full bg-primary shadow-[0_0_6px_rgba(0,243,255,0.6)] shrink-0"
              title="该服务器有未读通知"
            />
          )}
        </div>
        <button
          onClick={openServerEdit}
          className="text-muted-foreground hover:text-foreground transition-colors p-1 rounded-lg hover:bg-white/5"
          title={t('channel.serverSettings')}
        >
          <Settings size={16} />
        </button>
      </div>

      {/* Channel list */}
      <div
        className="flex-1 overflow-y-auto pt-2 scrollbar-thin"
        onContextMenu={(e) => {
          // Only trigger if clicking on the blank area (not on a channel item)
          if ((e.target as HTMLElement).closest('[data-channel-item]')) return
          e.preventDefault()
          setBlankContextMenu({ x: e.clientX, y: e.clientY })
        }}
      >
        {/* Navigation links */}
        {[
          {
            test: isHomeActive,
            icon: Home,
            label: t('server.home'),
            onClick: () => {
              navigate({
                to: '/servers/$serverSlug',
                params: { serverSlug: server?.slug ?? serverSlug },
              })
              requestMarkScopeRead({ serverId: server?.id ?? serverSlug })
              setMobileView('chat')
            },
          },
          {
            test: isInShop,
            icon: ShoppingBag,
            label: t('serverHome.shop', '店铺'),
            onClick: () => {
              navigate({
                to: '/servers/$serverSlug/shop',
                params: { serverSlug: server?.slug ?? serverSlug },
              })
              requestMarkScopeRead({ serverId: server?.id ?? serverSlug })
              setMobileView('chat')
            },
          },
          {
            test: isInWorkspace,
            icon: FolderClosed,
            label: t('serverHome.workspace', '工作区'),
            onClick: () => {
              navigate({
                to: '/servers/$serverSlug/workspace',
                params: { serverSlug: server?.slug ?? serverSlug },
              })
              requestMarkScopeRead({ serverId: server?.id ?? serverSlug })
              setMobileView('chat')
            },
          },
          {
            test: isInApps,
            icon: AppWindow,
            label: '应用',
            onClick: () => {
              navigate({
                to: '/servers/$serverSlug/apps',
                params: { serverSlug: server?.slug ?? serverSlug },
              })
              requestMarkScopeRead({ serverId: server?.id ?? serverSlug })
              setMobileView('chat')
            },
          },
        ].map(({ test: isActiveNav, icon: NavIcon, label, onClick }) => (
          <button
            key={label}
            type="button"
            onClick={onClick}
            className={cn(
              'group flex items-center gap-1.5 px-2 py-[6px] mx-2 mb-[2px] rounded-lg text-sm font-medium w-[calc(100%-16px)] text-left transition-all duration-200',
              isActiveNav
                ? 'bg-primary/15 text-primary shadow-[0_0_12px_rgba(0,243,255,0.08)]'
                : 'text-muted-foreground hover:bg-primary/10 hover:text-foreground',
            )}
          >
            <NavIcon
              size={16}
              className={cn(
                'shrink-0 transition-colors',
                isActiveNav ? 'text-primary' : 'text-muted-foreground group-hover:text-foreground',
              )}
            />
            <span className="truncate">{label}</span>
          </button>
        ))}

        <div className="h-px bg-white/5 mx-4 my-2" />

        {/* Channel filter and sort bar */}
        {server?.id && (
          <div className="flex items-center justify-between px-4 py-1.5 mb-1">
            <span className="text-[11px] font-bold tracking-widest uppercase text-muted-foreground">
              {t('channel.channels', { defaultValue: '频道' })}
            </span>
            <div className="flex items-center gap-0.5">
              <ChannelSortFilterButton
                serverId={server.id}
                filterKeyword={filterKeyword}
                onFilterChange={setFilterKeyword}
                hasActiveFilter={hasActiveFilter}
                showArchived={showArchived}
                onShowArchivedChange={setShowArchived}
              />
              <Button
                variant="ghost"
                size="xs"
                onClick={() => setShowCreate(true)}
                title={t('channel.createChannel')}
                className="h-6 w-6 p-0 rounded-md"
              >
                <Plus size={14} />
              </Button>
            </div>
          </div>
        )}

        {renderChannelGroup(t('channel.announcement'), announcementChannels)}
        {renderChannelGroup(t('channel.text'), textChannels)}
        {renderChannelGroup(t('channel.voice'), voiceChannels)}

        {channels.length === 0 && (
          <p className="text-muted-foreground text-sm px-4 py-2">{t('channel.noChannels')}</p>
        )}
      </div>

      {/* Add channel button */}
      <div className="p-2 border-t border-white/5">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowCreate(true)}
          className="w-full justify-start gap-2 text-muted-foreground hover:text-foreground rounded-lg h-9 px-3 text-sm font-medium normal-case tracking-normal"
        >
          <Plus size={16} />
          {t('channel.createChannel')}
        </Button>
      </div>

      {/* Create channel dialog */}
      <Dialog isOpen={showCreate} onClose={() => setShowCreate(false)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t('channel.createChannel')}</DialogTitle>
            <DialogDescription>
              {t('channel.channels', { defaultValue: '创建一个新频道' })}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <Input
              label={t('channel.channelName')}
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => {
                if (
                  e.key === 'Enter' &&
                  !e.shiftKey &&
                  !e.nativeEvent.isComposing &&
                  e.keyCode !== 229 &&
                  newName.trim()
                ) {
                  e.preventDefault()
                  createChannel.mutate({
                    name: newName.trim(),
                    type: newType,
                    isPrivate: newIsPrivate,
                  })
                }
              }}
              placeholder={t('channel.channelName')}
              className="!rounded-xl !py-3"
            />
            <div className="flex gap-2">
              {(['text', 'voice', 'announcement'] as const).map((chType) => (
                <Button
                  key={chType}
                  variant={newType === chType ? 'primary' : 'glass'}
                  size="xs"
                  onClick={() => setNewType(chType)}
                  className="normal-case tracking-normal font-semibold"
                >
                  {chType === 'text'
                    ? t('channel.typeText')
                    : chType === 'voice'
                      ? t('channel.typeVoice')
                      : t('channel.typeAnnouncement')}
                </Button>
              ))}
            </div>
            <label className="flex items-center justify-between bg-white/5 rounded-xl px-4 py-3 border border-white/5">
              <span className="text-sm text-foreground">私有频道（仅受邀加入）</span>
              <button
                type="button"
                onClick={() => setNewIsPrivate(!newIsPrivate)}
                className={cn(
                  'relative w-11 h-6 rounded-full transition-colors',
                  newIsPrivate ? 'bg-primary' : 'bg-white/10',
                )}
              >
                <span
                  className={cn(
                    'absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform shadow-sm',
                    newIsPrivate && 'translate-x-5',
                  )}
                />
              </button>
            </label>
          </div>
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setShowCreate(false)}
              className="normal-case tracking-normal font-semibold"
            >
              {t('common.cancel')}
            </Button>
            <Button
              variant="primary"
              onClick={() => {
                if (!newName.trim()) return
                createChannel.mutate({
                  name: newName.trim(),
                  type: newType,
                  isPrivate: newIsPrivate,
                })
              }}
              disabled={!newName.trim() || createChannel.isPending}
              loading={createChannel.isPending}
              className="normal-case tracking-normal font-semibold"
            >
              {t('common.create')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Server edit dialog */}
      <Dialog isOpen={showServerEdit} onClose={() => setShowServerEdit(false)}>
        <DialogContent className="max-w-[520px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t('channel.serverSettings')}</DialogTitle>
          </DialogHeader>

          {/* Tab Navigation */}
          <div className="flex gap-1 bg-white/5 rounded-xl p-1 border border-white/5">
            <button
              onClick={() => setServerEditTab('basic')}
              className={cn(
                'flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all',
                serverEditTab === 'basic'
                  ? 'bg-primary/15 text-primary shadow-sm'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              <ImageIcon size={16} />
              基础设置
            </button>
            <button
              onClick={() => setServerEditTab('advanced')}
              className={cn(
                'flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all',
                serverEditTab === 'advanced'
                  ? 'bg-primary/15 text-primary shadow-sm'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              <Settings size={16} />
              进阶设置
            </button>
          </div>

          {/* Basic Settings Tab */}
          {serverEditTab === 'basic' && (
            <div className="space-y-5">
              {/* Hero Section - Banner + Icon */}
              <div className="relative">
                {/* Banner upload - show draft state */}
                <div className="relative h-32 bg-gradient-to-br from-primary/20 to-primary/5 rounded-xl overflow-hidden group/banner border border-white/5">
                  {serverFormDraft.bannerUrl && (
                    <img
                      src={serverFormDraft.bannerUrl}
                      alt=""
                      className="w-full h-full object-cover absolute inset-0"
                    />
                  )}
                  <label className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover/banner:opacity-100 transition cursor-pointer">
                    <span className="text-white text-sm font-medium flex items-center gap-2">
                      {bannerUploading ? (
                        <span className="animate-pulse">{t('common.loading')}</span>
                      ) : (
                        <>
                          <ImageIcon size={16} />
                          {serverFormDraft.bannerUrl ? '更换横幅' : '添加横幅'}
                        </>
                      )}
                    </span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleBannerUpload}
                      className="hidden"
                      disabled={bannerUploading}
                    />
                  </label>
                </div>

                {/* Server icon upload */}
                <div className="absolute -bottom-6 left-6">
                  <div className="relative w-20 h-20 rounded-2xl overflow-hidden bg-white/5 border-4 border-[rgba(20,20,30,0.85)] shadow-lg group/icon">
                    {serverFormDraft.iconUrl ? (
                      <img
                        src={serverFormDraft.iconUrl}
                        alt=""
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-3xl font-bold text-muted-foreground">
                        {serverFormDraft.name?.[0]?.toUpperCase() ?? '?'}
                      </div>
                    )}
                    <label className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 group-hover/icon:opacity-100 transition cursor-pointer">
                      <span className="text-white text-xs font-medium">
                        {iconUploading ? '...' : <ImageIcon size={14} />}
                      </span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleIconUpload}
                        className="hidden"
                        disabled={iconUploading}
                      />
                    </label>
                  </div>
                </div>
              </div>

              {/* Server name */}
              <div className="mt-8">
                <Input
                  label={t('channel.editServerName')}
                  value={serverFormDraft.name}
                  onChange={(e) => updateDraftField('name', e.target.value)}
                  placeholder="输入服务器名称"
                  className="!rounded-xl !py-3"
                />
              </div>

              {/* Server description */}
              <div>
                <label className="block text-[11px] font-black uppercase text-muted-foreground tracking-[0.2em] ml-1 mb-2">
                  {t('channel.editServerDescription')}
                </label>
                <textarea
                  value={serverFormDraft.description}
                  onChange={(e) => updateDraftField('description', e.target.value)}
                  rows={3}
                  placeholder={t('channel.descriptionPlaceholder')}
                  className="w-full bg-black/20 text-foreground rounded-xl px-4 py-3 outline-none border-2 border-white/10 focus:border-primary focus:shadow-[0_0_0_5px_rgba(0,198,209,0.1)] transition-all resize-none text-sm"
                />
              </div>

              {/* Public toggle */}
              <div className="bg-white/5 rounded-xl p-4 border border-white/5">
                <label className="flex items-center justify-between cursor-pointer">
                  <div>
                    <span className="text-sm font-semibold text-foreground">
                      {t('channel.publicServer')}
                    </span>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {t('channel.publicServerDesc')}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => updateDraftField('isPublic', !serverFormDraft.isPublic)}
                    className={cn(
                      'relative w-11 h-6 rounded-full transition-colors',
                      serverFormDraft.isPublic ? 'bg-primary' : 'bg-white/10',
                    )}
                  >
                    <span
                      className={cn(
                        'absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform shadow-sm',
                        serverFormDraft.isPublic && 'translate-x-5',
                      )}
                    />
                  </button>
                </label>
              </div>
            </div>
          )}

          {/* Advanced Settings Tab */}
          {serverEditTab === 'advanced' && (
            <div className="space-y-5">
              {/* Server slug */}
              <div>
                <Input
                  label={t('channel.serverSlug')}
                  value={serverFormDraft.slug}
                  onChange={(e) => updateDraftField('slug', e.target.value)}
                  placeholder={t('channel.slugPlaceholder')}
                  className="!rounded-xl !py-3 font-mono text-sm"
                />
                <p className="text-xs text-muted-foreground mt-1 ml-1">{t('channel.slugDesc')}</p>
              </div>

              {/* Homepage HTML */}
              <div>
                <label className="block text-[11px] font-black uppercase text-muted-foreground tracking-[0.2em] ml-1 mb-2">
                  {t('channel.homepageHtml')}
                </label>
                <textarea
                  value={serverFormDraft.homepageHtml}
                  onChange={(e) => updateDraftField('homepageHtml', e.target.value)}
                  rows={8}
                  placeholder={t('channel.homepageHtmlPlaceholder')}
                  className="w-full bg-black/20 text-foreground rounded-xl px-4 py-3 outline-none border-2 border-white/10 focus:border-primary focus:shadow-[0_0_0_5px_rgba(0,198,209,0.1)] transition-all resize-y font-mono text-xs"
                />
                <p className="text-xs text-muted-foreground mt-1 ml-1">
                  {t('channel.homepageHtmlDesc')}
                </p>
              </div>

              {/* Invite Link */}
              {server?.inviteCode && (
                <div className="bg-white/5 rounded-xl p-4 border border-white/5">
                  <label className="block text-[11px] font-black uppercase text-muted-foreground tracking-[0.2em] ml-1 mb-2">
                    {t('channel.inviteLink')}
                  </label>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 bg-black/20 text-foreground rounded-xl px-4 py-3 font-mono text-xs truncate border border-white/5">
                      {`${window.location.origin}/app/invite/${server.inviteCode}`}
                    </code>
                    <Button
                      variant="glass"
                      size="xs"
                      onClick={copyInviteCode}
                      title={t('channel.copyInviteCode')}
                      className="h-10 w-10 p-0"
                    >
                      {copiedInvite ? (
                        <Check size={16} className="text-emerald-400" />
                      ) : (
                        <Copy size={16} />
                      )}
                    </Button>
                  </div>
                </div>
              )}

              {/* Server ID */}
              <div className="bg-white/5 rounded-xl p-4 border border-white/5">
                <label className="block text-[11px] font-black uppercase text-muted-foreground tracking-[0.2em] ml-1 mb-2">
                  服务器 ID
                </label>
                <code className="text-muted-foreground text-xs font-mono">{server?.id}</code>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex justify-between gap-3 pt-4 border-t border-white/5">
            <div>
              {_currentUser?.id === server?.ownerId && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={async () => {
                    const ok = await useConfirmStore.getState().confirm({
                      title: t('channel.deleteServer'),
                      message: t('channel.deleteServerConfirm'),
                    })
                    if (ok) {
                      deleteServer.mutate()
                    }
                  }}
                  disabled={deleteServer.isPending}
                  className="text-danger hover:bg-danger/10 normal-case tracking-normal font-semibold"
                >
                  <Trash2 size={14} />
                  {t('channel.deleteServer')}
                </Button>
              )}
            </div>
            <div className="flex items-center gap-3">
              {/* Unsaved changes indicator */}
              {hasDraftChanges() && !updateServer.isPending && (
                <span className="text-xs text-amber-400">有未保存的更改</span>
              )}
              {updateServer.isPending && (
                <span className="text-xs text-muted-foreground animate-pulse">保存中...</span>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={discardChanges}
                disabled={updateServer.isPending}
                className="normal-case tracking-normal font-semibold"
              >
                {t('common.cancel')}
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={saveServerChanges}
                disabled={
                  !serverFormDraft.name.trim() || updateServer.isPending || !hasDraftChanges()
                }
                loading={updateServer.isPending}
                icon={Save}
                className="normal-case tracking-normal font-semibold"
              >
                {updateServer.isPending ? t('common.saving') : t('common.save')}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Channel context menu */}
      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          onClose={() => setContextMenu(null)}
          groups={[
            {
              items: [
                {
                  icon: UserPlus,
                  label: t('channel.inviteMember'),
                  onClick: () => {
                    setInviteTargetChannel(contextMenu.channel)
                    setInviteInitialTab('members')
                    setShowInvitePanel(true)
                  },
                },
                {
                  icon: PawPrint,
                  label: t('channel.addAgent'),
                  onClick: () => {
                    setInviteTargetChannel(contextMenu.channel)
                    setInviteInitialTab('buddies')
                    setShowInvitePanel(true)
                  },
                },
              ],
            },
            {
              items: [
                {
                  icon: Volume2,
                  label: (notificationPreference?.mutedChannelIds ?? []).includes(
                    contextMenu.channel.id,
                  )
                    ? '取消静音频道'
                    : '静音频道通知',
                  onClick: () => {
                    const current = notificationPreference?.mutedChannelIds ?? []
                    const isMuted = current.includes(contextMenu.channel.id)
                    const next = isMuted
                      ? current.filter((id) => id !== contextMenu.channel.id)
                      : [...current, contextMenu.channel.id]
                    updateNotificationPreference.mutate({ mutedChannelIds: next })
                  },
                },
              ],
            },
            {
              items: [
                {
                  icon: Edit3,
                  label: t('channel.editChannel'),
                  onClick: () => {
                    setEditingChannel(contextMenu.channel)
                    setEditChannelName(contextMenu.channel.name)
                  },
                },
                {
                  icon: Lock,
                  label: contextMenu.channel.isPrivate ? '设为公开频道' : '设为私有频道',
                  onClick: () => {
                    updateChannel.mutate({
                      channelId: contextMenu.channel.id,
                      name: contextMenu.channel.name,
                      isPrivate: !contextMenu.channel.isPrivate,
                    })
                  },
                },
                {
                  icon: Copy,
                  label: t('channel.copyChannelLink'),
                  onClick: () => {
                    const slug = server?.slug ?? serverSlug
                    const channelLink = `${window.location.origin}/app/servers/${slug}/channels/${contextMenu.channel.id}`
                    navigator.clipboard.writeText(channelLink)
                  },
                },
              ],
            },
            {
              items: [
                {
                  icon: Archive,
                  label: contextMenu.channel.isArchived
                    ? t('channel.unarchiveChannel', { defaultValue: '取消归档' })
                    : t('channel.archiveChannel', { defaultValue: '归档频道' }),
                  onClick: async () => {
                    if (contextMenu.channel.isArchived) {
                      const ok = await useConfirmStore.getState().confirm({
                        title: t('channel.unarchiveChannel', { defaultValue: '取消归档' }),
                        message: t('channel.unarchiveChannelConfirm', {
                          defaultValue: '确定要取消归档此频道吗？',
                        }),
                      })
                      if (ok) {
                        unarchiveChannel.mutate(contextMenu.channel.id)
                      }
                    } else {
                      const ok = await useConfirmStore.getState().confirm({
                        title: t('channel.archiveChannel', { defaultValue: '归档频道' }),
                        message: t('channel.archiveChannelConfirm', {
                          defaultValue: '确定要归档此频道吗？归档后频道将变为只读。',
                        }),
                      })
                      if (ok) {
                        archiveChannel.mutate(contextMenu.channel.id)
                      }
                    }
                  },
                },
                {
                  icon: Trash2,
                  label: t('channel.deleteChannel'),
                  danger: true,
                  onClick: async () => {
                    const ok = await useConfirmStore.getState().confirm({
                      title: t('channel.deleteChannel'),
                      message: t('channel.deleteChannelConfirm'),
                    })
                    if (ok) {
                      deleteChannel.mutate(contextMenu.channel.id)
                    }
                  },
                },
              ],
            },
          ]}
        />
      )}

      {/* Blank area context menu */}
      {blankContextMenu && (
        <ContextMenu
          x={blankContextMenu.x}
          y={blankContextMenu.y}
          onClose={() => setBlankContextMenu(null)}
          groups={[
            {
              items: [
                {
                  icon: Plus,
                  label: t('channel.createChannel'),
                  onClick: () => setShowCreate(true),
                },
                {
                  icon: UserPlus,
                  label: t('channel.inviteMember'),
                  onClick: () => {
                    setInviteTargetChannel(null)
                    setInviteInitialTab('members')
                    setShowInvitePanel(true)
                  },
                },
                {
                  icon: PawPrint,
                  label: t('channel.addAgent'),
                  onClick: () => {
                    setInviteTargetChannel(null)
                    setInviteInitialTab('buddies')
                    setShowInvitePanel(true)
                  },
                },
              ],
            },
            {
              items: [
                {
                  icon: Volume2,
                  label: (notificationPreference?.mutedServerIds ?? []).includes(server?.id ?? '')
                    ? '取消静音服务器'
                    : '静音服务器通知',
                  onClick: () => {
                    if (!server?.id) return
                    const current = notificationPreference?.mutedServerIds ?? []
                    const isMuted = current.includes(server.id)
                    const next = isMuted
                      ? current.filter((id) => id !== server.id)
                      : [...current, server.id]
                    updateNotificationPreference.mutate({ mutedServerIds: next })
                  },
                },
                {
                  icon: Settings,
                  label: t('channel.serverSettings'),
                  onClick: openServerEdit,
                },
              ],
            },
          ]}
        />
      )}

      {/* Invite Panel */}
      {showInvitePanel && server?.inviteCode && (
        <InvitePanel
          serverId={serverSlug}
          channelId={inviteTargetChannel?.id}
          channelName={inviteTargetChannel?.name}
          initialTab={inviteInitialTab}
          onClose={() => {
            setShowInvitePanel(false)
            setInviteTargetChannel(null)
          }}
        />
      )}
    </div>
  )
}
