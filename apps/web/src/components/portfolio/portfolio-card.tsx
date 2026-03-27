import type { PortfolioWithOwner } from '@shadowob/shared'
import { Eye, FileText, Heart, Lock, MessageCircle, Play } from 'lucide-react'

interface PortfolioCardProps {
  portfolio: PortfolioWithOwner
  onClick?: () => void
}

export function PortfolioCard({ portfolio, onClick }: PortfolioCardProps) {
  const isImage = portfolio.fileType.startsWith('image/')
  const isVideo = portfolio.fileType.startsWith('video/')
  const isPrivate = portfolio.visibility === 'private'

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className="group relative aspect-square rounded-xl overflow-hidden bg-bg-tertiary border border-border-subtle hover:border-border-default transition-all duration-200 text-left"
    >
      {/* Thumbnail / Preview */}
      <div className="absolute inset-0">
        {isImage && (portfolio.thumbnailUrl || portfolio.fileUrl) ? (
          <img
            src={portfolio.thumbnailUrl || portfolio.fileUrl}
            alt={portfolio.title || portfolio.fileName}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        ) : isVideo ? (
          <div className="w-full h-full flex items-center justify-center bg-bg-modifier-hover">
            <video src={portfolio.fileUrl} className="max-w-full max-h-full" muted playsInline />
            <div className="absolute inset-0 flex items-center justify-center bg-black/30">
              <Play className="w-12 h-12 text-white/80" />
            </div>
          </div>
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center p-4">
            <div className="w-12 h-12 rounded-lg bg-bg-modifier-hover flex items-center justify-center mb-2">
              <FileText className="w-6 h-6 text-text-muted" />
            </div>
            <span className="text-xs text-text-muted text-center truncate max-w-full">
              {portfolio.fileName}
            </span>
            <span className="text-[10px] text-text-muted/60 mt-1">
              {formatSize(portfolio.fileSize)}
            </span>
          </div>
        )}
      </div>

      {/* Private overlay */}
      {isPrivate && (
        <div className="absolute inset-0 bg-bg-primary/60 backdrop-blur-sm flex items-center justify-center">
          <Lock className="w-6 h-6 text-text-muted" />
        </div>
      )}

      {/* Gradient overlay at bottom */}
      <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-black/60 to-transparent pointer-events-none" />

      {/* Info overlay */}
      <div className="absolute inset-x-0 bottom-0 p-3 pointer-events-none">
        {portfolio.title ? (
          <p className="text-sm font-medium text-white truncate">{portfolio.title}</p>
        ) : (
          <p className="text-sm text-white/80 truncate">{portfolio.fileName}</p>
        )}

        {/* Stats */}
        <div className="flex items-center gap-3 mt-1.5">
          <span className="flex items-center gap-1 text-xs text-white/70">
            <Heart className="w-3.5 h-3.5" />
            {portfolio.likeCount}
          </span>
          <span className="flex items-center gap-1 text-xs text-white/70">
            <MessageCircle className="w-3.5 h-3.5" />
            {portfolio.commentCount}
          </span>
          <span className="flex items-center gap-1 text-xs text-white/70">
            <Eye className="w-3.5 h-3.5" />
            {portfolio.viewCount}
          </span>
        </div>
      </div>

      {/* Hover state */}
      <div className="absolute inset-0 bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
    </button>
  )
}
