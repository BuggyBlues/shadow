import { useInfiniteQuery, useQuery, useQueryClient } from '@tanstack/react-query'
import * as DocumentPicker from 'expo-document-picker'
import * as ImagePicker from 'expo-image-picker'
import { useLocalSearchParams, useRouter } from 'expo-router'
import {
  ChevronDown,
  ChevronLeft,
  File,
  Image as ImageIcon,
  Mic,
  Plus,
  Smile,
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
import { MessageBubble } from '../../../src/components/chat/message-bubble'
import { Avatar } from '../../../src/components/common/avatar'
import { useSocketEvent } from '../../../src/hooks/use-socket'
import { fetchApi } from '../../../src/lib/api'
import {
  getSocket,
  joinDm,
  leaveDm,
  sendDmMessage,
  sendDmTyping,
} from '../../../src/lib/socket'
import { playReceiveSound, playSendSound } from '../../../src/lib/sounds'
import { useAuthStore } from '../../../src/stores/auth.store'
import { fontSize, radius, spacing, useColors } from '../../../src/theme'
import type { Message, MessagesPage } from '../../../src/types/message'
import { normalizeMessage } from '../../../src/types/message'

const PAGE_SIZE = 50

type SpeechResultEvent = {
  results?: Array<{ transcript?: string }>
  isFinal?: boolean
}

type SpeechModuleLike = {
  start: (options?: Record<string, unknown>) => void
  stop: () => void
  requestPermissionsAsync: () => Promise<{ granted: boolean }>
}

let speechModule: SpeechModuleLike | null = null
let useSpeechRecognitionEventSafe: (
  eventName: string,
  listener: (event: SpeechResultEvent) => void,
) => void = () => {}

try {
  const speech = require('expo-speech-recognition') as {
    ExpoSpeechRecognitionModule?: SpeechModuleLike
    useSpeechRecognitionEvent?: (
      eventName: string,
      listener: (event: SpeechResultEvent) => void,
    ) => void
  }
  speechModule = speech.ExpoSpeechRecognitionModule ?? null
  useSpeechRecognitionEventSafe = speech.useSpeechRecognitionEvent ?? (() => {})
} catch {
  speechModule = null
}

// ── TypingDots ──────────────────────────────

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

// ── DM Chat Screen ──────────────────────────

interface DmChannelInfo {
  id: string
  userAId: string
  userBId: string
  lastMessageAt: string | null
  otherUser?: {
    id: string
    username: string
    displayName: string
    avatarUrl: string | null
    status: string
  }
}

export default function DmChatScreen() {
  const { dmChannelId } = useLocalSearchParams<{ dmChannelId: string }>()
  const { t } = useTranslation()
  const colors = useColors()
  const router = useRouter()
  const queryClient = useQueryClient()
  const flatListRef = useRef<FlatList>(null)
  const currentUser = useAuthStore((s) => s.user)
  const insets = useSafeAreaInsets()

  const [inputText, setInputText] = useState('')
  const [replyTo, setReplyTo] = useState<Message | null>(null)
  const [sending, setSending] = useState(false)
  const [typingUsers, setTypingUsers] = useState<string[]>([])
  const [pendingFiles, setPendingFiles] = useState<
    Array<{ uri: string; name: string; type: string; size?: number }>
  >([])
  const [showScrollBottom, setShowScrollBottom] = useState(false)
  const [showInputEmojiPicker, setShowInputEmojiPicker] = useState(false)
  const [showPlusMenu, setShowPlusMenu] = useState(false)
  const [keyboardVisible, setKeyboardVisible] = useState(false)
  const [isRecording, setIsRecording] = useState(false)
  const [voiceTranscript, setVoiceTranscript] = useState('')

  const inputRef = useRef<TextInput>(null)
  const typingTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)
  const typingUsersTimeout = useRef<Record<string, ReturnType<typeof setTimeout>>>({})
  const lastCommittedTranscript = useRef('')

  // ── Channel info ──────

  const { data: dmChannel } = useQuery({
    queryKey: ['dm-channel', dmChannelId],
    queryFn: async () => {
      const channels = await fetchApi<DmChannelInfo[]>('/api/dm/channels')
      return channels.find((c) => c.id === dmChannelId) ?? null
    },
    enabled: !!dmChannelId,
  })

  const otherUser = dmChannel?.otherUser

  // ── Socket join/leave ──────

  useEffect(() => {
    if (!dmChannelId) return
    joinDm(dmChannelId)
    return () => {
      leaveDm(dmChannelId)
    }
  }, [dmChannelId])

  // ── Keyboard ──────

  useEffect(() => {
    const showSub = Keyboard.addListener('keyboardDidShow', () => setKeyboardVisible(true))
    const hideSub = Keyboard.addListener('keyboardDidHide', () => setKeyboardVisible(false))
    return () => {
      showSub.remove()
      hideSub.remove()
    }
  }, [])

  // ── Voice input ──────

  useSpeechRecognitionEventSafe('result', (event: SpeechResultEvent) => {
    const transcript = event.results?.[0]?.transcript ?? ''
    setVoiceTranscript(transcript)
    if (event.isFinal && transcript && transcript !== lastCommittedTranscript.current) {
      lastCommittedTranscript.current = transcript
      setInputText((prev) => (prev ? `${prev} ${transcript}` : transcript))
      setVoiceTranscript('')
    }
  })

  useSpeechRecognitionEventSafe('end', () => {
    setIsRecording(false)
    setVoiceTranscript('')
  })

  const toggleVoiceInput = async () => {
    if (!speechModule) {
      Alert.alert(t('chat.voiceNotSupported', '语音输入不可用'))
      return
    }
    if (isRecording) {
      speechModule.stop()
      setIsRecording(false)
      return
    }
    try {
      const { granted } = await speechModule.requestPermissionsAsync()
      if (!granted) {
        Alert.alert(t('chat.micPermission', '需要麦克风权限'))
        return
      }
      lastCommittedTranscript.current = ''
      speechModule.start({ lang: t('chat.speechLang'), interimResults: true })
      setIsRecording(true)
    } catch {
      /* ignore */
    }
  }

  // ── Messages query ──────

  type InfiniteData = {
    pages: Array<{ messages: Message[]; hasMore: boolean }>
    pageParams: Array<string | null>
  }

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading } = useInfiniteQuery({
    queryKey: ['dm-messages', dmChannelId],
    queryFn: async ({ pageParam }) => {
      const params = new URLSearchParams({ limit: String(PAGE_SIZE) })
      if (pageParam) params.set('cursor', pageParam as string)
      const result = await fetchApi<MessagesPage | Message[]>(
        `/api/dm/channels/${dmChannelId}/messages?${params}`,
      )
      const normalize = (m: unknown) =>
        normalizeMessage({ ...(m as Record<string, unknown>), channelId: dmChannelId })
      if (Array.isArray(result)) {
        return {
          messages: result.map(normalize),
          hasMore: result.length >= PAGE_SIZE,
        }
      }
      return {
        messages: result.messages.map(normalize),
        hasMore: result.hasMore,
      }
    },
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) => {
      if (!lastPage.hasMore || lastPage.messages.length === 0) return undefined
      return lastPage.messages[0]?.createdAt
    },
    enabled: !!dmChannelId,
  })

  const messages = useMemo(() => {
    if (!data) return []
    return [...data.pages]
      .reverse()
      .flatMap((p) => p.messages)
      .reverse()
  }, [data])

  // ── Socket events ──────

  const appendMessage = useCallback(
    (raw: Record<string, unknown>) => {
      if ((raw.dmChannelId as string) !== dmChannelId) return
      // Map dmChannelId → channelId for Message type
      const normalized = normalizeMessage({ ...raw, channelId: raw.dmChannelId })

      if (normalized.authorId !== currentUser?.id) {
        playReceiveSound()
      }

      queryClient.setQueryData<InfiniteData>(['dm-messages', dmChannelId], (old) => {
        if (!old) return old
        const firstPage = old.pages[0]
        if (!firstPage) return old
        if (firstPage.messages.some((m) => m.id === normalized.id)) {
          return {
            ...old,
            pages: old.pages.map((page) => ({
              ...page,
              messages: page.messages.map((m) => (m.id === normalized.id ? normalized : m)),
            })),
          }
        }
        if (normalized.authorId === currentUser?.id) {
          const tempIdx = firstPage.messages.findIndex(
            (m) => m.id.startsWith('temp-') && m.authorId === normalized.authorId,
          )
          if (tempIdx >= 0) {
            return {
              ...old,
              pages: [
                {
                  ...firstPage,
                  messages: firstPage.messages.map((m, i) => (i === tempIdx ? normalized : m)),
                },
                ...old.pages.slice(1),
              ],
            }
          }
        }
        return {
          ...old,
          pages: [
            { ...firstPage, messages: [...firstPage.messages, normalized] },
            ...old.pages.slice(1),
          ],
        }
      })
      requestAnimationFrame(() => {
        setTimeout(() => {
          flatListRef.current?.scrollToOffset({ offset: 0, animated: true })
        }, 150)
      })
    },
    [dmChannelId, queryClient, currentUser?.id],
  )

  useSocketEvent('dm:message', appendMessage)

  useSocketEvent(
    'dm:message:updated',
    useCallback(
      (raw: Record<string, unknown>) => {
        if ((raw.dmChannelId as string) !== dmChannelId) return
        const msg = normalizeMessage({ ...raw, channelId: raw.dmChannelId })
        queryClient.setQueryData<InfiniteData>(['dm-messages', dmChannelId], (old) => {
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
      [dmChannelId, queryClient],
    ),
  )

  useSocketEvent(
    'dm:message:deleted',
    useCallback(
      ({ id }: { id: string }) => {
        queryClient.setQueryData<InfiniteData>(['dm-messages', dmChannelId], (old) => {
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
      [dmChannelId, queryClient],
    ),
  )

  useSocketEvent(
    'dm:reaction:updated',
    useCallback(
      (payload: {
        messageId: string
        dmChannelId: string
        reactions: Array<{ emoji: string; count: number; userIds: string[] }>
      }) => {
        if (payload.dmChannelId !== dmChannelId) return
        queryClient.setQueryData<InfiniteData>(['dm-messages', dmChannelId], (old) => {
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
      [dmChannelId, queryClient],
    ),
  )

  useSocketEvent(
    'dm:typing',
    useCallback(
      ({
        dmChannelId: typingId,
        userId,
        username,
      }: {
        dmChannelId: string
        userId: string
        username: string
      }) => {
        if (typingId !== dmChannelId || !userId) return
        if (userId === currentUser?.id) return
        setTypingUsers((prev) => (prev.includes(username) ? prev : [...prev, username]))
        if (typingUsersTimeout.current[userId]) clearTimeout(typingUsersTimeout.current[userId])
        typingUsersTimeout.current[userId] = setTimeout(() => {
          setTypingUsers((prev) => prev.filter((n) => n !== username))
          delete typingUsersTimeout.current[userId]
        }, 3000)
      },
      [dmChannelId, currentUser?.id],
    ),
  )

  // ── Typing indicator emit ──────

  const handleInputChange = (text: string) => {
    setInputText(text)
    if (typingTimeout.current) clearTimeout(typingTimeout.current)
    typingTimeout.current = setTimeout(() => {
      if (dmChannelId) sendDmTyping(dmChannelId)
    }, 500)
  }

  // ── Optimistic message helper ──────

  const insertOptimisticMessage = (content: string, replyToId?: string) => {
    const tempId = `temp-${Date.now()}`
    const msg: Message = {
      id: tempId,
      content,
      channelId: dmChannelId!,
      authorId: currentUser!.id,
      threadId: null,
      replyToId: replyToId ?? null,
      isEdited: false,
      isPinned: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      author: {
        id: currentUser!.id,
        username: currentUser!.username,
        displayName: currentUser!.displayName ?? currentUser!.username,
        avatarUrl: currentUser!.avatarUrl ?? null,
      },
      sendStatus: 'sending',
    }
    queryClient.setQueryData<InfiniteData>(['dm-messages', dmChannelId], (old) => {
      if (!old) return old
      const firstPage = old.pages[0]
      if (!firstPage) return old
      return {
        ...old,
        pages: [{ ...firstPage, messages: [...firstPage.messages, msg] }, ...old.pages.slice(1)],
      }
    })
    requestAnimationFrame(() => {
      setTimeout(() => {
        flatListRef.current?.scrollToOffset({ offset: 0, animated: true })
      }, 100)
    })
    return tempId
  }

  const markMessageFailed = (tempId: string) => {
    queryClient.setQueryData<InfiniteData>(['dm-messages', dmChannelId], (old) => {
      if (!old) return old
      return {
        ...old,
        pages: old.pages.map((page) => ({
          ...page,
          messages: page.messages.map((m) =>
            m.id === tempId ? { ...m, sendStatus: 'failed' as const } : m,
          ),
        })),
      }
    })
  }

  // ── File picking ──────

  const handlePickImage = async () => {
    setShowPlusMenu(false)
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images', 'videos'],
      allowsMultipleSelection: true,
      quality: 0.8,
    })
    if (!res.canceled) {
      setPendingFiles((prev) => [
        ...prev,
        ...res.assets.map((a) => ({
          uri: a.uri,
          name: a.fileName || `image-${Date.now()}.jpg`,
          type: a.mimeType || 'image/jpeg',
          size: a.fileSize,
        })),
      ])
    }
  }

  const handlePickFile = async () => {
    setShowPlusMenu(false)
    const res = await DocumentPicker.getDocumentAsync({ multiple: true })
    if (!res.canceled) {
      setPendingFiles((prev) => [
        ...prev,
        ...res.assets.map((a) => ({
          uri: a.uri,
          name: a.name || `file-${Date.now()}`,
          type: a.mimeType || 'application/octet-stream',
          size: a.size,
        })),
      ])
    }
  }

  // ── Send message ──────

  const handleSend = async () => {
    const content = inputText.trim()
    if (!content && pendingFiles.length === 0) return
    if (sending) return
    setSending(true)

    const tempId = content ? insertOptimisticMessage(content, replyTo?.id) : null

    const savedContent = content
    const savedReplyTo = replyTo
    const savedPendingFiles = [...pendingFiles]
    setInputText('')
    setReplyTo(null)
    setPendingFiles([])
    playSendSound()

    try {
      let uploadedAttachments:
        | Array<{ url: string; filename: string; contentType: string; size: number }>
        | undefined
      if (savedPendingFiles.length > 0) {
        uploadedAttachments = []
        for (const file of savedPendingFiles) {
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

      const sock = getSocket()
      if (!uploadedAttachments && sock.connected) {
        sendDmMessage({
          dmChannelId: dmChannelId!,
          content: savedContent,
          replyToId: savedReplyTo?.id,
        })
        if (tempId) {
          setTimeout(() => {
            queryClient.setQueryData<InfiniteData>(['dm-messages', dmChannelId], (old) => {
              if (!old) return old
              const stillPending = old.pages.some((p) =>
                p.messages.some((m) => m.id === tempId && m.sendStatus === 'sending'),
              )
              if (stillPending) {
                return {
                  ...old,
                  pages: old.pages.map((page) => ({
                    ...page,
                    messages: page.messages.map((m) =>
                      m.id === tempId ? { ...m, sendStatus: 'failed' as const } : m,
                    ),
                  })),
                }
              }
              return old
            })
          }, 10000)
        }
      } else {
        const created = await fetchApi<Record<string, unknown>>(
          `/api/dm/channels/${dmChannelId}/messages`,
          {
            method: 'POST',
            body: JSON.stringify({
              content: savedContent || '\u200B',
              replyToId: savedReplyTo?.id,
              ...(uploadedAttachments ? { attachments: uploadedAttachments } : {}),
            }),
          },
        )
        if (tempId) {
          const realMsg = normalizeMessage({ ...created, channelId: created.dmChannelId })
          queryClient.setQueryData<InfiniteData>(['dm-messages', dmChannelId], (old) => {
            if (!old) return old
            return {
              ...old,
              pages: old.pages.map((page) => ({
                ...page,
                messages: page.messages.map((m) => (m.id === tempId ? realMsg : m)),
              })),
            }
          })
        } else {
          appendMessage(created)
        }
      }
      setTimeout(() => inputRef.current?.focus(), 50)
    } catch (err) {
      if (tempId) {
        markMessageFailed(tempId)
      } else {
        Alert.alert(t('common.error'), (err as Error).message || t('chat.sendFailed'))
      }
    } finally {
      setSending(false)
    }
  }

  const handleRetry = useCallback(
    async (failedMsg: Message) => {
      queryClient.setQueryData<InfiniteData>(['dm-messages', dmChannelId], (old) => {
        if (!old) return old
        return {
          ...old,
          pages: old.pages.map((page) => ({
            ...page,
            messages: page.messages.filter((m) => m.id !== failedMsg.id),
          })),
        }
      })
      setInputText(failedMsg.content)
      setReplyTo(
        failedMsg.replyToId
          ? messages.find((m) => m.id === failedMsg.replyToId) ?? null
          : null,
      )
    },
    [queryClient, dmChannelId, messages],
  )

  // ── Scroll events ──────

  const statusColors: Record<string, string> = {
    online: '#23a559',
    idle: '#f59e0b',
    dnd: '#ed4245',
    offline: '#747f8d',
  }

  const statusLabel: Record<string, string> = {
    online: '在线',
    idle: '离开',
    dnd: '勿扰',
    offline: '离线',
  }

  // ── Render ──────

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={0}
    >
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.surface, paddingTop: insets.top + 4 }]}>
        <Pressable hitSlop={12} onPress={() => router.back()} style={styles.backBtn}>
          <ChevronLeft size={22} color={colors.text} />
        </Pressable>
        {otherUser && (
          <Pressable style={styles.headerUser} onPress={() => router.push(`/(main)/profile/${otherUser.id}` as never)}>
            <View style={styles.headerAvatarWrap}>
              <Avatar uri={otherUser.avatarUrl} name={otherUser.displayName || otherUser.username} size={32} userId={otherUser.id} />
              <View
                style={[
                  styles.headerStatusDot,
                  {
                    backgroundColor: statusColors[otherUser.status] ?? statusColors.offline,
                    borderColor: colors.surface,
                  },
                ]}
              />
            </View>
            <View>
              <Text style={[styles.headerName, { color: colors.text }]} numberOfLines={1}>
                {otherUser.displayName || otherUser.username}
              </Text>
              <Text style={[styles.headerStatus, { color: statusColors[otherUser.status] ?? colors.textMuted }]}>
                {statusLabel[otherUser.status] ?? statusLabel.offline}
              </Text>
            </View>
          </Pressable>
        )}
      </View>

      {/* Loading */}
      {isLoading && (
        <View style={styles.loadingCenter}>
          <ActivityIndicator color={colors.primary} size="small" />
        </View>
      )}

      {/* Messages */}
      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={(item) => item.id}
        inverted
        renderItem={({ item, index }) => {
          const prevMsg = messages[index + 1]
          const isGrouped =
            !!prevMsg &&
            prevMsg.authorId === item.authorId &&
            new Date(item.createdAt).getTime() - new Date(prevMsg.createdAt).getTime() < 120000
          return (
            <MessageBubble
              message={item}
              channelId={dmChannelId!}
              onReply={() => setReplyTo(item)}
              onRetry={handleRetry}
              allMessages={messages}
              isGrouped={isGrouped}
              variant="dm"
              dmChannelId={dmChannelId}
            />
          )
        }}
        onEndReached={() => {
          if (hasNextPage && !isFetchingNextPage) fetchNextPage()
        }}
        onEndReachedThreshold={0.3}
        ListFooterComponent={
          isFetchingNextPage ? (
            <ActivityIndicator color={colors.primary} size="small" style={{ padding: 16 }} />
          ) : null
        }
        contentContainerStyle={styles.listContent}
        onScroll={(e) => setShowScrollBottom(e.nativeEvent.contentOffset.y > 300)}
        scrollEventThrottle={32}
      />

      {/* Scroll to bottom FAB */}
      {showScrollBottom && (
        <Pressable
          style={[styles.scrollFab, { backgroundColor: colors.surface, borderColor: colors.border }]}
          onPress={() => flatListRef.current?.scrollToOffset({ offset: 0, animated: true })}
        >
          <ChevronDown size={18} color={colors.textMuted} />
        </Pressable>
      )}

      {/* Typing indicator */}
      {typingUsers.length > 0 && (
        <View style={[styles.typingBar, { backgroundColor: colors.surface }]}>
          <TypingDots />
          <Text style={[styles.typingText, { color: colors.textMuted }]} numberOfLines={1}>
            {typingUsers.join(', ')} {t('chat.typing', '正在输入...')}
          </Text>
        </View>
      )}

      {/* Pending files */}
      {pendingFiles.length > 0 && (
        <View style={[styles.pendingBar, { backgroundColor: colors.surface, borderTopColor: colors.border }]}>
          {pendingFiles.map((file, i) => (
            <View key={`${file.uri}-${i}`} style={[styles.pendingChip, { backgroundColor: colors.inputBackground }]}>
              <Text style={[styles.pendingName, { color: colors.text }]} numberOfLines={1}>
                {file.name}
              </Text>
              <Pressable
                hitSlop={6}
                onPress={() => setPendingFiles((prev) => prev.filter((_, j) => j !== i))}
              >
                <X size={12} color={colors.textMuted} />
              </Pressable>
            </View>
          ))}
        </View>
      )}

      {/* Reply bar */}
      {replyTo && (
        <View style={[styles.replyBar, { backgroundColor: colors.surface, borderTopColor: colors.border }]}>
          <View style={[styles.replyAccent, { backgroundColor: colors.primary }]} />
          <View style={styles.replyInfo}>
            <Text style={[styles.replyLabel, { color: colors.primary }]}>
              {t('chat.replyingTo', '回复')} {replyTo.author?.displayName ?? replyTo.author?.username}
            </Text>
            <Text style={[styles.replyContent, { color: colors.textMuted }]} numberOfLines={1}>
              {replyTo.content}
            </Text>
          </View>
          <Pressable hitSlop={8} onPress={() => setReplyTo(null)}>
            <X size={16} color={colors.textMuted} />
          </Pressable>
        </View>
      )}

      {/* Voice recording indicator */}
      {isRecording && (
        <View style={[styles.voiceBar, { backgroundColor: colors.surface }]}>
          <View style={[styles.voiceDot, { backgroundColor: '#ed4245' }]} />
          <Text style={[styles.voiceText, { color: colors.text }]}>
            {voiceTranscript || t('chat.listening', '正在听...')}
          </Text>
        </View>
      )}

      {/* Input bar */}
      <View style={[styles.inputContainer, { backgroundColor: colors.surface, paddingBottom: Math.max(insets.bottom, 8) }]}>
        <View style={[styles.inputRow, { backgroundColor: colors.inputBackground }]}>
          <TextInput
            ref={inputRef}
            style={[styles.textInput, { color: colors.text }]}
            value={inputText}
            onChangeText={handleInputChange}
            placeholder={t('chat.inputPlaceholder', '发送消息...')}
            placeholderTextColor={colors.textMuted}
            multiline
            maxLength={4000}
          />
          {speechModule && (
            <Pressable
              style={[styles.inputIcon, isRecording && { backgroundColor: '#ed424520' }]}
              onPress={toggleVoiceInput}
            >
              <Mic size={18} color={isRecording ? '#ed4245' : colors.textMuted} />
            </Pressable>
          )}
          <Pressable style={styles.inputIcon} onPress={() => setShowInputEmojiPicker(true)}>
            <Smile size={18} color={colors.textMuted} />
          </Pressable>
          <Pressable
            style={styles.inputIcon}
            onPress={() => setShowPlusMenu(!showPlusMenu)}
          >
            <Plus size={18} color={colors.textMuted} />
          </Pressable>
        </View>
        {inputText.trim() || pendingFiles.length > 0 ? (
          <Pressable
            style={[styles.sendBtn, { backgroundColor: colors.primary }]}
            onPress={handleSend}
            disabled={sending}
          >
            <Text style={styles.sendBtnText}>{t('chat.send', '发送')}</Text>
          </Pressable>
        ) : null}
      </View>

      {/* Plus menu panel */}
      {showPlusMenu && (
        <View style={[styles.plusPanel, { backgroundColor: colors.surface, borderTopColor: colors.border, paddingBottom: Math.max(insets.bottom, 8) }]}>
          <Pressable style={styles.plusItem} onPress={handlePickImage}>
            <View style={[styles.plusItemIcon, { backgroundColor: `${colors.primary}15` }]}>
              <ImageIcon size={22} color={colors.primary} />
            </View>
            <Text style={[styles.plusItemLabel, { color: colors.text }]}>{t('chat.photo', '图片')}</Text>
          </Pressable>
          <Pressable style={styles.plusItem} onPress={handlePickFile}>
            <View style={[styles.plusItemIcon, { backgroundColor: `${colors.primary}15` }]}>
              <File size={22} color={colors.primary} />
            </View>
            <Text style={[styles.plusItemLabel, { color: colors.text }]}>{t('chat.file', '文件')}</Text>
          </Pressable>
        </View>
      )}

      {/* Emoji picker */}
      <EmojiPicker
        onEmojiSelected={(emoji: EmojiType) => setInputText((v) => v + emoji.emoji)}
        open={showInputEmojiPicker}
        onClose={() => setShowInputEmojiPicker(false)}
        theme={{
          backdrop: '#00000060',
          knob: colors.textMuted,
          container: colors.surface,
          header: colors.text,
          skinTonesContainer: colors.surface,
          category: { icon: colors.textMuted, iconActive: colors.primary, container: colors.surface, containerActive: `${colors.primary}15` },
          search: { text: colors.text, placeholder: colors.textMuted, icon: colors.textMuted, background: colors.inputBackground },
          emoji: { selected: `${colors.primary}15` },
        }}
      />
    </KeyboardAvoidingView>
  )
}

// ── Styles ──────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#00000010',
    gap: spacing.sm,
  },
  backBtn: {
    padding: 4,
  },
  headerUser: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flex: 1,
  },
  headerAvatarWrap: {
    position: 'relative',
  },
  headerStatusDot: {
    position: 'absolute',
    bottom: -1,
    right: -1,
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
  },
  headerName: {
    fontSize: fontSize.md,
    fontWeight: '700',
  },
  headerStatus: {
    fontSize: fontSize.xs,
  },
  loadingCenter: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xs,
  },
  scrollFab: {
    position: 'absolute',
    right: 16,
    bottom: 100,
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  typingBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: 4,
    gap: 6,
  },
  typingDots: {
    flexDirection: 'row',
    gap: 3,
    alignItems: 'center',
  },
  typingDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
  },
  typingText: {
    fontSize: fontSize.xs,
  },
  pendingBar: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderTopWidth: StyleSheet.hairlineWidth,
    gap: 6,
  },
  pendingChip: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radius.md,
    paddingHorizontal: 8,
    paddingVertical: 4,
    gap: 4,
    maxWidth: 180,
  },
  pendingName: {
    fontSize: fontSize.xs,
    flexShrink: 1,
  },
  replyBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderTopWidth: 1,
    gap: spacing.sm,
  },
  replyAccent: {
    width: 3,
    height: '100%',
    borderRadius: 2,
  },
  replyInfo: {
    flex: 1,
  },
  replyLabel: {
    fontSize: fontSize.xs,
    fontWeight: '600',
  },
  replyContent: {
    fontSize: fontSize.xs,
  },
  voiceBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: 6,
    gap: 8,
  },
  voiceDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  voiceText: {
    fontSize: fontSize.sm,
  },
  inputContainer: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.xs,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    borderRadius: radius.lg,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    minHeight: 40,
    gap: 2,
  },
  textInput: {
    flex: 1,
    fontSize: fontSize.md,
    maxHeight: 100,
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  inputIcon: {
    padding: 6,
    borderRadius: radius.sm,
  },
  sendBtn: {
    marginTop: spacing.xs,
    borderRadius: radius.lg,
    paddingVertical: 10,
    alignItems: 'center',
  },
  sendBtnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: fontSize.sm,
  },
  plusPanel: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderTopWidth: 1,
    gap: spacing.xl,
  },
  plusItem: {
    alignItems: 'center',
    gap: spacing.xs,
  },
  plusItemIcon: {
    width: 52,
    height: 52,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  plusItemLabel: {
    fontSize: fontSize.xs,
  },
})
