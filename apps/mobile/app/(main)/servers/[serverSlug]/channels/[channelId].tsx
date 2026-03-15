import { FlashList } from '@shopify/flash-list'
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import * as DocumentPicker from 'expo-document-picker'
import * as ImagePicker from 'expo-image-picker'
import { useLocalSearchParams, useNavigation, useRouter } from 'expo-router'
import {
  ArrowUp,
  ChevronDown,
  Hash,
  Paperclip,
  Search,
  Smile,
  UserPlus,
  Users,
  X,
} from 'lucide-react-native'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  ActivityIndicator,
  Alert,
  Animated,
  FlatList,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import type { EmojiType } from 'rn-emoji-keyboard'
import EmojiPicker from 'rn-emoji-keyboard'
import { MessageBubble } from '../../../../../src/components/chat/message-bubble'
import { Avatar } from '../../../../../src/components/common/avatar'
import { HeaderButton, HeaderButtonGroup } from '../../../../../src/components/common/header-button'
import { StatusBadge } from '../../../../../src/components/common/status-badge'
import { useSocketEvent } from '../../../../../src/hooks/use-socket'
import { fetchApi } from '../../../../../src/lib/api'
import { setLastChannel } from '../../../../../src/lib/last-channel'
import { getSocket, leaveChannel, sendTyping, sendWsMessage } from '../../../../../src/lib/socket'
import { playReceiveSound, playSendSound } from '../../../../../src/lib/sounds'
import { useAuthStore } from '../../../../../src/stores/auth.store'
import { useChatStore } from '../../../../../src/stores/chat.store'
import { fontSize, radius, spacing, useColors } from '../../../../../src/theme'
import type {
  Channel,
  MemberEvent,
  Message,
  MessagesPage,
  SystemEvent,
  TimelineItem,
} from '../../../../../src/types/message'
import { normalizeMessage } from '../../../../../src/types/message'

const PAGE_SIZE = 50

function TypingDots() {
  const colors = useColors()
  const anims = useRef([
    new Animated.Value(0),
    new Animated.Value(0),
    new Animated.Value(0),
  ]).current
  useEffect(() => {
    const animations = anims.map((anim, i) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(i * 150),
          Animated.timing(anim, { toValue: 1, duration: 300, useNativeDriver: true }),
          Animated.timing(anim, { toValue: 0, duration: 300, useNativeDriver: true }),
        ]),
      ),
    )
    for (const a of animations) a.start()
    return () => {
      for (const a of animations) a.stop()
    }
  }, [anims])
  return (
    <View style={styles.typingDots}>
      {anims.map((anim, i) => (
        <Animated.View
          key={['dot-a', 'dot-b', 'dot-c'][i]}
          style={[
            styles.typingDot,
            {
              backgroundColor: colors.textMuted,
              transform: [
                { translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [0, -3] }) },
              ],
            },
          ]}
        />
      ))}
    </View>
  )
}

