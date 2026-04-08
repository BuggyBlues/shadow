/* ─────────────────────────────────────────────────────────────────────────────
 *  Shadow OS — Widget Picker
 *
 *  A panel / dialog for browsing available widgets and adding them to the
 *  canvas. Shows both built-in widgets and any store-downloaded widgets.
 * ───────────────────────────────────────────────────────────────────────────── */

import { Button, cn, Input } from '@shadowob/ui'
import {
  Hash,
  MessageSquare,
  PawPrint,
  Plus,
  Search,
  Sparkles,
  TrendingUp,
  X,
  Zap,
} from 'lucide-react'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  useWidgetEngine,
  type WidgetInstance,
  type WidgetManifest,
} from '../../../lib/widget-engine'

const ICON_MAP: Record<string, React.ComponentType<{ size?: number; className?: string }>> = {
  Sparkles,
  TrendingUp,
  PawPrint,
  Zap,
  Hash,
  MessageSquare,
}

interface WidgetPickerProps {
  onClose: () => void
  onAdd: (instance: WidgetInstance) => void
}

export function WidgetPicker({ onClose, onAdd }: WidgetPickerProps) {
  const { t } = useTranslation()
  const { registry } = useWidgetEngine()
  const [search, setSearch] = useState('')
  const [selectedTag, setSelectedTag] = useState<string | null>(null)

  // Collect all tags
  const allTags = useMemo(() => {
    const tags = new Set<string>()
    for (const m of registry) {
      for (const tag of m.tags ?? []) tags.add(tag)
    }
    return [...tags].sort()
  }, [registry])

  // Filter
  const filtered = useMemo(() => {
    let result = registry
    if (search.trim()) {
      const q = search.toLowerCase()
      result = result.filter(
        (m) =>
          m.name.toLowerCase().includes(q) ||
          m.id.toLowerCase().includes(q) ||
          m.description?.toLowerCase().includes(q),
      )
    }
    if (selectedTag) {
      result = result.filter((m) => m.tags?.includes(selectedTag))
    }
    return result
  }, [registry, search, selectedTag])

  function handleAdd(manifest: WidgetManifest) {
    const instance: WidgetInstance = {
      instanceId: `wi_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      widgetId: manifest.id,
      rect: {
        ...manifest.defaultRect,
        z: 10,
      },
      appearance: {},
      config: {},
      grantedPermissions: [...manifest.permissions],
      visible: true,
    }
    onAdd(instance)
  }

  return (
    <div className="absolute inset-y-0 right-0 w-80 bg-bg-primary/95 backdrop-blur-2xl border-l border-border-subtle z-50 flex flex-col animate-in slide-in-from-right-full duration-300 shadow-2xl">
      {/* Header */}
      <div className="h-12 px-4 flex items-center border-b border-border-subtle shrink-0 gap-2">
        <Plus size={16} className="text-primary" />
        <span className="font-black text-text-primary text-sm flex-1">
          {t('widget.pickerTitle', 'Add Widget')}
        </span>
        <button
          type="button"
          onClick={onClose}
          className="p-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-bg-modifier-hover transition"
        >
          <X size={16} />
        </button>
      </div>

      {/* Search */}
      <div className="px-4 pt-3 pb-2">
        <Input
          icon={Search}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t('widget.searchWidgets', 'Search widgets...')}
          className="!rounded-full"
        />
      </div>

      {/* Tags */}
      {allTags.length > 0 && (
        <div className="px-4 pb-2 flex items-center gap-1 flex-wrap">
          <button
            type="button"
            onClick={() => setSelectedTag(null)}
            className={cn(
              'text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full transition-all',
              !selectedTag
                ? 'bg-primary text-white'
                : 'bg-bg-secondary text-text-muted hover:bg-bg-modifier-hover',
            )}
          >
            {t('widget.tagAll', 'All')}
          </button>
          {allTags.map((tag) => (
            <button
              key={tag}
              type="button"
              onClick={() => setSelectedTag(tag === selectedTag ? null : tag)}
              className={cn(
                'text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full transition-all',
                selectedTag === tag
                  ? 'bg-primary text-white'
                  : 'bg-bg-secondary text-text-muted hover:bg-bg-modifier-hover',
              )}
            >
              {tag}
            </button>
          ))}
        </div>
      )}

      {/* Widget list */}
      <div className="flex-1 overflow-y-auto scrollbar-hidden px-4 py-2 space-y-2">
        {filtered.map((manifest) => {
          const IconComp = ICON_MAP[manifest.icon ?? ''] ?? Sparkles
          return (
            <div
              key={manifest.id}
              className="flex items-center gap-3 p-3 rounded-2xl bg-bg-secondary/50 border border-border-subtle hover:bg-bg-modifier-hover transition-all group"
            >
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                <IconComp size={18} className="text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-black text-text-primary truncate">{manifest.name}</div>
                {manifest.description && (
                  <div className="text-[10px] text-text-muted truncate mt-0.5">
                    {manifest.description}
                  </div>
                )}
                {manifest.permissions.length > 0 && (
                  <div className="flex items-center gap-1 mt-1 flex-wrap">
                    {manifest.permissions.map((p) => (
                      <span
                        key={p}
                        className="text-[8px] font-bold text-accent bg-accent/10 px-1.5 py-0.5 rounded-full"
                      >
                        {p}
                      </span>
                    ))}
                  </div>
                )}
              </div>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => handleAdd(manifest)}
                className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <Plus size={14} />
              </Button>
            </div>
          )
        })}
        {filtered.length === 0 && (
          <div className="text-center py-8 text-text-muted">
            <Search size={24} className="mx-auto mb-2 opacity-30" />
            <p className="text-xs">{t('widget.noResults', 'No widgets found')}</p>
          </div>
        )}
      </div>
    </div>
  )
}
