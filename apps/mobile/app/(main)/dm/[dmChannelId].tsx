import type { CommerceProductCard } from '@shadowob/shared'
import { useInfiniteQuery, useQuery, useQueryClient } from '@tanstack/react-query'
import * as Clipboard from 'expo-clipboard'
import * as DocumentPicker from 'expo-document-picker'
import * as ImagePicker from 'expo-image-picker'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { ChevronDown, ChevronLeft, Copy, ShoppingBag, X } from 'lucide-react-native'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Keyboard,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  type TextInput,
  View,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { ChatComposer } from '../../../src/components/chat/chat-composer'
import { MessageBubble } from '../../../src/components/chat/message-bubble'
import { Avatar } from '../../../src/components/common/avatar'
import { useChatVoiceInput } from '../../../src/hooks/use-chat-voice-input'
import { useSocketEvent } from '../../../src/hooks/use-socket'
import { fetchApi } from '../../../src/lib/api'
import { getSocket, joinDm, leaveDm, sendDmMessage, sendDmTyping } from '../../../src/lib/socket'
import { playReceiveSound, playSendSound } from '../../../src/lib/sounds'
import { useAuthStore } from '../../../src/stores/auth.store'
import { fontSize, radius, spacing, useColors } from '../../../src/theme'
import type { Message, MessagesPage } from '../../../src/types/message'
import { normalizeMessage } from '../../../src/types/message'

const PAGE_SIZE = 50

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

type DmPage = { messages: Message[]; hasMore: boolean }
type DmInfiniteData = { pages: DmPage[]; pageParams: Array<string | null> }