export default function ChannelViewScreen() {
  const { channelId } = useLocalSearchParams<{
    serverSlug: string
    channelId: string
  }>()
  const { t } = useTranslation()
  const colors = useColors()
  const navigation = useNavigation()
  const router = useRouter()
  const queryClient = useQueryClient()
  const flatListRef = useRef<FlashList<TimelineItem>>(null)
  const scrollOffsetRef = useRef<Record<string, number>>({})
  const setActiveChannel = useChatStore((s) => s.setActiveChannel)
  const currentUser = useAuthStore((s) => s.user)
  const insets = useSafeAreaInsets()

  const [inputText, setInputText] = useState('')
  const [replyTo, setReplyTo] = useState<Message | null>(null)
  const [sending, setSending] = useState(false)
  const [typingUsers, setTypingUsers] = useState<string[]>([])
  const [systemEvents, setSystemEvents] = useState<SystemEvent[]>([])
  const [activityUsers, setActivityUsers] = useState<
    { userId: string; username: string; activity: string }[]
  >([])
  const [pendingFiles, setPendingFiles] = useState<
    Array<{ uri: string; name: string; type: string; size?: number }>
  >([])
  const [showScrollBottom, setShowScrollBottom] = useState(false)
  const [showInputEmojiPicker, setShowInputEmojiPicker] = useState(false)
  const [showMemberList, setShowMemberList] = useState(false)
  const [showInvitePanel, setShowInvitePanel] = useState(false)
  const [inviteSearch, setInviteSearch] = useState('')
  const [mentionQuery, setMentionQuery] = useState<string | null>(null)
  const inputRef = useRef<TextInput>(null)

  const typingTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)
  const typingUsersTimeout = useRef<Record<string, ReturnType<typeof setTimeout>>>({})

  // ---------- Channel info ----------
  const { data: channel } = useQuery({
    queryKey: ['channel', channelId],
    queryFn: () => fetchApi<Channel>(`/api/channels/${channelId}`),
    enabled: !!channelId,
  })

  // ---------- Channel members ----------
  interface ChannelMember {
    id: string
    userId: string
    role: 'owner' | 'admin' | 'member'
    user: {
      id: string
      username: string
      displayName: string | null
      avatarUrl: string | null
      status?: string
      isBot?: boolean
    }
  }

  const { data: channelMembers = [] } = useQuery({
    queryKey: ['channel-members', channelId],
    queryFn: () => fetchApi<ChannelMember[]>(`/api/channels/${channelId}/members`),
    enabled: !!channelId,
  })

  // Server members for invite panel
  interface ServerMemberEntry {
    user: {
      id: string
      username: string
      displayName: string | null
      avatarUrl: string | null
      isBot?: boolean
    }
    role: string
  }

  const { data: serverMemberData } = useQuery({
    queryKey: ['server-members-for-invite', channel?.serverId],
    queryFn: async () => {
      const res = await fetchApi<{ members: ServerMemberEntry[] } | ServerMemberEntry[]>(
        `/api/servers/${channel!.serverId}/members`,
      )
      return Array.isArray(res) ? res : (res.members ?? [])
    },
    enabled: !!channel?.serverId && showInvitePanel,
  })

  const invitableMembers = useMemo(() => {
    const serverMembers = serverMemberData ?? []
    const channelUserIds = new Set(channelMembers.map((m) => m.userId))
    const q = inviteSearch.toLowerCase()
    return serverMembers
      .filter((m) => !channelUserIds.has(m.user.id))
      .filter((m) => {
        if (!q) return true
        const name = (m.user.displayName || m.user.username).toLowerCase()
        return name.includes(q) || m.user.username.toLowerCase().includes(q)
      })
  }, [serverMemberData, channelMembers, inviteSearch])

  const inviteMemberMutation = useMutation({
    mutationFn: (userId: string) =>
      fetchApi(`/api/channels/${channelId}/members`, {
        method: 'POST',
        body: JSON.stringify({ userId }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['channel-members', channelId] })
    },
  })

  // @mention autocomplete: filter members based on current mention query
  const mentionResults = useMemo(() => {
    if (mentionQuery === null) return []
    const q = mentionQuery.toLowerCase()
    return channelMembers
      .filter((m) => {
        const name = (m.user.displayName || m.user.username).toLowerCase()
        const uname = m.user.username.toLowerCase()
        return uname.startsWith(q) || name.includes(q) || uname.includes(q)
      })
      .sort((a, b) => {
        // Prioritize bots, then startsWith matches, then includes
        const aName = a.user.username.toLowerCase()
        const bName = b.user.username.toLowerCase()
        const aBot = a.user.isBot ? -500 : 0
        const bBot = b.user.isBot ? -500 : 0
        const aStart = aName.startsWith(q) ? -100 : 0
        const bStart = bName.startsWith(q) ? -100 : 0
        return aBot + aStart - (bBot + bStart)
      })
      .slice(0, 8)
  }, [mentionQuery, channelMembers])

  useEffect(() => {
    if (channel) {
      navigation.setOptions({
        title: `# ${channel.name}`,
        headerRight: () => (
          <HeaderButtonGroup>
            <HeaderButton icon={Users} onPress={() => setShowMemberList(true)} />
          </HeaderButtonGroup>
        ),
      })
      setActiveChannel(channel.id)
      void setLastChannel(channel.serverId, channel.id)
    }
    return () => setActiveChannel(null)
  }, [channel, navigation, setActiveChannel])

  // ---------- Infinite scroll messages ----------
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading, refetch } =
    useInfiniteQuery({
      queryKey: ['messages', channelId],
      queryFn: async ({ pageParam }) => {
        const params = new URLSearchParams({ limit: String(PAGE_SIZE) })
        if (pageParam) params.set('cursor', pageParam as string)
        const result = await fetchApi<MessagesPage | Message[]>(
          `/api/channels/${channelId}/messages?${params}`,
        )
        if (Array.isArray(result)) {
          return {
            messages: result.map((m) => normalizeMessage(m as unknown as Record<string, unknown>)),
            hasMore: result.length >= PAGE_SIZE,
          }
        }
        return {
          messages: result.messages.map((m) =>
            normalizeMessage(m as unknown as Record<string, unknown>),
          ),
          hasMore: result.hasMore,
        }
      },
      initialPageParam: null as string | null,
      getNextPageParam: (lastPage) => {
        if (!lastPage.hasMore || lastPage.messages.length === 0) return undefined
        return lastPage.messages[0]?.createdAt
      },
      enabled: !!channelId,
    })

  const messages = useMemo(() => {
    if (!data) return []
    // Reverse page order so older pages come first, then reverse all for newest-first (inverted list)
    return [...data.pages]
      .reverse()
      .flatMap((p) => p.messages)
      .reverse()
  }, [data])

  // ---------- Timeline with system events + date separators (inverted: newest first) ----------
  const timeline = useMemo<TimelineItem[]>(() => {
    // Messages are already newest-first
    const items: TimelineItem[] = messages.map((m) => ({ kind: 'message' as const, data: m }))

    // Insert system events at the correct position (also newest first)
    for (const evt of [...systemEvents].reverse()) {
      let insertIdx = 0
      for (let i = 0; i < items.length; i++) {
        const item = items[i]!
        const itemTime =
          item.kind === 'message'
            ? new Date(item.data.createdAt).getTime()
            : item.kind === 'system'
              ? item.data.timestamp
              : 0
        if (itemTime <= evt.timestamp) {
          insertIdx = i
          break
        }
        insertIdx = i + 1
      }
      items.splice(insertIdx, 0, { kind: 'system', data: evt })
    }

    // Date separators — insert between messages from different calendar days
    // In inverted mode, a date separator goes AFTER (higher index = older) the last message of that day
    const withDates: TimelineItem[] = []
    let lastDateStr = ''
    for (let i = 0; i < items.length; i++) {
      const item = items[i]!
      withDates.push(item)
      if (item.kind === 'message') {
        const d = new Date(item.data.createdAt)
        const dateStr = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`
        if (dateStr !== lastDateStr) {
          lastDateStr = dateStr
          // Check if the next message is from a different day
          const next = items[i + 1]
          const nextDateStr =
            next?.kind === 'message'
              ? (() => {
                  const nd = new Date(next.data.createdAt)
                  return `${nd.getFullYear()}-${nd.getMonth()}-${nd.getDate()}`
                })()
              : null
          if (nextDateStr && nextDateStr !== dateStr) {
            // Insert date separator for the current day
            withDates.push({
              kind: 'date',
              data: {
                id: `date-${dateStr}`,
                date: d.toLocaleDateString(undefined, {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                }),
              },
            })
          }
        }
      }
    }

    // Add a date separator for the oldest day at the end (top of chat visually)
    if (items.length > 0) {
      const oldest = items[items.length - 1]
      if (oldest?.kind === 'message') {
        const d = new Date(oldest.data.createdAt)
        const dateStr = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`
        const lastItem = withDates[withDates.length - 1]
        if (lastItem?.kind !== 'date') {
          withDates.push({
            kind: 'date',
            data: {
              id: `date-${dateStr}`,
              date: d.toLocaleDateString(undefined, {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              }),
            },
          })
        }
      }
    }

    return withDates
  }, [messages, systemEvents])

  // Reset scroll position when channel changes
  // biome-ignore lint/correctness/useExhaustiveDependencies: channelId is intentionally the trigger
  useEffect(() => {
    flatListRef.current?.scrollToOffset({ offset: 0, animated: false })
  }, [channelId])

  // ---------- WebSocket: join/leave ----------
  const joinChannelWithAck = useCallback(
    (chId: string) => {
      const socket = getSocket()
      socket.emit('channel:join', { channelId: chId }, (res: { ok: boolean }) => {
        if (!res?.ok) {
          // Channel join denied — possibly not a channel member, refetch to stay in sync
          refetch()
        }
      })
    },
    [refetch],
  )

  useEffect(() => {
    if (channelId) {
      joinChannelWithAck(channelId)
      return () => {
        leaveChannel(channelId)
      }
    }
  }, [channelId, joinChannelWithAck])

  // Reconnection: refetch on reconnect
  useEffect(() => {
    const socket = getSocket()
    const onReconnect = () => {
      if (channelId) {
        joinChannelWithAck(channelId)
        refetch()
      }
    }
    socket.on('connect', onReconnect)
    return () => {
      socket.off('connect', onReconnect)
    }
  }, [channelId, joinChannelWithAck, refetch])

  // Listen for socket errors (e.g. message:send denied by server)
  useEffect(() => {
    const socket = getSocket()
    const onError = (err: { message?: string }) => {
      if (err?.message) {
        Alert.alert(t('common.error'), err.message)
      }
    }
    socket.on('error', onError)
    return () => {
      socket.off('error', onError)
    }
  }, [t])

  // ---------- Socket events ----------
  type InfiniteData = typeof data

  const appendMessage = useCallback(
    (raw: Record<string, unknown>) => {
      if ((raw.channelId as string) !== channelId) return
      const msg = normalizeMessage(raw)

      // Play receive sound for messages from others
      if (msg.authorId !== currentUser?.id) {
        playReceiveSound()
      }

      queryClient.setQueryData<InfiniteData>(['messages', channelId], (old) => {
        if (!old) return old
        const firstPage = old.pages[0]
        if (!firstPage) return old
        // Deduplicate: if message already exists, update it
        if (firstPage.messages.some((m) => m.id === msg.id)) {
          return {
            ...old,
            pages: old.pages.map((page) => ({
              ...page,
              messages: page.messages.map((m) => (m.id === msg.id ? msg : m)),
            })),
          }
        }
        // Append new message to the first page (messages are oldest-first within page)
        return {
          ...old,
          pages: [{ ...firstPage, messages: [...firstPage.messages, msg] }, ...old.pages.slice(1)],
        }
      })
      // Scroll to newest (offset 0 in inverted list)
      // Use requestAnimationFrame + setTimeout to ensure the VirtualizedList has processed the new data
      requestAnimationFrame(() => {
        setTimeout(() => {
          flatListRef.current?.scrollToOffset({ offset: 0, animated: true })
        }, 150)
      })
    },
    [channelId, queryClient, currentUser?.id],
  )

  useSocketEvent('message:new', appendMessage)
  useSocketEvent('message:created', appendMessage)

  useSocketEvent(
    'message:updated',
    useCallback(
      (raw: Record<string, unknown>) => {
        if ((raw.channelId as string) !== channelId) return
        const msg = normalizeMessage(raw)
        queryClient.setQueryData<InfiniteData>(['messages', channelId], (old) => {
          if (!old) return old
          return {
            ...old,
            pages: old.pages.map((page) => ({
              ...page,
              messages: page.messages.map((m) => (m.id === msg.id ? { ...m, ...msg } : m)),
            })),
          }
        })
      },
      [channelId, queryClient],
    ),
  )

  useSocketEvent(
    'message:deleted',
    useCallback(
      ({ id }: { id: string }) => {
        queryClient.setQueryData<InfiniteData>(['messages', channelId], (old) => {
          if (!old) return old
          return {
            ...old,
            pages: old.pages.map((page) => ({
              ...page,
              messages: page.messages.filter((m) => m.id !== id),
            })),
          }
        })
      },
      [channelId, queryClient],
    ),
  )

  // Reaction updates
  useSocketEvent(
    'reaction:updated',
    useCallback(
      (payload: {
        messageId: string
        channelId: string
        reactions: Array<{ emoji: string; count: number; userIds: string[] }>
      }) => {
        if (payload.channelId !== channelId) return
        queryClient.setQueryData<InfiniteData>(['messages', channelId], (old) => {
          if (!old) return old
          return {
            ...old,
            pages: old.pages.map((page) => ({
              ...page,
              messages: page.messages.map((m) =>
                m.id === payload.messageId ? { ...m, reactions: payload.reactions } : m,
              ),
            })),
          }
        })
      },
      [channelId, queryClient],
    ),
  )

  // Typing indicator
  useSocketEvent(
    'message:typing',
    useCallback(
      ({
        channelId: typingChannelId,
        userId,
        username,
      }: {
        channelId: string
        userId: string
        username: string
      }) => {
        if (typingChannelId !== channelId || !userId) return
        if (userId === currentUser?.id) return
        setTypingUsers((prev) => (prev.includes(username) ? prev : [...prev, username]))
        if (typingUsersTimeout.current[userId]) clearTimeout(typingUsersTimeout.current[userId])
        typingUsersTimeout.current[userId] = setTimeout(() => {
          setTypingUsers((prev) => prev.filter((n) => n !== username))
          delete typingUsersTimeout.current[userId]
        }, 3000)
      },
      [channelId, currentUser?.id],
    ),
  )

  // Member join/leave system events
  useSocketEvent(
    'member:joined',
    useCallback(
      (evt: MemberEvent) => {
        if (evt.channelId && evt.channelId !== channelId) return
        setSystemEvents((prev) => [
          ...prev,
          {
            id: `join-${evt.userId}-${Date.now()}`,
            type: 'joined',
            scope: evt.channelId ? 'channel' : 'server',
            displayName: evt.displayName || evt.username,
            isBot: evt.isBot,
            timestamp: Date.now(),
          },
        ])
      },
      [channelId],
    ),
  )

  useSocketEvent(
    'member:left',
    useCallback(
      (evt: MemberEvent) => {
        if (evt.channelId && evt.channelId !== channelId) return
        setSystemEvents((prev) => [
          ...prev,
          {
            id: `left-${evt.userId}-${Date.now()}`,
            type: 'left',
            scope: evt.channelId ? 'channel' : 'server',
            displayName: evt.displayName || evt.username,
            isBot: evt.isBot,
            timestamp: Date.now(),
          },
        ])
      },
      [channelId],
    ),
  )

  // Agent activity
  useSocketEvent(
    'presence:activity',
    useCallback(
      (payload: {
        userId: string
        channelId: string
        activity: string | null
        username?: string
      }) => {
        if (payload.channelId !== channelId) return
        setActivityUsers((prev) => {
          if (!payload.activity) return prev.filter((u) => u.userId !== payload.userId)
          const existing = prev.find((u) => u.userId === payload.userId)
          if (existing)
            return prev.map((u) =>
              u.userId === payload.userId ? { ...u, activity: payload.activity! } : u,
            )
          return [
            ...prev,
            {
              userId: payload.userId,
              username: payload.username ?? 'Buddy',
              activity: payload.activity,
            },
          ]
        })
      },
      [channelId],
    ),
  )

  useEffect(() => {
    return () => {
      Object.values(typingUsersTimeout.current).forEach(clearTimeout)
      if (typingTimeout.current) clearTimeout(typingTimeout.current)
    }
  }, [])

  // ---------- File attachments ----------
  const handlePickFile = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        multiple: true,
        copyToCacheDirectory: true,
      })
      if (result.canceled || !result.assets) return
      setPendingFiles((prev) => [
        ...prev,
        ...result.assets.map((a) => ({
          uri: a.uri,
          name: a.name,
          type: a.mimeType ?? 'application/octet-stream',
          size: a.size,
        })),
      ])
    } catch {
      /* cancelled */
    }
  }

  const handlePickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images', 'videos'],
        allowsMultipleSelection: true,
        quality: 0.8,
      })
      if (result.canceled || !result.assets) return
      setPendingFiles((prev) => [
        ...prev,
        ...result.assets.map((a) => ({
          uri: a.uri,
          name: a.fileName ?? `image_${Date.now()}.jpg`,
          type: a.mimeType ?? 'image/jpeg',
          size: a.fileSize,
        })),
      ])
    } catch {
      /* cancelled */
    }
  }

  const removePendingFile = (index: number) => {
    setPendingFiles((prev) => prev.filter((_, i) => i !== index))
  }

  // ---------- Send message ----------
  const handleSend = async () => {
    const content = inputText.trim()
    if (!content && pendingFiles.length === 0) return
    if (sending) return
    setSending(true)
    try {
      let uploadedAttachments:
        | Array<{ url: string; filename: string; contentType: string; size: number }>
        | undefined
      if (pendingFiles.length > 0) {
        uploadedAttachments = []
        for (const file of pendingFiles) {
          const formData = new FormData()
          // biome-ignore lint/suspicious/noExplicitAny: React Native FormData requires this shape
          formData.append('file', { uri: file.uri, name: file.name, type: file.type } as any)
          const uploaded = await fetchApi<{ url: string; size: number }>('/api/media/upload', {
            method: 'POST',
            body: formData,
            headers: {},
          })
          uploadedAttachments.push({
            url: uploaded.url,
            filename: file.name,
            contentType: file.type,
            size: uploaded.size,
          })
        }
      }

      // Try WebSocket for text-only messages, fall back to REST
      const sock = getSocket()
      if (!uploadedAttachments && sock.connected) {
        sendWsMessage({ channelId: channelId!, content, replyToId: replyTo?.id })
      } else {
        // Use REST API — always works and returns the created message
        const created = await fetchApi<Record<string, unknown>>(
          `/api/channels/${channelId}/messages`,
          {
            method: 'POST',
            body: JSON.stringify({
              content: content || '\u200B',
              replyToId: replyTo?.id,
              ...(uploadedAttachments ? { attachments: uploadedAttachments } : {}),
            }),
          },
        )
        // Add the created message to cache immediately for instant feedback
        appendMessage(created)
      }

      setInputText('')
      setReplyTo(null)
      setPendingFiles([])
      playSendSound()
    } catch (err) {
      Alert.alert(t('common.error'), (err as Error).message || t('chat.sendFailed'))
    } finally {
      setSending(false)
    }
  }

  const handleTyping = useCallback(() => {
    if (!channelId) return
    if (typingTimeout.current) return
    sendTyping(channelId)
    typingTimeout.current = setTimeout(() => {
      typingTimeout.current = null
    }, 3000)
  }, [channelId])

  // @mention detection on input text change
  const handleTextChange = useCallback(
    (text: string) => {
      setInputText(text)
      handleTyping()
      // Detect @mention query
      const match = text.match(/(?:^|\s)@([^\s@]{0,32})$/u)
      setMentionQuery(match ? match[1]! : null)
    },
    [handleTyping],
  )

  // Insert @mention into input
  const insertMention = useCallback((username: string) => {
    setInputText((prev) => {
      const replaced = prev.replace(/(?:^|\s)@([^\s@]{0,32})$/u, (m) => {
        const prefix = m.startsWith(' ') ? ' ' : ''
        return `${prefix}@${username} `
      })
      return replaced
    })
    setMentionQuery(null)
    inputRef.current?.focus()
  }, [])

  const handleReply = useCallback((msg: Message) => {
    setReplyTo(msg)
  }, [])

  const handleLoadMore = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) fetchNextPage()
  }, [hasNextPage, isFetchingNextPage, fetchNextPage])

  // ---------- Render ----------
  const renderTimelineItem = useCallback(
    ({ item, index }: { item: TimelineItem; index: number }) => {
      if (item.kind === 'system') {
        const evt = item.data
        return (
          <View style={styles.systemEvent}>
            <View style={[styles.systemEventLine, { backgroundColor: colors.border }]} />
            <Text style={[styles.systemEventText, { color: colors.textMuted }]}>
              {evt.type === 'joined' ? '→' : '←'} {evt.displayName}{' '}
              {t(evt.type === 'joined' ? 'chat.memberJoined' : 'chat.memberLeft')}
            </Text>
            <View style={[styles.systemEventLine, { backgroundColor: colors.border }]} />
          </View>
        )
      }
      if (item.kind === 'divider') {
        return (
          <View style={styles.newMessageDivider}>
            <View style={[styles.dividerLine, { backgroundColor: colors.error }]} />
            <Text style={[styles.dividerText, { color: colors.error }]}>
              {t('chat.newMessages')}
            </Text>
            <View style={[styles.dividerLine, { backgroundColor: colors.error }]} />
          </View>
        )
      }
      if (item.kind === 'date') {
        return (
          <View style={styles.dateSeparator}>
            <View style={[styles.dateLine, { backgroundColor: colors.border }]} />
            <Text style={[styles.dateText, { color: colors.textMuted }]}>{item.data.date}</Text>
            <View style={[styles.dateLine, { backgroundColor: colors.border }]} />
          </View>
        )
      }
      // Message grouping: in inverted list, the visually "previous" message is at index + 1
      let isGrouped = false
      const prev = index < timeline.length - 1 ? timeline[index + 1] : null
      if (prev?.kind === 'message' && !item.data.replyToId) {
        const sameAuthor = prev.data.authorId === item.data.authorId
        const timeDiff =
          new Date(item.data.createdAt).getTime() - new Date(prev.data.createdAt).getTime()
        isGrouped = sameAuthor && timeDiff < 5 * 60 * 1000
      }
      return (
        <MessageBubble
          message={item.data}
          onReply={() => handleReply(item.data)}
          channelId={channelId!}
          allMessages={messages}
          isGrouped={isGrouped}
        />
      )
    },
    [colors, t, channelId, handleReply, messages, timeline],
  )

  const getItemKey = useCallback((item: TimelineItem) => {
    return item.data.id
  }, [])

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.chatBackground }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? insets.top + 44 : 0}
    >
      {isLoading ? (
        <View style={styles.loading}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : timeline.length === 0 ? (
        <Pressable style={styles.emptyState} onPress={Keyboard.dismiss}>
          <View style={[styles.emptyIcon, { backgroundColor: `${colors.primary}15` }]}>
            <Hash size={28} color={colors.primary} />
          </View>
          <Text style={[styles.emptyTitle, { color: colors.text }]}>
            {t('chat.welcomeChannel', { channelName: channel?.name ?? t('chat.channelFallback') })}
          </Text>
          <Text style={[styles.emptyDescription, { color: colors.textMuted }]}>
            {t('chat.welcomeStart')}
          </Text>
        </Pressable>
      ) : (
        <FlashList
          ref={flatListRef}
          data={timeline}
          keyExtractor={getItemKey}
          renderItem={renderTimelineItem}
          contentContainerStyle={styles.messageList}
          inverted
          estimatedItemSize={72}
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.3}
          ListFooterComponent={
            isFetchingNextPage ? (
              <View style={styles.loadingMore}>
                <ActivityIndicator size="small" color={colors.primary} />
                <Text style={[styles.loadingMoreText, { color: colors.textMuted }]}>
                  {t('chat.loadingOlder')}
                </Text>
              </View>
            ) : null
          }
          scrollsToTop={false}
          onScroll={(e) => {
            const { contentOffset } = e.nativeEvent
            // In inverted list, offset > 0 means scrolled away from bottom (newest)
            setShowScrollBottom(contentOffset.y > 200)
            if (channelId) scrollOffsetRef.current[channelId] = contentOffset.y
          }}
          scrollEventThrottle={100}
          keyboardDismissMode="interactive"
          keyboardShouldPersistTaps="handled"
        />
      )}

      {/* Scroll to bottom FAB */}
      {showScrollBottom && (
        <Pressable
          style={[
            styles.scrollBottomFab,
            { backgroundColor: colors.surface, borderColor: colors.border },
          ]}
          onPress={() => flatListRef.current?.scrollToOffset({ offset: 0, animated: true })}
        >
          <ChevronDown size={20} color={colors.textSecondary} />
        </Pressable>
      )}

      {/* Activity indicator */}
      {activityUsers.length > 0 && (
        <View style={[styles.activityBar, { backgroundColor: colors.surface }]}>
          {activityUsers.map((u) => (
            <View key={u.userId} style={styles.activityRow}>
              <View style={[styles.pulseDot, { backgroundColor: colors.primary }]} />
              <Text style={[styles.activityText, { color: colors.textMuted }]} numberOfLines={1}>
                {u.username} {u.activity}
              </Text>
            </View>
          ))}
        </View>
      )}

      {/* Typing indicator */}
      {typingUsers.length > 0 && (
        <View style={styles.typingBar}>
          <TypingDots />
          <Text style={{ color: colors.textMuted, fontSize: fontSize.xs }} numberOfLines={1}>
            {typingUsers.join(', ')}{' '}
            {typingUsers.length === 1 ? t('chat.isTyping') : t('chat.areTyping')}
          </Text>
        </View>
      )}

      {/* Pending files preview */}
      {pendingFiles.length > 0 && (
        <View
          style={[
            styles.pendingFilesBar,
            { backgroundColor: colors.surface, borderTopColor: colors.border },
          ]}
        >
          {pendingFiles.map((file, idx) => (
            <View
              key={file.uri}
              style={[styles.pendingFileChip, { backgroundColor: colors.inputBackground }]}
            >
              <Text
                style={[styles.pendingFileName, { color: colors.textSecondary }]}
                numberOfLines={1}
              >
                {file.type.startsWith('image/') ? '🖼 ' : '📎 '}
                {file.name}
              </Text>
              <Pressable onPress={() => removePendingFile(idx)} hitSlop={8}>
                <X size={14} color={colors.textMuted} />
              </Pressable>
            </View>
          ))}
        </View>
      )}

      {/* Reply bar */}
      {replyTo && (
        <View
          style={[
            styles.replyBar,
            { backgroundColor: colors.surface, borderTopColor: colors.border },
          ]}
        >
          <View style={[styles.replyBarAccent, { backgroundColor: colors.primary }]} />
          <View style={styles.replyBarContent}>
            <Text style={[styles.replyBarLabel, { color: colors.primary }]}>
              {t('chat.replyingTo')} {replyTo.author?.displayName || replyTo.author?.username}
            </Text>
            <Text style={[styles.replyBarPreview, { color: colors.textMuted }]} numberOfLines={1}>
              {replyTo.content}
            </Text>
          </View>
          <Pressable onPress={() => setReplyTo(null)} hitSlop={8}>
            <X size={18} color={colors.textMuted} />
          </Pressable>
        </View>
      )}

      {/* @mention autocomplete dropdown */}
      {mentionResults.length > 0 && mentionQuery !== null && (
        <View
          style={[
            styles.mentionDropdown,
            { backgroundColor: colors.surface, borderColor: colors.border },
          ]}
        >
          {mentionResults.map((m) => (
            <Pressable
              key={m.id}
              style={({ pressed }) => [
                styles.mentionRow,
                pressed && { backgroundColor: colors.surfaceHover },
              ]}
              onPress={() => insertMention(m.user.username)}
            >
              <Avatar
                uri={m.user.avatarUrl}
                name={m.user.displayName || m.user.username}
                size={24}
                userId={m.user.id}
              />
              <Text style={[styles.mentionName, { color: colors.text }]} numberOfLines={1}>
                {m.user.displayName || m.user.username}
              </Text>
              <Text style={[styles.mentionUsername, { color: colors.textMuted }]} numberOfLines={1}>
                @{m.user.username}
              </Text>
              {m.user.isBot && (
                <View style={[styles.mentionBotBadge, { backgroundColor: `${colors.primary}20` }]}>
                  <Text style={[styles.mentionBotText, { color: colors.primary }]}>BOT</Text>
                </View>
              )}
            </Pressable>
          ))}
        </View>
      )}

      {/* Input bar */}
      <View
        style={[
          styles.inputBar,
          {
            backgroundColor: colors.surface,
            borderTopColor: colors.border,
            paddingBottom: Math.max(spacing.sm, insets.bottom),
          },
        ]}
      >
        <Pressable
          style={styles.attachBtn}
          onPress={() => {
            Alert.alert(t('chat.attachFile'), undefined, [
              { text: t('chat.pickImage'), onPress: handlePickImage },
              { text: t('chat.pickFile'), onPress: handlePickFile },
              { text: t('common.cancel'), style: 'cancel' },
            ])
          }}
        >
          <Paperclip size={20} color={colors.textMuted} />
        </Pressable>
        <TextInput
          ref={inputRef}
          style={[
            styles.textInput,
            { backgroundColor: colors.inputBackground, color: colors.text },
          ]}
          value={inputText}
          onChangeText={handleTextChange}
          placeholder={
            channel
              ? t('chat.messagePlaceholderChannel', { channelName: channel.name })
              : t('chat.messagePlaceholder')
          }
          placeholderTextColor={colors.textMuted}
          multiline
          maxLength={4000}
          submitBehavior="submit"
          onSubmitEditing={handleSend}
          returnKeyType="send"
        />
        <Pressable style={styles.attachBtn} onPress={() => setShowInputEmojiPicker(true)}>
          <Smile size={20} color={showInputEmojiPicker ? colors.primary : colors.textMuted} />
        </Pressable>
        <Pressable
          style={[
            styles.sendBtn,
            {
              backgroundColor:
                inputText.trim() || pendingFiles.length > 0 ? colors.primary : colors.border,
            },
          ]}
          onPress={handleSend}
          disabled={(!inputText.trim() && pendingFiles.length === 0) || sending}
        >
          {sending ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <ArrowUp
              size={18}
              color={inputText.trim() || pendingFiles.length > 0 ? '#fff' : colors.textMuted}
            />
          )}
        </Pressable>
      </View>

      {/* Emoji picker (rn-emoji-keyboard) */}
      <EmojiPicker
        open={showInputEmojiPicker}
        onClose={() => setShowInputEmojiPicker(false)}
        onEmojiSelected={(emoji: EmojiType) => {
          setInputText((prev) => prev + emoji.emoji)
          setTimeout(() => inputRef.current?.focus(), 100)
        }}
        enableSearchBar
        enableRecentlyUsed
        categoryPosition="top"
        theme={{
          backdrop: 'rgba(0,0,0,0.3)',
          knob: colors.textMuted,
          container: colors.surface,
          header: colors.text,
          category: {
            icon: colors.textMuted,
            iconActive: colors.primary,
            container: colors.surface,
            containerActive: colors.surfaceHover,
          },
          search: {
            background: colors.inputBackground,
            text: colors.text,
            placeholder: colors.textMuted,
            icon: colors.textMuted,
          },
          emoji: { selected: colors.surfaceHover },
        }}
      />

      {/* Member list modal */}
      <Modal
        visible={showMemberList}
        animationType="slide"
        transparent
        onRequestClose={() => setShowMemberList(false)}
      >
        <View style={styles.sheetOverlay}>
          <Pressable style={styles.sheetDismiss} onPress={() => setShowMemberList(false)} />
          <View style={[styles.sheetContainer, { backgroundColor: colors.surface }]}>
            <View style={[styles.sheetHandle, { backgroundColor: colors.textMuted }]} />
            <View style={styles.sheetHeader}>
              <Text style={[styles.sheetTitle, { color: colors.text }]}>
                {t('member.title')} ({channelMembers.length})
              </Text>
              <View style={styles.sheetHeaderActions}>
                <Pressable
                  onPress={() => {
                    Keyboard.dismiss()
                    setShowMemberList(false)
                    setTimeout(() => setShowInvitePanel(true), 350)
                  }}
                  hitSlop={8}
                  style={[styles.sheetActionBtn, { backgroundColor: `${colors.primary}12` }]}
                >
                  <UserPlus size={16} color={colors.primary} />
                </Pressable>
                <Pressable
                  onPress={() => setShowMemberList(false)}
                  hitSlop={8}
                  style={[styles.sheetActionBtn, { backgroundColor: colors.inputBackground }]}
                >
                  <X size={16} color={colors.textSecondary} />
                </Pressable>
              </View>
            </View>
            <FlatList
              data={[
                ...channelMembers.filter((m) => m.user.status && m.user.status !== 'offline'),
                ...channelMembers.filter((m) => !m.user.status || m.user.status === 'offline'),
              ]}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.sheetList}
              renderItem={({ item }) => {
                const name = item.user.displayName || item.user.username
                const isOnline = item.user.status && item.user.status !== 'offline'
                return (
                  <Pressable
                    style={({ pressed }) => [
                      styles.memberRow,
                      { opacity: isOnline ? 1 : 0.5 },
                      pressed && { backgroundColor: colors.surfaceHover },
                    ]}
                    onPress={() => {
                      setShowMemberList(false)
                      router.push(`/(main)/profile/${item.user.id}`)
                    }}
                  >
                    <View style={styles.memberAvatarWrap}>
                      <Avatar
                        uri={item.user.avatarUrl}
                        name={name}
                        size={40}
                        userId={item.user.id}
                      />
                      <View style={styles.memberStatusDot}>
                        <StatusBadge status={item.user.status || 'offline'} size={12} />
                      </View>
                    </View>
                    <View style={styles.memberInfo}>
                      <Text style={[styles.memberName, { color: colors.text }]} numberOfLines={1}>
                        {name}
                      </Text>
                      <Text style={{ color: colors.textMuted, fontSize: fontSize.xs }}>
                        @{item.user.username}
                      </Text>
                    </View>
                    {item.role !== 'member' && (
                      <View
                        style={[
                          styles.memberRoleBadge,
                          {
                            backgroundColor:
                              item.role === 'owner' ? `${colors.warning}20` : `${colors.info}20`,
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.memberRoleText,
                            {
                              color: item.role === 'owner' ? colors.warning : colors.info,
                            },
                          ]}
                        >
                          {item.role === 'owner' ? t('member.roleOwner') : t('member.roleAdmin')}
                        </Text>
                      </View>
                    )}
                    {item.user.isBot && (
                      <View
                        style={[styles.memberRoleBadge, { backgroundColor: `${colors.primary}20` }]}
                      >
                        <Text style={[styles.memberRoleText, { color: colors.primary }]}>BOT</Text>
                      </View>
                    )}
                  </Pressable>
                )
              }}
              ListEmptyComponent={
                <View style={styles.memberEmpty}>
                  <Text style={{ color: colors.textMuted, fontSize: fontSize.sm }}>
                    {t('member.noMembers')}
                  </Text>
                </View>
              }
            />
          </View>
        </View>
      </Modal>

      {/* Invite member panel */}
      <Modal
        visible={showInvitePanel}
        animationType="slide"
        transparent
        onRequestClose={() => setShowInvitePanel(false)}
      >
        <View style={styles.sheetOverlay}>
          <Pressable style={styles.sheetDismiss} onPress={() => setShowInvitePanel(false)} />
          <View style={[styles.sheetContainer, { backgroundColor: colors.surface }]}>
            <View style={[styles.sheetHandle, { backgroundColor: colors.textMuted }]} />
            <View style={styles.sheetHeader}>
              <Text style={[styles.sheetTitle, { color: colors.text }]}>
                {t('member.inviteMembers')}
              </Text>
              <Pressable
                onPress={() => setShowInvitePanel(false)}
                hitSlop={8}
                style={[styles.sheetActionBtn, { backgroundColor: colors.inputBackground }]}
              >
                <X size={16} color={colors.textSecondary} />
              </Pressable>
            </View>
            <View style={[styles.sheetSearchWrap, { backgroundColor: colors.inputBackground }]}>
              <Search size={16} color={colors.textMuted} />
              <TextInput
                style={[styles.inviteSearchInput, { color: colors.text }]}
                value={inviteSearch}
                onChangeText={setInviteSearch}
                placeholder={t('member.searchMembers')}
                placeholderTextColor={colors.textMuted}
                autoFocus
              />
            </View>
            <FlatList
              data={invitableMembers}
              keyExtractor={(item) => item.user.id}
              contentContainerStyle={styles.sheetList}
              renderItem={({ item }) => {
                const name = item.user.displayName || item.user.username
                const isPending =
                  inviteMemberMutation.isPending && inviteMemberMutation.variables === item.user.id
                return (
                  <View style={styles.memberRow}>
                    <Avatar uri={item.user.avatarUrl} name={name} size={40} userId={item.user.id} />
                    <View style={styles.memberInfo}>
                      <Text style={[styles.memberName, { color: colors.text }]} numberOfLines={1}>
                        {name}
                      </Text>
                      <Text style={{ color: colors.textMuted, fontSize: fontSize.xs }}>
                        @{item.user.username}
                      </Text>
                    </View>
                    {item.user.isBot && (
                      <View
                        style={[styles.memberRoleBadge, { backgroundColor: `${colors.primary}20` }]}
                      >
                        <Text style={[styles.memberRoleText, { color: colors.primary }]}>BOT</Text>
                      </View>
                    )}
                    <Pressable
                      style={[styles.inviteBtn, { backgroundColor: `${colors.primary}12` }]}
                      onPress={() => inviteMemberMutation.mutate(item.user.id)}
                      disabled={isPending}
                    >
                      {isPending ? (
                        <ActivityIndicator size="small" color={colors.primary} />
                      ) : (
                        <UserPlus size={16} color={colors.primary} />
                      )}
                    </Pressable>
                  </View>
                )
              }}
              ListEmptyComponent={
                <View style={styles.memberEmpty}>
                  <Text style={{ color: colors.textMuted, fontSize: fontSize.sm }}>
                    {t('member.allMembersAdded')}
                  </Text>
                </View>
              }
            />
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
    gap: spacing.sm,
  },
  emptyIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  emptyTitle: { fontSize: fontSize.xl, fontWeight: '800', textAlign: 'center' },
  emptyDescription: { fontSize: fontSize.sm, textAlign: 'center', lineHeight: 20 },
  messageList: {
    paddingHorizontal: spacing.xs,
    paddingTop: spacing.md,
    paddingBottom: spacing.xs,
  },
  loadingMore: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.md,
    gap: spacing.sm,
  },
  loadingMoreText: { fontSize: fontSize.xs },
  // System events
  systemEvent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
  },
  systemEventLine: { flex: 1, height: 1 },
  systemEventText: { fontSize: fontSize.xs, fontWeight: '500' },
  // New message divider
  newMessageDivider: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
  },
  dividerLine: { flex: 1, height: 1 },
  dividerText: { fontSize: fontSize.xs, fontWeight: '700' },
  // Date separator
  dateSeparator: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
  },
  dateLine: { flex: 1, height: StyleSheet.hairlineWidth },
  dateText: { fontSize: fontSize.xs, fontWeight: '600' },
  // Scroll to bottom
  scrollBottomFab: {
    position: 'absolute',
    right: spacing.md,
    bottom: 140,
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
  },
  // Activity
  activityBar: { paddingHorizontal: spacing.md, paddingVertical: spacing.xs },
  activityRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  pulseDot: { width: 8, height: 8, borderRadius: 4 },
  activityText: { fontSize: fontSize.xs },
  // Typing
  typingBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.xs,
    gap: spacing.sm,
  },
  typingDots: { flexDirection: 'row', gap: 3 },
  typingDot: { width: 4, height: 4, borderRadius: 2 },
  // Pending files
  pendingFilesBar: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    gap: spacing.xs,
    borderTopWidth: 1,
  },
  pendingFileChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.md,
    gap: spacing.xs,
    maxWidth: '48%',
  },
  pendingFileName: { fontSize: fontSize.xs, flex: 1 },
  // Reply bar
  replyBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderTopWidth: 1,
    gap: spacing.sm,
  },
  replyBarAccent: { width: 3, height: '100%', borderRadius: 2, minHeight: 32 },
  replyBarContent: { flex: 1 },
  replyBarLabel: { fontSize: fontSize.xs, fontWeight: '700' },
  replyBarPreview: { fontSize: fontSize.xs, marginTop: 1 },
  // @mention autocomplete
  mentionDropdown: {
    borderTopWidth: 1,
    maxHeight: 240,
  },
  mentionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
  },
  mentionName: {
    fontSize: fontSize.sm,
    fontWeight: '500',
    flexShrink: 1,
  },
  mentionUsername: {
    fontSize: fontSize.xs,
    flexShrink: 1,
  },
  mentionBotBadge: {
    paddingHorizontal: spacing.xs,
    paddingVertical: 1,
    borderRadius: radius.sm,
  },
  mentionBotText: {
    fontSize: 10,
    fontWeight: '700',
  },
  // Input bar
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    gap: spacing.xs,
    borderTopWidth: 1,
  },
  attachBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  textInput: {
    flex: 1,
    minHeight: 36,
    maxHeight: 120,
    borderRadius: radius.xl,
    paddingHorizontal: spacing.lg,
    paddingVertical: Platform.OS === 'ios' ? 8 : spacing.sm,
    fontSize: fontSize.md,
  },
  sendBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  // Sheet-style modals
  sheetOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  sheetDismiss: {
    flex: 1,
  },
  sheetContainer: {
    maxHeight: '75%',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: spacing.xl,
  },
  sheetHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: spacing.sm,
    marginBottom: spacing.xs,
    opacity: 0.3,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  sheetTitle: {
    fontSize: fontSize.lg,
    fontWeight: '700',
  },
  sheetHeaderActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  sheetActionBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetSearchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: spacing.lg,
    marginBottom: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.lg,
    height: 40,
    gap: spacing.sm,
  },
  sheetList: {
    paddingHorizontal: spacing.sm,
  },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.lg,
  },
  memberAvatarWrap: {
    position: 'relative',
  },
  memberStatusDot: {
    position: 'absolute',
    bottom: -1,
    right: -1,
  },
  memberInfo: {
    flex: 1,
    gap: 2,
  },
  memberName: {
    fontSize: fontSize.md,
    fontWeight: '600',
  },
  memberRoleBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radius.md,
  },
  memberRoleText: {
    fontSize: 10,
    fontWeight: '700',
  },
  memberEmpty: {
    alignItems: 'center',
    paddingVertical: spacing['2xl'],
  },
  inviteSearchInput: {
    flex: 1,
    fontSize: fontSize.sm,
    paddingVertical: 0,
  },
  inviteBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
})
