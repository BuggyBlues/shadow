import type { PortfolioWithOwner } from '@shadowob/shared'
import { getFileCategory } from '@shadowob/shared'
import { Code2, Download, ExternalLink, FileText, Music } from 'lucide-react'

interface PortfolioPreviewProps {
  portfolio: PortfolioWithOwner
}

export function PortfolioPreview({ portfolio }: PortfolioPreviewProps) {
  const category = getFileCategory(portfolio.fileType)

  switch (category) {
    case 'image':
      return <ImagePreview portfolio={portfolio} />
    case 'video':
      return <VideoPreview portfolio={portfolio} />
    case 'audio':
      return <AudioPreview portfolio={portfolio} />
    case 'pdf':
      return <PdfPreview portfolio={portfolio} />
    case 'code':
      return <CodePreview portfolio={portfolio} />
    default:
      return <DefaultPreview portfolio={portfolio} />
  }
}

function ImagePreview({ portfolio }: PortfolioPreviewProps) {
  return (
    <div className="w-full h-full flex items-center justify-center p-4">
      <img
        src={portfolio.fileUrl}
        alt={portfolio.title || portfolio.fileName}
        className="max-w-full max-h-full object-contain"
      />
    </div>
  )
}

function VideoPreview({ portfolio }: PortfolioPreviewProps) {
  return (
    <div className="w-full h-full flex items-center justify-center">
      <video
        src={portfolio.fileUrl}
        controls
        className="max-w-full max-h-full"
        poster={portfolio.thumbnailUrl || undefined}
      >
        <track kind="captions" />
      </video>
    </div>
  )
}

function AudioPreview({ portfolio }: PortfolioPreviewProps) {
  return (
    <div className="w-full h-full flex flex-col items-center justify-center p-8">
      <div className="w-32 h-32 rounded-2xl bg-gradient-to-br from-primary/30 to-primary/10 flex items-center justify-center mb-6">
        <Music className="w-16 h-16 text-primary" />
      </div>
      <p className="text-lg font-medium text-text-primary mb-2">
        {portfolio.title || portfolio.fileName}
      </p>
      <audio src={portfolio.fileUrl} controls className="w-full max-w-md">
        <track kind="captions" />
      </audio>
    </div>
  )
}

function PdfPreview({ portfolio }: PortfolioPreviewProps) {
  return (
    <div className="w-full h-full">
      <iframe
        src={portfolio.fileUrl}
        title={portfolio.title || portfolio.fileName}
        className="w-full h-full border-0"
      />
    </div>
  )
}

function CodePreview({ portfolio }: PortfolioPreviewProps) {
  return (
    <div className="w-full h-full flex flex-col items-center justify-center p-8">
      <div className="w-full max-w-2xl">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-lg bg-bg-tertiary flex items-center justify-center">
            <Code2 className="w-5 h-5 text-text-muted" />
          </div>
          <div>
            <p className="font-medium text-text-primary">{portfolio.fileName}</p>
            <p className="text-xs text-text-muted">{portfolio.fileType}</p>
          </div>
        </div>
        <a
          href={portfolio.fileUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition"
        >
          View file
          <ExternalLink className="w-4 h-4" />
        </a>
      </div>
    </div>
  )
}

function DefaultPreview({ portfolio }: PortfolioPreviewProps) {
  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`
  }

  return (
    <div className="w-full h-full flex flex-col items-center justify-center p-8">
      <div className="w-24 h-24 rounded-2xl bg-bg-tertiary flex items-center justify-center mb-6">
        <FileText className="w-12 h-12 text-text-muted" />
      </div>
      <p className="text-lg font-medium text-text-primary mb-1">
        {portfolio.title || portfolio.fileName}
      </p>
      <p className="text-sm text-text-muted mb-4">
        {portfolio.fileType} • {formatSize(portfolio.fileSize)}
      </p>
      <a
        href={portfolio.fileUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition"
      >
        Download
        <Download className="w-4 h-4" />
      </a>
    </div>
  )
}
