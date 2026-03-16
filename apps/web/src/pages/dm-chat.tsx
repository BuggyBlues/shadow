import { useInfiniteQuery, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate, useParams } from '@tanstack/react-router'
import { ArrowLeft, Loader2, Send, Smile } from 'lucide-react'
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { UserAvatar } from '../components/common/avatar'
import { EmojiPicker } from '../components/common/emoji-picker'
import { useSocketEvent } from '../hooks/use-socket'
import { fetchApi } from '../lib/api'
import { joinDm, leaveDm, sendDmMessage, sendDmTyping } from '../lib/socket'
import { playReceiveSound, playSendSound } from '../lib/sounds'
import { useAuthStore } from '../stores/auth.store'

interface Author {
  id: string
  username: string
  displayName: string
  avatarUrl: string | null
  isBot: boolean
}

interface DmMessage {
  id: string
  content: string
  dmChannelId: string
  authorId: string
  isEdited: boolean
  createdAt: string
  updatedAt?: string
  author?: Author
}

interface DmChannelInfo {
  id: string
  userAId: string
  userBId: string
  lastMessageAt: string | null
  createdAt: string
  otherUser?: {
    id: string
    username: string
    displayName: string | null
    avatarUrl: string | null
    status: string
    isBot: boolean
  }
}