export default function DmChatScreen() {
  const { dmChannelId } = useLocalSearchParams<{ dmChannelId: string }>()
  const { t } = useTranslation()
  const colors = useColors()
  const router = useRouter()
  const queryClient = useQueryClient()
  const flatListRef = useRef<FlatList<Message>>(null)
  const inputRef = useRef<TextInput>(null)
  const currentUser = useAuthStore((s) => s.user)
  const insets = useSafeAreaInsets()

  const [inputText, setInputText] = useState('')
  const [replyTo, setReplyTo] = useState<Message | null>(null)
  const [sending, setSending] = useState(false)
  const [typingUsers, setTypingUsers] = useState<string[]>([])
  const [pendingFiles, setPendingFiles] = useState<
    Array<{ uri: string; name: string; type: string; size?: number }>
  >([])
  const [selectedCommerceCards, setSelectedCommerceCards] = useState<CommerceProductCard[]>([])
  const [showProductPicker, setShowProductPicker] = useState(false)
  const [showScrollBottom, setShowScrollBottom] = useState(false)
  const [showInputEmojiPicker, setShowInputEmojiPicker] = useState(false)
  const [showPlusMenu, setShowPlusMenu] = useState(false)
  const [keyboardVisible, setKeyboardVisible] = useState(false)
  const [selectionMode, setSelectionMode] = useState(false)
  const [selectedMessageIds, setSelectedMessageIds] = useState<Set<string>>(new Set())

  const typingTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)
  const typingUsersTimeout = useRef<Record<string, ReturnType<typeof setTimeout>>>({})

  const { isRecording, voiceTranscript, toggleVoiceInput } = useChatVoiceInput({
    speechLang: t('chat.speechLang'),
    onPermissionDenied: () => Alert.alert(t('chat.micPermission', '需要麦克风权限')),
    onUnavailable: () => Alert.alert(t('chat.voiceNotSupported', '语音输入不可用')),
    onCommitTranscript: (transcript) => {
      setInputText((prev) => (prev ? `${prev} ${transcript}` : transcript))
    },
  })

  const { data: productPickerData, isFetching: isFetchingProducts } = useQuery({
    queryKey: ['commerce-product-picker', 'dm', dmChannelId],
    queryFn: () =>
      fetchApi<{ cards: CommerceProductCard[] }>(
        `/api/commerce/product-picker?target=dm&dmChannelId=${encodeURIComponent(dmChannelId!)}`,
      ),
    enabled: Boolean(dmChannelId && showProductPicker),
    staleTime: 15_000,
  })

  const productCards = productPickerData?.cards ?? []

  const addCommerceCard = useCallback((card: CommerceProductCard) => {
    setSelectedCommerceCards((prev) => {
      if (prev.some((item) => item.id === card.id)) return prev
      return [...prev, card].slice(0, 3)
    })
    setShowProductPicker(false)
    inputRef.current?.focus()
  }, [])

  const { data: dmChannel } = useQuery({
    queryKey: ['dm-channel', dmChannelId],
    queryFn: async () => {
      const channels = await fetchApi<DmChannelInfo[]>('/api/dm/channels')
      return channels.find((c) => c.id === dmChannelId) ?? null
    },
    enabled: !!dmChannelId,
  })

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
        return { messages: result.map(normalize), hasMore: result.length >= PAGE_SIZE }
      }
      return { messages: result.messages.map(normalize), hasMore: result.hasMore }
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

  useEffect(() => {
    if (!dmChannelId) return
    joinDm(dmChannelId)
    return () => leaveDm(dmChannelId)
  }, [dmChannelId])

  useEffect(() => {
    const showSub = Keyboard.addListener('keyboardDidShow', () => setKeyboardVisible(true))
    const hideSub = Keyboard.addListener('keyboardDidHide', () => setKeyboardVisible(false))
    return () => {
      showSub.remove()
      hideSub.remove()
    }
  }, [])

  const appendMessage = useCallback(
    (raw: Record<string, unknown>) => {
      if ((raw.dmChannelId as string) !== dmChannelId) return
      const msg = normalizeMessage({ ...raw, channelId: raw.dmChannelId })
      if (msg.authorId !== currentUser?.id) playReceiveSound()

      queryClient.setQueryData<DmInfiniteData>(['dm-messages', dmChannelId], (old) => {
        if (!old) return old
        const firstPage = old.pages[0]
        if (!firstPage) return old

        if (firstPage.messages.some((m) => m.id === msg.id)) {
          return {
            ...old,
            pages: old.pages.map((page) => ({
              ...page,
              messages: page.messages.map((m) => (m.id === msg.id ? msg : m)),
            })),
          }
        }

        if (msg.authorId === currentUser?.id) {
          const tempIdx = firstPage.messages.findIndex(
            (m) => m.id.startsWith('temp-') && m.authorId === msg.authorId,
          )
          if (tempIdx >= 0) {
            return {
              ...old,
              pages: [
                {
                  ...firstPage,
                  messages: firstPage.messages.map((m, i) => (i === tempIdx ? msg : m)),
                },
                ...old.pages.slice(1),
              ],
            }
          }
        }

        return {
          ...old,
          pages: [{ ...firstPage, messages: [...firstPage.messages, msg] }, ...old.pages.slice(1)],
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
        queryClient.setQueryData<DmInfiniteData>(['dm-messages', dmChannelId], (old) => {
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
        queryClient.setQueryData<DmInfiniteData>(['dm-messages', dmChannelId], (old) => {
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
        queryClient.setQueryData<DmInfiniteData>(['dm-messages', dmChannelId], (old) => {
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

  const handleInputChange = (text: string) => {
    setInputText(text)
    if (typingTimeout.current) clearTimeout(typingTimeout.current)
    typingTimeout.current = setTimeout(() => {
      if (dmChannelId) sendDmTyping(dmChannelId)
    }, 500)
  }

  const removePendingFile = useCallback((index: number) => {
    setPendingFiles((prev) => prev.filter((_, i) => i !== index))
  }, [])

  const insertOptimisticMessage = (
    content: string,
    replyToId?: string,
    commerceCards?: CommerceProductCard[],
  ) => {
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
      metadata: commerceCards && commerceCards.length > 0 ? { commerceCards } : undefined,
      sendStatus: 'sending',
    }

    queryClient.setQueryData<DmInfiniteData>(['dm-messages', dmChannelId], (old) => {
      if (!old) return old
      const firstPage = old.pages[0]
      if (!firstPage) return old
      return {
        ...old,
        pages: [{ ...firstPage, messages: [...firstPage.messages, msg] }, ...old.pages.slice(1)],
      }
    })

    requestAnimationFrame(() => {
      setTimeout(() => flatListRef.current?.scrollToOffset({ offset: 0, animated: true }), 100)
    })

    return tempId
  }

  const markMessageFailed = (tempId: string) => {
    queryClient.setQueryData<DmInfiniteData>(['dm-messages', dmChannelId], (old) => {
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

  const handleTakePhoto = async () => {
    setShowPlusMenu(false)
    const { status } = await ImagePicker.requestCameraPermissionsAsync()
    if (status !== 'granted') {
      Alert.alert('需要相机权限', '请在设置中开启相机权限以拍摄照片')
      return
    }
    const res = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      quality: 0.8,
    })
    if (!res.canceled) {
      setPendingFiles((prev) => [
        ...prev,
        ...res.assets.map((a) => ({
          uri: a.uri,
          name: a.fileName || `photo-${Date.now()}.jpg`,
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

  const handleSend = async () => {
    const content = inputText.trim()
    if (!content && pendingFiles.length === 0 && selectedCommerceCards.length === 0) return
    if (sending) return
    setSending(true)

    const metadata =
      selectedCommerceCards.length > 0 ? { commerceCards: selectedCommerceCards } : undefined
    const tempId =
      content || selectedCommerceCards.length > 0
        ? insertOptimisticMessage(content || '\u200B', replyTo?.id, selectedCommerceCards)
        : null

    const savedContent = content
    const savedReplyTo = replyTo
    const savedPendingFiles = [...pendingFiles]
    const savedMetadata = metadata
    setInputText('')
    setReplyTo(null)
    setPendingFiles([])
    setSelectedCommerceCards([])
    playSendSound()

    try {
      let uploadedAttachments:
        | Array<{ url: string; filename: string; contentType: string; size: number }>
        | undefined

      if (savedPendingFiles.length > 0) {
        uploadedAttachments = []
        for (const file of savedPendingFiles) {
          const formData = new FormData()
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
          content: savedContent || '\u200B',
          replyToId: savedReplyTo?.id,
          metadata: savedMetadata,
        })
        if (tempId) {
          setTimeout(() => {
            queryClient.setQueryData<DmInfiniteData>(['dm-messages', dmChannelId], (old) => {
              if (!old) return old
              const stillPending = old.pages.some((p) =>
                p.messages.some((m) => m.id === tempId && m.sendStatus === 'sending'),
              )
              if (!stillPending) return old
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
              ...(savedMetadata ? { metadata: savedMetadata } : {}),
              ...(uploadedAttachments ? { attachments: uploadedAttachments } : {}),
            }),
          },
        )

        if (tempId) {
          const realMsg = normalizeMessage({ ...created, channelId: created.dmChannelId })
          queryClient.setQueryData<DmInfiniteData>(['dm-messages', dmChannelId], (old) => {
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
      queryClient.setQueryData<DmInfiniteData>(['dm-messages', dmChannelId], (old) => {
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
        failedMsg.replyToId ? (messages.find((m) => m.id === failedMsg.replyToId) ?? null) : null,
      )
    },
    [queryClient, dmChannelId, messages],
  )

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

  const otherUser = dmChannel?.otherUser

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View
        style={[styles.header, { backgroundColor: colors.surface, paddingTop: insets.top + 4 }]}
      >
        <Pressable hitSlop={12} onPress={() => router.back()} style={styles.backBtn}>
          <ChevronLeft size={22} color={colors.text} />
        </Pressable>
        {otherUser && (
          <Pressable
            style={styles.headerUser}
            onPress={() => router.push(`/(main)/profile/${otherUser.id}` as never)}
          >
            <View style={styles.headerAvatarWrap}>
              <Avatar
                uri={otherUser.avatarUrl}
                name={otherUser.displayName || otherUser.username}
                size={32}
                userId={otherUser.id}
              />
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
              <Text
                style={[
                  styles.headerStatus,
                  { color: statusColors[otherUser.status] ?? colors.textMuted },
                ]}
              >
                {statusLabel[otherUser.status] ?? statusLabel.offline}
              </Text>
            </View>
          </Pressable>
        )}
      </View>

      {isLoading && (
        <View style={styles.loadingCenter}>
          <ActivityIndicator color={colors.primary} size="small" />
        </View>
      )}

      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={(item) => item.id}
        inverted
        extraData={selectionMode ? selectedMessageIds : null}
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
              selectionMode={selectionMode}
              isSelected={selectedMessageIds.has(item.id)}
              onToggleSelect={(id) => {
                setSelectedMessageIds((prev) => {
                  const next = new Set(prev)
                  if (next.has(id)) next.delete(id)
                  else next.add(id)
                  return next
                })
              }}
              onEnterSelectionMode={(id) => {
                setSelectionMode(true)
                setSelectedMessageIds(new Set([id]))
              }}
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
        onScrollBeginDrag={() => Keyboard.dismiss()}
        keyboardDismissMode="interactive"
        keyboardShouldPersistTaps="handled"
      />

      {showScrollBottom && (
        <Pressable
          style={[
            styles.scrollFab,
            { backgroundColor: colors.surface, borderColor: colors.border },
          ]}
          onPress={() => flatListRef.current?.scrollToOffset({ offset: 0, animated: true })}
        >
          <ChevronDown size={18} color={colors.textMuted} />
        </Pressable>
      )}

      {selectionMode ? (
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            paddingHorizontal: spacing.md,
            paddingVertical: spacing.sm,
            paddingBottom: insets.bottom + spacing.sm,
            backgroundColor: colors.surface,
            borderTopWidth: StyleSheet.hairlineWidth,
            borderTopColor: colors.border,
            gap: spacing.sm,
          }}
        >
          <Text style={{ color: colors.textSecondary, fontSize: fontSize.sm, flex: 1 }}>
            {t('chat.selectedCount', {
              count: selectedMessageIds.size,
              defaultValue: `已选 ${selectedMessageIds.size} 条`,
            })}
          </Text>
          <Pressable
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 4,
              paddingHorizontal: spacing.md,
              paddingVertical: spacing.sm,
              backgroundColor: colors.primary,
              borderRadius: radius.md,
              opacity: selectedMessageIds.size === 0 ? 0.5 : 1,
            }}
            onPress={async () => {
              const sorted = messages
                .filter((m) => selectedMessageIds.has(m.id))
                .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
              const md = sorted
                .map((m) => {
                  const author = m.author?.displayName || m.author?.username || 'Unknown'
                  return `**${author}**\n${m.content}`
                })
                .join('\n\n---\n\n')
              await Clipboard.setStringAsync(md)
              setSelectionMode(false)
              setSelectedMessageIds(new Set())
            }}
            disabled={selectedMessageIds.size === 0}
          >
            <Copy size={14} color="#fff" />
            <Text style={{ color: '#fff', fontWeight: '600', fontSize: fontSize.sm }}>
              Markdown
            </Text>
          </Pressable>
          <Pressable
            style={{
              paddingHorizontal: spacing.md,
              paddingVertical: spacing.sm,
              backgroundColor: colors.inputBackground,
              borderRadius: radius.md,
            }}
            onPress={() => {
              setSelectionMode(false)
              setSelectedMessageIds(new Set())
            }}
          >
            <Text style={{ color: colors.textSecondary, fontSize: fontSize.sm }}>
              {t('common.cancel', '取消')}
            </Text>
          </Pressable>
        </View>
      ) : (
        <ChatComposer
          inputText={inputText}
          onInputChange={handleInputChange}
          onSend={handleSend}
          inputRef={inputRef}
          pendingFiles={pendingFiles}
          onRemovePendingFile={removePendingFile}
          replyTo={replyTo}
          onClearReply={() => setReplyTo(null)}
          typingUsers={typingUsers}
          isRecording={isRecording}
          voiceTranscript={voiceTranscript}
          keyboardVisible={keyboardVisible}
          insetsBottom={insets.bottom}
          canUseVoice={true}
          onToggleVoice={toggleVoiceInput}
          showAtButton={false}
          showEmojiPicker={showInputEmojiPicker}
          setShowEmojiPicker={setShowInputEmojiPicker}
          showPlusMenu={showPlusMenu}
          setShowPlusMenu={setShowPlusMenu}
          onPickImage={handlePickImage}
          onPickFile={handlePickFile}
          onTakePhoto={handleTakePhoto}
          commerceCards={selectedCommerceCards}
          onOpenProductPicker={() => setShowProductPicker(true)}
          onRemoveCommerceCard={(cardId) =>
            setSelectedCommerceCards((prev) => prev.filter((card) => card.id !== cardId))
          }
          onPasteImage={(imageDataUri) => {
            const timestamp = Date.now()
            const fileName = `clipboard_${timestamp}.png`
            setPendingFiles((prev) => [
              ...prev,
              {
                uri: imageDataUri,
                name: fileName,
                type: 'image/png',
              },
            ])
          }}
        />
      )}
      <Modal
        visible={showProductPicker}
        animationType="slide"
        transparent
        onRequestClose={() => setShowProductPicker(false)}
      >
        <View style={styles.sheetOverlay}>
          <Pressable style={styles.sheetDismiss} onPress={() => setShowProductPicker(false)} />
          <View style={[styles.sheetContainer, { backgroundColor: colors.surface }]}>
            <View style={[styles.sheetHandle, { backgroundColor: colors.textMuted }]} />
            <View style={styles.sheetHeader}>
              <Text style={[styles.sheetTitle, { color: colors.text }]}>
                {t('chat.productPicker')}
              </Text>
              <Pressable
                onPress={() => setShowProductPicker(false)}
                hitSlop={8}
                style={styles.sheetActionBtn}
              >
                <X size={20} color={colors.textMuted} />
              </Pressable>
            </View>
            {isFetchingProducts ? (
              <View style={styles.productPickerState}>
                <ActivityIndicator color={colors.primary} />
                <Text style={{ color: colors.textMuted, fontSize: fontSize.sm }}>
                  {t('chat.productPickerLoading')}
                </Text>
              </View>
            ) : productCards.length === 0 ? (
              <View style={styles.productPickerState}>
                <Text style={{ color: colors.textMuted, fontSize: fontSize.sm }}>
                  {t('chat.productPickerEmpty')}
                </Text>
              </View>
            ) : (
              <FlatList
                data={productCards}
                keyExtractor={(item) => item.id}
                contentContainerStyle={styles.productPickerList}
                renderItem={({ item }) => (
                  <Pressable
                    style={({ pressed }) => [
                      styles.productPickerItem,
                      { borderColor: colors.border, backgroundColor: colors.inputBackground },
                      pressed && { opacity: 0.75 },
                    ]}
                    onPress={() => addCommerceCard(item)}
                  >
                    <View
                      style={[styles.productPickerIcon, { backgroundColor: `${colors.primary}18` }]}
                    >
                      <ShoppingBag size={22} color={colors.primary} />
                    </View>
                    <View style={styles.productPickerInfo}>
                      <Text
                        style={[styles.productPickerName, { color: colors.text }]}
                        numberOfLines={1}
                      >
                        {item.snapshot.name}
                      </Text>
                      {item.snapshot.summary ? (
                        <Text
                          style={[styles.productPickerSummary, { color: colors.textMuted }]}
                          numberOfLines={2}
                        >
                          {item.snapshot.summary}
                        </Text>
                      ) : null}
                    </View>
                    <Text style={[styles.productPickerPrice, { color: colors.primary }]}>
                      {new Intl.NumberFormat(undefined, {
                        style: 'currency',
                        currency: item.snapshot.currency,
                        maximumFractionDigits: 2,
                      }).format(item.snapshot.price / 100)}
                    </Text>
                  </Pressable>
                )}
              />
            )}
          </View>
        </View>
      </Modal>
    </View>
  )
}

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
  backBtn: { padding: 4 },
  headerUser: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flex: 1 },
  headerAvatarWrap: { position: 'relative' },
  headerStatusDot: {
    position: 'absolute',
    bottom: -1,
    right: -1,
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
  },
  headerName: { fontSize: fontSize.md, fontWeight: '700' },
  headerStatus: { fontSize: fontSize.xs },
  loadingCenter: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  listContent: { paddingVertical: spacing.sm, paddingHorizontal: spacing.xs },
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
  sheetOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  sheetDismiss: { flex: 1 },
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
  sheetActionBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  productPickerState: {
    minHeight: 180,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  productPickerList: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
    gap: spacing.sm,
  },
  productPickerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.lg,
    padding: spacing.sm,
  },
  productPickerIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  productPickerInfo: { flex: 1, minWidth: 0 },
  productPickerName: { fontSize: fontSize.md, fontWeight: '700' },
  productPickerSummary: { fontSize: fontSize.xs, marginTop: 3, lineHeight: 16 },
  productPickerPrice: { fontSize: fontSize.sm, fontWeight: '800' },
})
