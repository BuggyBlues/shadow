import { format, formatDistanceToNow, type Locale } from 'date-fns'
import { enUS, ja, ko, zhCN, zhTW } from 'date-fns/locale'
import {
  Check,
  Copy,
  ExternalLink,
  MoreHorizontal,
  Paperclip,
  Pencil,
  Reply,
  Smile,
  Trash2,
  X,
} from 'lucide-react'
import { useCallback, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { fetchApi } from '../../lib/api'
import { UserAvatar } from '../common/avatar'
import { EmojiPicker } from '../common/emoji-picker'

interface Author {
  id: string
  username: string
  displayName: string
  avatarUrl: string | null
  isBot: boolean
}

interface ReactionGroup {
  emoji: string
  count: number
  userIds: string[]
}

interface Attachment {
  id: string
  filename: string
  url: string
  contentType: string
  size: number
}

interface Message {
  id: string
  content: string
  channelId: string
  authorId: string
  threadId: string | null
  replyToId: string | null
  isEdited: boolean
  isPinned: boolean
  createdAt: string
  updatedAt?: string
  author?: Author
  reactions?: ReactionGroup[]
  attachments?: Attachment[]
}

interface MessageBubbleProps {
  message: Message
  currentUserId: string
  onReply?: (messageId: string) => void
  onReact?: (messageId: string, emoji: string) => void
  onMessageUpdate?: (msg: Message) => void
  onMessageDelete?: (msgId: string) => void
  highlight?: boolean
  replyToMessage?: Message | null
}

const quickEmojis = ['👍', '❤️', '😂', '🎉', '🤔', '👀']

function isImageType(contentType: string): boolean {
  return contentType.startsWith('image/')
}

export function MessageBubble({
  message,
  currentUserId,
  onReply,
  onReact,
  onMessageUpdate,
  onMessageDelete,
  highlight,
  replyToMessage,
}: MessageBubbleProps) {
  const { t, i18n } = useTranslation()
  const [showActions, setShowActions] = useState(false)
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)
  const [showFullPicker, setShowFullPicker] = useState(false)
  const [showMoreMenu, setShowMoreMenu] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [editContent, setEditContent] = useState('')
  const [copied, setCopied] = useState(false)
  const editInputRef = useRef<HTMLTextAreaElement>(null)

  const isOwn = message.authorId === currentUserId

  const handleEdit = useCallback(() => {
    setEditContent(message.content)
    setIsEditing(true)
    setShowMoreMenu(false)
    setTimeout(() => editInputRef.current?.focus(), 50)
  }, [message.content])

  const handleSaveEdit = useCallback(async () => {
    if (!editContent.trim() || editContent.trim() === message.content) {
      setIsEditing(false)
      return
    }
    try {
      const updated = await fetchApi<Message>(`/api/messages/${message.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ content: editContent.trim() }),
      })
      onMessageUpdate?.(updated)
      setIsEditing(false)
    } catch {
      /* keep editing on error */
    }
  }, [editContent, message.id, message.content, onMessageUpdate])

  const handleDelete = useCallback(async () => {
    setShowMoreMenu(false)
    if (!confirm(t('chat.deleteConfirm'))) return
    try {
      await fetchApi(`/api/messages/${message.id}`, { method: 'DELETE' })
      onMessageDelete?.(message.id)
    } catch {
      /* ignore */
    }
  }, [message.id, onMessageDelete, t])

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(message.content)
    setCopied(true)
    setShowMoreMenu(false)
    setTimeout(() => setCopied(false), 2000)
  }, [message.content])

  const handleShareLink = useCallback(() => {
    const url = `${window.location.origin}${window.location.pathname}?msg=${message.id}`
    navigator.clipboard.writeText(url)
    setCopied(true)
    setShowMoreMenu(false)
    setTimeout(() => setCopied(false), 2000)
  }, [message.id])

  const dateFnsLocaleMap: Record<string, Locale> = {
    'zh-CN': zhCN,
    'zh-TW': zhTW,
    en: enUS,
    ja,
    ko,
  }
  const author = message.author
  const time = formatDistanceToNow(new Date(message.createdAt), {
    locale: dateFnsLocaleMap[i18n.language] ?? zhCN,
    addSuffix: true,
  })

  return (
    <div
      id={`msg-${message.id}`}
      className={`group relative flex gap-3 px-4 py-1.5 hover:bg-white/[0.02] transition ${highlight ? 'bg-primary/10 animate-pulse' : ''}`}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => {
        if (!showMoreMenu) {
          setShowActions(false)
          setShowEmojiPicker(false)
          setShowFullPicker(false)
        }
      }}
    >
      {/* Avatar */}
      <UserAvatar
        userId={author?.id}
        avatarUrl={author?.avatarUrl}
        displayName={author?.displayName ?? author?.username}
        size="md"
        className="mt-0.5"
      />

      {/* Content */}
      <div className="flex-1 min-w-0">
        {/* Reply reference */}
        {replyToMessage && (
          <button
            type="button"
            onClick={() => {
              const el = document.getElementById(`msg-${replyToMessage.id}`)
              el?.scrollIntoView({ behavior: 'smooth', block: 'center' })
            }}
            className="flex items-center gap-1.5 mb-1 text-xs text-text-muted hover:text-text-secondary transition"
          >
            <Reply size={12} className="shrink-0" />
            <span className="font-medium">
              {replyToMessage.author?.displayName ??
                replyToMessage.author?.username ??
                t('common.unknownUser')}
            </span>
            <span className="truncate max-w-[300px] opacity-70">{replyToMessage.content}</span>
          </button>
        )}
        <div className="flex items-baseline gap-2">
          <span
            className={`font-semibold text-sm ${author?.isBot ? 'text-primary' : 'text-text-primary'}`}
          >
            {author?.displayName ?? author?.username ?? t('common.unknownUser')}
          </span>
          {author?.isBot && (
            <span className="text-[10px] bg-primary/20 text-primary px-1.5 py-0.5 rounded font-medium">
              {t('common.bot')}
            </span>
          )}
          <span className="text-xs text-text-muted">{time}</span>
          {message.isEdited && (
            <span
              className="text-[10px] text-text-muted cursor-help"
              title={format(new Date(message.updatedAt ?? message.createdAt), 'PPpp', {
                locale: dateFnsLocaleMap[i18n.language] ?? zhCN,
              })}
            >
              {t('chat.edited')}
            </span>
          )}
        </div>

        {/* Inline edit mode */}
        {isEditing ? (
          <div className="mt-1">
            <textarea
              ref={editInputRef}
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  handleSaveEdit()
                } else if (e.key === 'Escape') {
                  setIsEditing(false)
                }
              }}
              className="w-full bg-bg-tertiary text-text-primary rounded-lg px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-primary resize-none"
              rows={Math.min(editContent.split('\n').length + 1, 8)}
            />
            <div className="flex items-center gap-2 mt-1 text-xs text-text-muted">
              <span>Esc {t('common.cancel')}</span>
              <span>·</span>
              <span>Enter {t('common.save')}</span>
              <div className="flex-1" />
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className="p-1 text-text-muted hover:text-text-primary transition"
              >
                <X size={14} />
              </button>
              <button
                type="button"
                onClick={handleSaveEdit}
                className="p-1 text-primary hover:text-primary-hover transition"
              >
                <Check size={14} />
              </button>
            </div>
          </div>
        ) : (
          /* Markdown content */
          <div className="text-sm text-text-secondary leading-relaxed break-words msg-markdown">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                img: ({ src, alt }) => (
                  <a href={src} target="_blank" rel="noopener noreferrer">
                    <img src={src} alt={alt ?? ''} loading="lazy" />
                  </a>
                ),
              }}
            >
              {message.content}
            </ReactMarkdown>
          </div>
        )}

        {/* Attachments */}
        {message.attachments && message.attachments.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-2">
            {message.attachments.map((att) =>
              isImageType(att.contentType) ? (
                <a
                  key={att.id}
                  href={att.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block max-w-xs rounded-lg overflow-hidden border border-white/10"
                >
                  <img src={att.url} alt={att.filename} className="max-h-60 object-contain" />
                </a>
              ) : (
                <a
                  key={att.id}
                  href={att.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-3 py-2 rounded-lg bg-bg-tertiary border border-white/10 text-sm text-text-secondary hover:text-text-primary transition"
                >
                  <Paperclip size={14} className="shrink-0" />
                  <span className="truncate max-w-[200px]">{att.filename}</span>
                  <span className="text-xs text-text-muted shrink-0">
                    {(att.size / 1024).toFixed(0)} KB
                  </span>
                </a>
              ),
            )}
          </div>
        )}

        {/* Reactions */}
        {message.reactions && message.reactions.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1.5">
            {message.reactions.map((r) => (
              <button
                type="button"
                key={r.emoji}
                onClick={() => onReact?.(message.id, r.emoji)}
                className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs border transition ${
                  (r.userIds ?? []).includes(currentUserId)
                    ? 'bg-primary/20 border-primary/50 text-primary'
                    : 'bg-bg-tertiary border-white/5 text-text-muted hover:border-white/10'
                }`}
              >
                <span>{r.emoji}</span>
                <span>{r.count}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Hover actions */}
      {showActions && (
        <div className="absolute -top-3 right-4 flex items-center bg-bg-tertiary border border-white/10 rounded-lg shadow-lg">
          <button
            type="button"
            onClick={() => setShowEmojiPicker(!showEmojiPicker)}
            className="p-1.5 text-text-muted hover:text-text-primary transition"
            title={t('chat.addEmoji')}
          >
            <Smile size={16} />
          </button>
          <button
            type="button"
            onClick={() => onReply?.(message.id)}
            className="p-1.5 text-text-muted hover:text-text-primary transition"
            title={t('chat.reply')}
          >
            <Reply size={16} />
          </button>
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowMoreMenu(!showMoreMenu)}
              className="p-1.5 text-text-muted hover:text-text-primary transition"
              title={t('chat.more')}
            >
              <MoreHorizontal size={16} />
            </button>
            {/* More dropdown menu */}
            {showMoreMenu && (
              <div className="absolute top-full right-0 mt-1 bg-bg-tertiary border border-white/10 rounded-lg shadow-xl py-1 min-w-[160px] z-50">
                {isOwn && (
                  <button
                    type="button"
                    onClick={handleEdit}
                    className="flex items-center gap-2 w-full px-3 py-2 text-sm text-text-secondary hover:bg-bg-primary/50 hover:text-text-primary transition"
                  >
                    <Pencil size={14} />
                    {t('chat.editMessage')}
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleCopy}
                  className="flex items-center gap-2 w-full px-3 py-2 text-sm text-text-secondary hover:bg-bg-primary/50 hover:text-text-primary transition"
                >
                  <Copy size={14} />
                  {copied ? t('common.copied') : t('chat.copyMessage')}
                </button>
                <button
                  type="button"
                  onClick={handleShareLink}
                  className="flex items-center gap-2 w-full px-3 py-2 text-sm text-text-secondary hover:bg-bg-primary/50 hover:text-text-primary transition"
                >
                  <ExternalLink size={14} />
                  {t('chat.shareLink')}
                </button>
                {isOwn && (
                  <>
                    <div className="h-px bg-white/5 my-1" />
                    <button
                      type="button"
                      onClick={handleDelete}
                      className="flex items-center gap-2 w-full px-3 py-2 text-sm text-red-400 hover:bg-red-500/10 transition"
                    >
                      <Trash2 size={14} />
                      {t('chat.deleteMessage')}
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Quick emoji picker */}
      {showEmojiPicker && (
        <div className="absolute -top-10 right-4 flex items-center gap-1 bg-bg-tertiary border border-white/10 rounded-lg shadow-lg p-1">
          {quickEmojis.map((emoji) => (
            <button
              type="button"
              key={emoji}
              onClick={() => {
                onReact?.(message.id, emoji)
                setShowEmojiPicker(false)
              }}
              className="w-8 h-8 rounded hover:bg-white/10 flex items-center justify-center text-lg transition"
            >
              {emoji}
            </button>
          ))}
          <div className="w-px h-6 bg-white/10 mx-0.5" />
          <button
            type="button"
            onClick={() => {
              setShowEmojiPicker(false)
              setShowFullPicker(true)
            }}
            className="w-8 h-8 rounded hover:bg-white/10 flex items-center justify-center text-sm text-text-muted transition"
            title={t('chat.addEmoji')}
          >
            +
          </button>
        </div>
      )}

      {/* Full emoji picker */}
      {showFullPicker && (
        <div className="absolute -top-[440px] right-4 z-50">
          <EmojiPicker
            onSelect={(emoji) => {
              onReact?.(message.id, emoji)
            }}
            onClose={() => setShowFullPicker(false)}
            position="bottom"
          />
        </div>
      )}
    </div>
  )
}