/** Reusable DM chat view — can be embedded inline or used as standalone page */
export function DmChatView({ dmChannelId, onBack }: { dmChannelId: string; onBack?: () => void }) {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const user = useAuthStore((s) => s.user)
  const scrollRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const [messageText, setMessageText] = useState('')
  const [typingUsers, setTypingUsers] = useState<string[]>([])
  const [showEmoji, setShowEmoji] = useState(false)
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout>>(undefined)
  const lastTypingSent = useRef(0)

  // Fetch DM channel info (includes otherUser)
  const { data: dmChannels = [] } = useQuery({
    queryKey: ['dm-channels'],
    queryFn: () => fetchApi<DmChannelInfo[]>('/api/dm/channels'),
  })

  const dmChannel = dmChannels.find((c) => c.id === dmChannelId)
  const otherUser = dmChannel?.otherUser

  // Fetch messages
  const {
    data: messagesData,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
  } = useInfiniteQuery({
    queryKey: ['dm-messages', dmChannelId],
    queryFn: ({ pageParam }: { pageParam: string | undefined }) =>
      fetchApi<DmMessage[]>(
        `/api/dm/channels/${dmChannelId}/messages?limit=50${pageParam ? `&cursor=${pageParam}` : ''}`,
      ),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => {
      if (lastPage.length < 50) return undefined
      return lastPage[lastPage.length - 1]?.createdAt
    },
  })

  const allMessages = (messagesData?.pages.flat() ?? []).slice().reverse()

  // Join/leave DM socket room
  useLayoutEffect(() => {
    joinDm(dmChannelId)
    return () => {
      leaveDm(dmChannelId)
    }
  }, [dmChannelId])

  // Listen for new DM messages
  useSocketEvent<DmMessage>('dm:message', (msg) => {
    if (msg.dmChannelId !== dmChannelId) return
    queryClient.setQueryData(
      ['dm-messages', dmChannelId],
      (old: { pages: DmMessage[][]; pageParams: (string | undefined)[] } | undefined) => {
        if (!old) return old
        const newPages = [...old.pages]
        newPages[0] = [msg, ...(newPages[0] ?? [])]
        return { ...old, pages: newPages }
      },
    )
    // Play sound if not from self
    if (msg.authorId !== user?.id) {
      playReceiveSound()
    }
    // Auto-scroll to bottom
    requestAnimationFrame(() => {
      scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight })
    })
  })

  // Typing indicator
  useSocketEvent<{ dmChannelId: string; userId: string; username: string }>('dm:typing', (data) => {
    if (data.dmChannelId !== dmChannelId || data.userId === user?.id) return
    setTypingUsers((prev) => (prev.includes(data.username) ? prev : [...prev, data.username]))
    // Clear after 3s
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current)
    typingTimeoutRef.current = setTimeout(() => setTypingUsers([]), 3000)
  })

  // Scroll to bottom on initial load
  useEffect(() => {
    if (!isLoading && allMessages.length > 0) {
      requestAnimationFrame(() => {
        scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight })
      })
    }
  }, [isLoading, allMessages.length])

  // Send message
  const handleSend = useCallback(() => {
    const content = messageText.trim()
    if (!content) return
    sendDmMessage({ dmChannelId, content })
    playSendSound()
    setMessageText('')
    inputRef.current?.focus()
  }, [messageText, dmChannelId])

  // Handle typing events
  const handleTyping = useCallback(() => {
    const now = Date.now()
    if (now - lastTypingSent.current > 2000) {
      sendDmTyping(dmChannelId)
      lastTypingSent.current = now
    }
  }, [dmChannelId])

  // Load more on scroll to top
  const handleScroll = useCallback(() => {
    if (
      scrollRef.current &&
      scrollRef.current.scrollTop < 200 &&
      hasNextPage &&
      !isFetchingNextPage
    ) {
      fetchNextPage()
    }
  }, [fetchNextPage, hasNextPage, isFetchingNextPage])

  const statusColor: Record<string, string> = {
    online: 'bg-[#23a559]',
    idle: 'bg-amber-500',
    dnd: 'bg-danger',
    offline: 'bg-text-muted',
  }

  return (
    <div className="flex-1 flex flex-col bg-bg-primary min-h-0">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-2.5 border-b border-border-subtle bg-bg-primary shrink-0 shadow-sm">
        <button
          onClick={() => onBack?.()}
          className="md:hidden w-8 h-8 rounded-full hover:bg-bg-modifier-hover flex items-center justify-center text-text-secondary"
        >
          <ArrowLeft size={18} />
        </button>
        <span className="text-text-muted text-lg font-medium">@</span>
        <div className="relative">
          <UserAvatar
            userId={otherUser?.id ?? ''}
            avatarUrl={otherUser?.avatarUrl ?? null}
            displayName={otherUser?.displayName ?? otherUser?.username ?? '?'}
            size="sm"
          />
          <span
            className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-bg-primary ${statusColor[otherUser?.status ?? 'offline'] ?? statusColor.offline}`}
          />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-text-primary text-sm truncate">
            {otherUser?.displayName ?? otherUser?.username ?? t('friends.chat', '聊天')}
          </h3>
          {otherUser?.isBot && (
            <span className="text-[10px] font-bold text-primary bg-primary/10 rounded px-1 py-0.5">
              BOT
            </span>
          )}
        </div>
      </div>

      {/* Messages Area */}
      <div ref={scrollRef} onScroll={handleScroll} className="flex-1 overflow-y-auto px-4 py-4">
        {isFetchingNextPage && (
          <div className="flex justify-center py-3">
            <Loader2 size={20} className="animate-spin text-text-muted" />
          </div>
        )}

        {/* DM Welcome  */}
        {!hasNextPage && otherUser && (
          <div className="mb-8 pt-8">
            <UserAvatar
              userId={otherUser.id}
              avatarUrl={otherUser.avatarUrl}
              displayName={otherUser.displayName ?? otherUser.username}
              size="xl"
            />
            <h2 className="text-xl font-bold text-text-primary mt-3">
              {otherUser.displayName ?? otherUser.username}
            </h2>
            <p className="text-text-muted text-sm mt-1">{otherUser.username}</p>
            <p className="text-text-secondary text-sm mt-2">
              {t(
                'dm.welcomeMessage',
                `这是你与 ${otherUser.displayName ?? otherUser.username} 的聊天记录的开始。`,
              )}
            </p>
            <div className="w-full h-px bg-border-subtle mt-6" />
          </div>
        )}

        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-16">
            <Loader2 size={32} className="animate-spin text-text-muted" />
          </div>
        ) : allMessages.length === 0 ? (
          <div className="text-center py-8 text-text-muted text-sm">
            {t('dm.noMessages', '还没有消息，发送第一条消息开始聊天吧！')}
          </div>
        ) : (
          <div className="space-y-0.5">
            {allMessages.map((msg, idx) => {
              const prevMsg = idx > 0 ? allMessages[idx - 1] : null
              const showHeader =
                !prevMsg ||
                prevMsg.authorId !== msg.authorId ||
                new Date(msg.createdAt).getTime() - new Date(prevMsg.createdAt).getTime() >
                  5 * 60 * 1000

              return (
                <div
                  key={msg.id}
                  className={`group flex gap-3 px-2 py-0.5 hover:bg-bg-modifier-hover rounded transition ${showHeader ? 'mt-4' : ''}`}
                >
                  {showHeader ? (
                    <UserAvatar
                      userId={msg.author?.id ?? msg.authorId}
                      avatarUrl={msg.author?.avatarUrl ?? null}
                      displayName={msg.author?.displayName ?? msg.author?.username ?? '?'}
                      size="md"
                    />
                  ) : (
                    <div className="w-10 shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    {showHeader && (
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="font-semibold text-text-primary text-sm">
                          {msg.author?.displayName ?? msg.author?.username ?? '?'}
                        </span>
                        {msg.author?.isBot && (
                          <span className="px-1 py-0.5 rounded bg-primary/10 text-primary text-[10px] font-bold">
                            BOT
                          </span>
                        )}
                        <span className="text-text-muted text-[11px]">
                          {new Date(msg.createdAt).toLocaleString()}
                        </span>
                      </div>
                    )}
                    <div className="text-text-primary text-sm whitespace-pre-wrap break-words">
                      {msg.content}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Typing indicator */}
      {typingUsers.length > 0 && (
        <div className="px-4 py-1 text-[12px] text-text-muted">
          <span className="font-medium">{typingUsers.join(', ')}</span>{' '}
          {t('chat.typing', '正在输入...')}
        </div>
      )}

      {/* Message input */}
      <div className="px-4 pb-4 pt-1 shrink-0">
        <div className="flex items-end gap-2 bg-bg-secondary rounded-lg border border-border-subtle">
          <textarea
            ref={inputRef}
            value={messageText}
            onChange={(e) => {
              setMessageText(e.target.value)
              handleTyping()
            }}
            onKeyDown={(e) => {
              if (
                e.key === 'Enter' &&
                !e.shiftKey &&
                !e.nativeEvent.isComposing &&
                e.keyCode !== 229
              ) {
                e.preventDefault()
                handleSend()
              }
            }}
            placeholder={
              otherUser
                ? t(
                    'dm.inputPlaceholder',
                    `给 @${otherUser.displayName ?? otherUser.username} 发送消息`,
                  )
                : t('dm.inputPlaceholderDefault', '发送消息')
            }
            rows={1}
            className="flex-1 bg-transparent text-text-primary text-sm px-4 py-3 outline-none resize-none max-h-[160px]"
            style={{ minHeight: '44px' }}
          />
          <div className="flex items-center gap-1 px-2 pb-2">
            <div className="relative">
              <button
                onClick={() => setShowEmoji(!showEmoji)}
                className="w-8 h-8 rounded hover:bg-bg-modifier-hover flex items-center justify-center text-text-muted hover:text-text-primary transition"
              >
                <Smile size={18} />
              </button>
              {showEmoji && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowEmoji(false)} />
                  <div className="absolute bottom-10 right-0 z-50">
                    <EmojiPicker
                      onSelect={(emoji) => {
                        setMessageText((prev) => prev + emoji)
                        setShowEmoji(false)
                        inputRef.current?.focus()
                      }}
                      onClose={() => setShowEmoji(false)}
                    />
                  </div>
                </>
              )}
            </div>
            <button
              onClick={handleSend}
              disabled={!messageText.trim()}
              className="w-8 h-8 rounded hover:bg-primary/10 flex items-center justify-center text-primary disabled:text-text-muted disabled:hover:bg-transparent transition"
            >
              <Send size={18} />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

/** Standalone DM chat page (used by router) */
export function DmChatPage() {
  const { dmChannelId } = useParams({ strict: false }) as { dmChannelId: string }
  const navigate = useNavigate()
  return <DmChatView dmChannelId={dmChannelId} onBack={() => navigate({ to: '/settings' })} />
}
