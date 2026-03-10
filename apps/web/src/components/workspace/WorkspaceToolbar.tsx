import {
  ArrowLeft,
  BarChart3,
  FolderClosed,
  FolderPlus,
  RefreshCw,
  Search,
  Upload,
  X,
} from 'lucide-react'
import { useWorkspaceStore } from '../../stores/workspace.store'
import type { WorkspaceStats } from './workspace-types'

interface WorkspaceToolbarProps {
  workspaceName: string
  stats: WorkspaceStats | null
  onClose?: () => void
  onUpload: () => void
  onNewFolder: () => void
  onRefresh: () => void
}

export function WorkspaceToolbar({
  workspaceName,
  stats,
  onClose,
  onUpload,
  onNewFolder,
  onRefresh,
}: WorkspaceToolbarProps) {
  const { searchQuery, setSearchQuery } = useWorkspaceStore()

  return (
    <div className="h-12 px-4 flex items-center bg-bg-secondary border-b border-border-subtle shrink-0 gap-3 z-20">
      {onClose && (
        <button
          type="button"
          onClick={onClose}
          className="p-1.5 -ml-1 text-text-muted hover:text-text-primary rounded transition"
        >
          <ArrowLeft size={18} />
        </button>
      )}
      <FolderClosed size={18} className="text-[#e8a838] shrink-0" />
      <h2 className="font-bold text-text-primary text-sm truncate">{workspaceName || '工作区'}</h2>
      <div className="flex-1" />

      {/* Stats badge */}
      {stats && (
        <div className="flex items-center gap-1.5 px-2 py-1 text-xs text-text-muted">
          <BarChart3 size={14} />
          <span>
            {stats.folderCount} 文件夹 · {stats.fileCount} 文件
          </span>
        </div>
      )}

      {/* Search */}
      <div className="relative flex items-center">
        <Search size={14} className="absolute left-2.5 text-text-muted pointer-events-none" />
        <input
          type="text"
          placeholder="搜索文件..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-40 pl-8 pr-7 py-1.5 bg-bg-tertiary text-text-primary text-xs rounded-lg border border-border-subtle focus:outline-none focus:border-primary transition"
        />
        {searchQuery && (
          <button
            type="button"
            onClick={() => setSearchQuery('')}
            className="absolute right-2 text-text-muted hover:text-text-primary"
          >
            <X size={12} />
          </button>
        )}
      </div>

      {/* Upload */}
      <button
        type="button"
        onClick={onUpload}
        className="p-1.5 text-text-muted hover:text-text-primary hover:bg-bg-modifier-hover rounded transition"
        title="上传文件"
      >
        <Upload size={16} />
      </button>

      {/* New folder */}
      <button
        type="button"
        onClick={onNewFolder}
        className="p-1.5 text-text-muted hover:text-text-primary hover:bg-bg-modifier-hover rounded transition"
        title="新建文件夹"
      >
        <FolderPlus size={16} />
      </button>

      {/* Refresh */}
      <button
        type="button"
        onClick={onRefresh}
        className="p-1.5 text-text-muted hover:text-text-primary hover:bg-bg-modifier-hover rounded transition"
        title="刷新"
      >
        <RefreshCw size={16} />
      </button>
    </div>
  )
}
