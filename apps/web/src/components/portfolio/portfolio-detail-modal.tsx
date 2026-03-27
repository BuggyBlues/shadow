import type { PortfolioWithOwner } from '@shadowob/shared'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Bookmark, ChevronRight, Eye, Heart, MessageCircle, MoreHorizontal, X } from 'lucide-react'
import { useState } from 'react'
import { fetchApi } from '../../lib/api'
import { useAuthStore } from '../../stores/auth.store'
import { UserAvatar } from '../common/avatar'
import { PortfolioPreview } from './portfolio-preview'

interface PortfolioDetailModalProps {
  portfolio: PortfolioWithOwner
  onClose: () => void
}

export function PortfolioDetailModal({ portfolio, onClose }: PortfolioDetailModalProps) {
  const currentUser = useAuthStore((s) => s.user)
  const queryClient = useQueryClient()
  const [showComments, setShowComments] = useState(false)

  const isOwner = currentUser?.id === portfolio.ownerId

  // Record view
  useMutation({
    mutationFn: () => fetchApi(`/api/portfolios/${portfolio.id}/view`, { method: 'POST' }),
  }).mutate()

  // Like mutation
  const likeMutation = useMutation({
    mutationFn: () =>
      fetchApi<{ liked: boolean }>(`/api/portfolios/${portfolio.id}/like`, { method: 'POST' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['portfolio'] })
    },
  })

  // Favorite mutation
  const favoriteMutation = useMutation({
    mutationFn: () =>
      fetchApi<{ favorited: boolean }>(`/api/portfolios/${portfolio.id}/favorite`, {
        method: 'POST',
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['portfolio'] })
    },
  })

  // Comments
  const { data: commentsData } = useQuery({
    queryKey: ['portfolio-comments', portfolio.id],
    queryFn: () =>
      fetchApi<{
        items: Array<{
          id: string
          content: string
          createdAt: string
          author: {
            id: string
            username: string
            displayName: string | null
            avatarUrl: string | null
          }
        }>
      }>(`/api/portfolios/${portfolio.id}/comments?limit=20`),
    enabled: showComments,
  })

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
      onClick={onClose}
      onKeyDown={(e) => e.key === 'Escape' && onClose()}
    >
      <div
        className="relative w-full max-w-5xl max-h-[90vh] bg-bg-secondary rounded-2xl overflow-hidden flex flex-col md:flex-row"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 z-10 w-10 h-10 rounded-full bg-black/50 flex items-center justify-center text-white hover:bg-black/70 transition"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Preview area */}
        <div className="flex-1 min-h-0 bg-black flex items-center justify-center">
          <PortfolioPreview portfolio={portfolio} />
        </div>

        {/* Sidebar */}
        <div className="w-full md:w-80 flex-shrink-0 flex flex-col border-t md:border-t-0 md:border-l border-border-subtle">
          {/* Header */}
          <div className="p-4 border-b border-border-subtle">
            {/* Owner */}
            <div className="flex items-center gap-3 mb-4">
              <UserAvatar
                userId={portfolio.owner.id}
                avatarUrl={portfolio.owner.avatarUrl}
                displayName={portfolio.owner.displayName}
                size="md"
              />
              <div className="flex-1 min-w-0">
                <p className="font-medium text-text-primary truncate">
                  {portfolio.owner.displayName || portfolio.owner.username}
                </p>
                <p className="text-xs text-text-muted">@{portfolio.owner.username}</p>
              </div>
              {portfolio.owner.isBot && (
                <span className="text-xs bg-primary/20 text-primary px-2 py-0.5 rounded font-medium">
                  Buddy
                </span>
              )}
            </div>

            {/* Title & Description */}
            {portfolio.title && (
              <h2 className="text-lg font-bold text-text-primary mb-1">{portfolio.title}</h2>
            )}
            {portfolio.description && (
              <p className="text-sm text-text-secondary whitespace-pre-wrap">
                {portfolio.description}
              </p>
            )}

            {/* Stats */}
            <div className="flex items-center gap-4 mt-3 text-sm text-text-muted">
              <span className="flex items-center gap-1">
                <Eye className="w-4 h-4" />
                {portfolio.viewCount}
              </span>
              <span className="flex items-center gap-1">
                <Heart className="w-4 h-4" />
                {portfolio.likeCount}
              </span>
              <span className="flex items-center gap-1">
                <MessageCircle className="w-4 h-4" />
                {portfolio.commentCount}
              </span>
            </div>

            {/* Date */}
            <p className="text-xs text-text-muted mt-2">{formatDate(portfolio.createdAt)}</p>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 p-4 border-b border-border-subtle">
            <button
              type="button"
              onClick={() => likeMutation.mutate()}
              className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg transition ${
                portfolio.isLiked
                  ? 'bg-red-500/20 text-red-400'
                  : 'bg-bg-tertiary text-text-secondary hover:bg-bg-modifier-hover'
              }`}
            >
              <Heart className={`w-5 h-5 ${portfolio.isLiked ? 'fill-current' : ''}`} />
              <span className="text-sm font-medium">{portfolio.isLiked ? 'Liked' : 'Like'}</span>
            </button>
            <button
              type="button"
              onClick={() => favoriteMutation.mutate()}
              className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg transition ${
                portfolio.isFavorited
                  ? 'bg-yellow-500/20 text-yellow-400'
                  : 'bg-bg-tertiary text-text-secondary hover:bg-bg-modifier-hover'
              }`}
            >
              <Bookmark className={`w-5 h-5 ${portfolio.isFavorited ? 'fill-current' : ''}`} />
              <span className="text-sm font-medium">
                {portfolio.isFavorited ? 'Saved' : 'Save'}
              </span>
            </button>
          </div>

          {/* Comments toggle */}
          <button
            type="button"
            onClick={() => setShowComments(!showComments)}
            className="flex items-center justify-between p-4 text-text-secondary hover:text-text-primary transition"
          >
            <span className="text-sm font-medium">Comments ({portfolio.commentCount})</span>
            <ChevronRight
              className={`w-4 h-4 transition-transform ${showComments ? 'rotate-90' : ''}`}
            />
          </button>

          {/* Comments section */}
          {showComments && (
            <div className="flex-1 overflow-y-auto p-4 border-t border-border-subtle">
              {commentsData?.items?.length ? (
                <div className="space-y-4">
                  {commentsData.items.map((comment) => (
                    <div key={comment.id} className="flex gap-3">
                      <UserAvatar
                        userId={comment.author.id}
                        avatarUrl={comment.author.avatarUrl}
                        displayName={comment.author.displayName}
                        size="sm"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-text-primary">
                          {comment.author.displayName || comment.author.username}
                        </p>
                        <p className="text-sm text-text-secondary">{comment.content}</p>
                        <p className="text-xs text-text-muted mt-1">
                          {formatDate(comment.createdAt)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-text-muted text-center py-4">No comments yet</p>
              )}
            </div>
          )}

          {/* Owner actions */}
          {isOwner && (
            <div className="p-4 border-t border-border-subtle">
              <button
                type="button"
                className="flex items-center gap-2 text-sm text-text-muted hover:text-text-primary transition"
              >
                <MoreHorizontal className="w-4 h-4" />
                More options
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
