/* ─────────────────────────────────────────────────────────────────────────────
 *  Shadow OS — Widget Shell
 *
 *  The visual wrapper for each widget on the canvas. Handles:
 *  - Borderless vs contained mode
 *  - Drag-to-move in edit mode
 *  - Resize handles in edit mode
 *  - Selection highlight / chrome
 *  - Glass-morphism default container style
 * ───────────────────────────────────────────────────────────────────────────── */

import { cn } from '@shadowob/ui'
import { GripVertical, Maximize2, Settings2, Trash2 } from 'lucide-react'
import { type PointerEvent as ReactPointerEvent, useCallback, useRef, useState } from 'react'
import type { WidgetAppearance, WidgetInstance, WidgetManifest } from '../../../lib/widget-engine'
import { useWidgetEngine } from '../../../lib/widget-engine'

interface WidgetShellProps {
  instance: WidgetInstance
  manifest?: WidgetManifest
  children: React.ReactNode
}

export function WidgetShell({ instance, manifest, children }: WidgetShellProps) {
  const { isEditing, selectedWidgetId, selectWidget, moveWidget, removeWidget, bringToFront } =
    useWidgetEngine()
  const isSelected = selectedWidgetId === instance.instanceId
  const shellRef = useRef<HTMLDivElement>(null)
  const [isDragging, setIsDragging] = useState(false)
  const dragStart = useRef({ x: 0, y: 0, origX: 0, origY: 0 })

  // Merge manifest defaults with instance overrides
  const appearance: WidgetAppearance = {
    borderless: false,
    transparent: false,
    radius: null,
    ...(manifest?.appearance ?? {}),
    ...instance.appearance,
  }

  const radius = appearance.radius ?? 28

  /* ── Drag to move ── */
  const onDragStart = useCallback(
    (e: ReactPointerEvent) => {
      if (!isEditing) return
      e.preventDefault()
      e.stopPropagation()
      setIsDragging(true)
      dragStart.current = {
        x: e.clientX,
        y: e.clientY,
        origX: instance.rect.x,
        origY: instance.rect.y,
      }
      ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
      bringToFront(instance.instanceId)
      selectWidget(instance.instanceId)
    },
    [isEditing, instance.rect.x, instance.rect.y, instance.instanceId, bringToFront, selectWidget],
  )

  const onDragMove = useCallback(
    (e: ReactPointerEvent) => {
      if (!isDragging) return
      const { zoom } = useWidgetEngine.getState().viewport
      const dx = (e.clientX - dragStart.current.x) / zoom
      const dy = (e.clientY - dragStart.current.y) / zoom
      moveWidget(instance.instanceId, {
        x: dragStart.current.origX + dx,
        y: dragStart.current.origY + dy,
      })
    },
    [isDragging, instance.instanceId, moveWidget],
  )

  const onDragEnd = useCallback(() => {
    setIsDragging(false)
  }, [])

  /* ── Click to select (non-edit mode still allows click-through) ── */
  const handleClick = useCallback(() => {
    if (isEditing) {
      selectWidget(instance.instanceId)
    }
  }, [isEditing, instance.instanceId, selectWidget])

  if (!instance.visible) return null

  return (
    <div
      ref={shellRef}
      className={cn(
        'absolute transition-shadow duration-300',
        !appearance.borderless &&
          !appearance.transparent &&
          'bg-[var(--glass-bg)] backdrop-blur-2xl border border-[var(--glass-border)] border-t-white/10 shadow-[var(--shadow-soft)]',
        isEditing && 'ring-1 ring-primary/20 hover:ring-primary/40',
        isSelected && isEditing && 'ring-2 ring-primary shadow-lg shadow-primary/10',
        isDragging && 'opacity-90 scale-[1.01]',
      )}
      style={{
        left: instance.rect.x,
        top: instance.rect.y,
        width: instance.rect.w || undefined,
        height: instance.rect.h || undefined,
        zIndex: instance.rect.z,
        borderRadius: appearance.borderless ? 0 : radius,
        overflow: appearance.borderless ? 'visible' : 'hidden',
      }}
      onClick={handleClick}
      onKeyDown={
        isEditing
          ? (e) => {
              if (e.key === 'Delete' || e.key === 'Backspace') {
                removeWidget(instance.instanceId)
              }
            }
          : undefined
      }
      tabIndex={isEditing ? 0 : undefined}
    >
      {/* Drag handle (edit mode only) */}
      {isEditing && (
        <div
          className="absolute -top-0.5 left-1/2 -translate-x-1/2 -translate-y-full flex items-center gap-1 bg-bg-primary/90 backdrop-blur-xl rounded-t-xl px-2 py-1 border border-b-0 border-border-subtle z-50 opacity-0 group-hover:opacity-100 transition-opacity"
          style={{ opacity: isSelected || isDragging ? 1 : undefined }}
          onPointerDown={onDragStart}
          onPointerMove={onDragMove}
          onPointerUp={onDragEnd}
        >
          <GripVertical size={12} className="text-text-muted cursor-grab active:cursor-grabbing" />
          <span className="text-[9px] font-black text-text-muted uppercase tracking-widest truncate max-w-[100px]">
            {manifest?.name ?? instance.widgetId}
          </span>
          <div className="flex items-center gap-0.5 ml-1">
            <button
              type="button"
              className="p-0.5 rounded text-text-muted hover:text-primary transition"
              title="Settings"
            >
              <Settings2 size={10} />
            </button>
            <button
              type="button"
              className="p-0.5 rounded text-text-muted hover:text-primary transition"
              title="Maximize"
            >
              <Maximize2 size={10} />
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                removeWidget(instance.instanceId)
              }}
              className="p-0.5 rounded text-text-muted hover:text-danger transition"
              title="Remove"
            >
              <Trash2 size={10} />
            </button>
          </div>
        </div>
      )}

      {/* Widget content */}
      <div className={cn('w-full h-full', !appearance.borderless && 'p-5')}>{children}</div>

      {/* Resize handle (edit mode + selected) */}
      {isEditing && isSelected && (
        <div className="absolute bottom-0 right-0 w-5 h-5 cursor-se-resize z-50 flex items-end justify-end p-0.5">
          <svg
            width="8"
            height="8"
            viewBox="0 0 8 8"
            className="text-primary/40"
            role="img"
            aria-label="Resize"
          >
            <title>Resize</title>
            <path d="M8 0L8 8L0 8" fill="none" stroke="currentColor" strokeWidth="1.5" />
            <path d="M8 4L8 8L4 8" fill="none" stroke="currentColor" strokeWidth="1.5" />
          </svg>
        </div>
      )}
    </div>
  )
}
