import { useQuery } from '@tanstack/react-query'
import { ImageOff } from 'lucide-react'
import { useState } from 'react'
import { fetchApi } from '../../lib/api'
import { useAuthStore } from '../../stores/auth.store'
import { PortfolioCard } from './portfolio-card'
import { PortfolioDetailModal } from './portfolio-detail-modal'

interface PortfolioGridProps {
  userId: string
  isOwner?: boolean
}

interface PortfolioItem {
  id: string
  ownerId: string
  title: string | null
  description: string | null
  fileUrl: string
  fileName: string
  fileType: string
  fileSize: number
  fileWidth: number | null
  fileHeight: number | null
  thumbnailUrl: string | null
  visibility: 'public' | 'private' | 'unlisted'
  status: 'draft' | 'published' | 'archived'
  likeCount: number
  favoriteCount: number
  commentCount: number
  viewCount: number
  createdAt: string
  owner: {
    id: string
    username: string
    displayName: string | null
    avatarUrl: string | null
    isBot: boolean
  }
  isLiked?: boolean
  isFavorited?: boolean
}

export function PortfolioGrid({ userId, isOwner = false }: PortfolioGridProps) {
  const _currentUser = useAuthStore((s) => s.user)
  const [selectedPortfolio, setSelectedPortfolio] = useState<PortfolioItem | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['portfolio', userId],
    queryFn: () =>
      fetchApi<{ items: PortfolioItem[]; hasMore: boolean }>(`/api/users/${userId}/portfolio`),
    enabled: !!userId,
  })

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="aspect-square bg-bg-tertiary rounded-xl animate-pulse" />
        ))}
      </div>
    )
  }

  if (!data?.items?.length) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-text-muted">
        <div className="w-16 h-16 rounded-full bg-bg-tertiary flex items-center justify-center mb-4">
          <ImageOff className="w-8 h-8" />
        </div>
        <p className="text-sm">{isOwner ? 'No works yet' : 'No public works'}</p>
        {isOwner && (
          <p className="text-xs text-text-muted mt-1">
            Upload files in channels to add to your portfolio
          </p>
        )}
      </div>
    )
  }

  return (
    <>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {data.items.map((item) => (
          <PortfolioCard
            key={item.id}
            portfolio={item}
            onClick={() => setSelectedPortfolio(item)}
          />
        ))}
      </div>

      {selectedPortfolio && (
        <PortfolioDetailModal
          portfolio={selectedPortfolio}
          onClose={() => setSelectedPortfolio(null)}
        />
      )}
    </>
  )
}
