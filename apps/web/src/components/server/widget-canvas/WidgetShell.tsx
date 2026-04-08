/* ─────────────────────────────────────────────────────────────────────────────
 *  Shadow OS — Widget Shell  (v3 — Cyber Workbench)
 *
 *  Each Widget is a living entity on the canvas with 3-layer interaction:
 *   L1 (Display) — hover activates glow / live data pulse
 *   L2 (Quick)   — single click → select + Mini-Toolbar
 *   L3 (Manage)  — double-click → Focus Mode (bg blurs, deep config)
 *
 *  Drag:
 *   - Click any non-button area → grab (1.05x scale, deeper shadow)
 *   - Magnetic snap with ghost-box preview + cyan guide lines
 *   - L-shaped corner anchors (not ugly resize handles)
 *
 *  Selection: 1px breathing glow ring around the entity.
 * ───────────────────────────────────────────────────────────────────────────── */

import { cn } from '@shadowob/ui'
import { ArrowUpToLine, Code, Lock, Trash2, Unlock } from 'lucide-react'
import {
  type PointerEvent as ReactPointerEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react'
import type { WidgetAppearance, WidgetInstance, WidgetManifest } from '../../../lib/widget-engine'
import { useWidgetEngine } from '../../../lib/widget-engine'

interface WidgetShellProps {
  instance: WidgetInstance
  manifest?: WidgetManifest
  children: React.ReactNode
}

export function WidgetShell({ instance, manifest, children }: WidgetShellProps) {
  const {
    isEditing,
    selectedWidgetId,
    selectWidget,
    moveWidget,
    resizeWidget,
    removeWidget,
    bringToFront,
    lockWidget,
    setFocusedWidget,
    setSnapGuides,
    setGhostBox,
  } = useWidgetEngine()

  const isSelected = selectedWidgetId === instance.instanceId
  const isLocked = !!instance.locked
  const shellRef = useRef<HTMLDivElement>(null)

  // ── Drag state ──
  const [isDragging, setIsDragging] = useState(false)
  const [isHovered, setIsHovered] = useState(false)
  const dragStart = useRef({ x: 0, y: 0, origX: 0, origY: 0 })

  // ── Resize state ──
  const [isResizing, setIsResizing] = useState(false)
  const resizeStart = useRef({ x: 0, y: 0, origW: 0, origH: 0 })

  // ── Long-press state (PRD: 0.5s hold = grab) ──
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [isGrabbed, setIsGrabbed] = useState(false)

  const appearance: WidgetAppearance = {
    borderless: false,
    transparent: false,
    radius: null,
    ...(manifest?.appearance ?? {}),
    ...instance.appearance,
  }

  const isBorderless = appearance.borderless || appearance.transparent
  const radius = isBorderless ? 0 : (appearance.radius ?? 24)

  /* ── Drag to move ── */
  const startDrag = useCallback(
    (e: ReactPointerEvent) => {
      if (!isEditing || isLocked) return
      e.preventDefault()
      e.stopPropagation()
      setIsDragging(true)
      setIsGrabbed(true)
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
    [
      isEditing,
      isLocked,
      instance.rect.x,
      instance.rect.y,
      instance.instanceId,
      bringToFront,
      selectWidget,
    ],
  )

  const onPointerMove = useCallback(
    (e: ReactPointerEvent) => {
      if (isResizing) {
        const { zoom } = useWidgetEngine.getState().viewport
        const dx = (e.clientX - resizeStart.current.x) / zoom
        const dy = (e.clientY - resizeStart.current.y) / zoom
        resizeWidget(
          instance.instanceId,
          resizeStart.current.origW + dx,
          resizeStart.current.origH + dy,
        )
        return
      }
      if (!isDragging) return
      const { zoom } = useWidgetEngine.getState().viewport
      const dx = (e.clientX - dragStart.current.x) / zoom
      const dy = (e.clientY - dragStart.current.y) / zoom
      moveWidget(instance.instanceId, {
        x: dragStart.current.origX + dx,
        y: dragStart.current.origY + dy,
      })
    },
    [isDragging, isResizing, instance.instanceId, moveWidget, resizeWidget],
  )

  const onPointerUp = useCallback(() => {
    if (isDragging || isResizing) {
      setIsDragging(false)
      setIsResizing(false)
      setIsGrabbed(false)
      // Clear visual feedback
      setSnapGuides([])
      setGhostBox(null)
    }
  }, [isDragging, isResizing, setSnapGuides, setGhostBox])

  /* ── Long-press handling ── */
  const onShellPointerDown = useCallback(
    (e: ReactPointerEvent) => {
      if (!isEditing || isLocked) return
      // Don't trigger on buttons
      if ((e.target as HTMLElement).closest('button')) return

      longPressTimer.current = setTimeout(() => {
        setIsGrabbed(true)
        startDrag(e)
      }, 500)
    },
    [isEditing, isLocked, startDrag],
  )

  const onShellPointerUp = useCallback(() => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current)
      longPressTimer.current = null
    }
  }, [])

  useEffect(() => {
    return () => {
      if (longPressTimer.current) clearTimeout(longPressTimer.current)
    }
  }, [])

  /* ── Click → select, Double-click → focus mode ── */
  const handleClick = useCallback(() => {
    if (isEditing) selectWidget(instance.instanceId)
  }, [isEditing, instance.instanceId, selectWidget])

  const handleDoubleClick = useCallback(() => {
    setFocusedWidget(instance.instanceId)
  }, [instance.instanceId, setFocusedWidget])

  /* ── Corner resize (L-shaped anchors) ── */
  const onResizeStart = useCallback(
    (e: ReactPointerEvent) => {
      if (!isEditing || isLocked) return
      e.preventDefault()
      e.stopPropagation()
      setIsResizing(true)
      resizeStart.current = {
        x: e.clientX,
        y: e.clientY,
        origW: instance.rect.w,
        origH: instance.rect.h,
      }
      ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
    },
    [isEditing, isLocked, instance.rect.w, instance.rect.h],
  )

  if (!instance.visible) return null

  return (
    <div
      ref={shellRef}
      className={cn(
        'absolute group',
        /* Contained mode: frosted glass capsule */
        !isBorderless &&
          'bg-[var(--glass-bg)] backdrop-blur-2xl border border-white/[0.06] shadow-[0_8px_32px_-8px_rgba(0,0,0,0.3)]',
        /* Breathing glow on selection (1px animated ring) */
        isSelected && !isDragging && 'animate-[breathe_2s_ease-in-out_infinite]',
        /* Grab state: scale up 1.05x with deeper shadow (PRD spec) */
        isGrabbed
          ? 'scale-[1.05] shadow-[0_20px_60px_-10px_rgba(0,243,255,0.2)] transition-transform duration-150'
          : 'transition-all duration-300',
        /* Locked: reduced opacity */
        isLocked && isEditing && 'opacity-70',
      )}
      style={{
        left: instance.rect.x,
        top: instance.rect.y,
        width: instance.rect.w || undefined,
        height: instance.rect.h || undefined,
        zIndex: isDragging ? 9999 : instance.rect.z,
        borderRadius: radius,
        overflow: isBorderless ? 'visible' : 'hidden',
        /* Breathing glow ring via box-shadow */
        boxShadow:
          isSelected && !isDragging
            ? '0 0 0 1px var(--color-primary), 0 0 12px -2px rgba(0,243,255,0.3)'
            : undefined,
      }}
      onClick={handleClick}
      onDoubleClick={handleDoubleClick}
      onPointerDown={onShellPointerDown}
      onPointerUp={(e) => {
        onShellPointerUp()
        onPointerUp()
      }}
      onPointerMove={onPointerMove}
      onPointerEnter={() => setIsHovered(true)}
      onPointerLeave={() => setIsHovered(false)}
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
      {/* ── Mini-Toolbar (appears on select in edit mode) ── */}
      {isEditing && (
        <div
          className={cn(
            'absolute -top-9 left-1/2 -translate-x-1/2 flex items-center gap-0.5',
            'bg-bg-deep/90 backdrop-blur-2xl rounded-xl px-1.5 py-1 border border-white/[0.08]',
            'shadow-xl z-50 transition-all duration-200',
            isSelected || isDragging
              ? 'opacity-100 translate-y-0'
              : 'opacity-0 translate-y-1 group-hover:opacity-100 group-hover:translate-y-0',
          )}
          onPointerDown={startDrag}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
        >
          {/* Drag handle area */}
          <div className="cursor-grab active:cursor-grabbing px-1.5 py-0.5 rounded-lg hover:bg-white/[0.06] transition">
            <div className="flex gap-0.5">
              <div className="w-1 h-1 rounded-full bg-text-muted/40" />
              <div className="w-1 h-1 rounded-full bg-text-muted/40" />
              <div className="w-1 h-1 rounded-full bg-text-muted/40" />
            </div>
          </div>
          <div className="w-px h-3 bg-white/[0.06]" />
          {/* Bring to front */}
          <button
            type="button"
            className="p-1 rounded-lg text-text-muted hover:text-primary hover:bg-white/[0.06] transition"
            title="Bring to front"
            onClick={(e) => {
              e.stopPropagation()
              bringToFront(instance.instanceId)
            }}
          >
            <ArrowUpToLine size={11} />
          </button>
          {/* Lock/Unlock */}
          <button
            type="button"
            className={cn(
              'p-1 rounded-lg transition',
              isLocked
                ? 'text-warning hover:bg-warning/10'
                : 'text-text-muted hover:text-primary hover:bg-white/[0.06]',
            )}
            title={isLocked ? 'Unlock' : 'Lock'}
            onClick={(e) => {
              e.stopPropagation()
              lockWidget(instance.instanceId)
            }}
          >
            {isLocked ? <Lock size={11} /> : <Unlock size={11} />}
          </button>
          {/* Source / settings */}
          <button
            type="button"
            className="p-1 rounded-lg text-text-muted hover:text-primary hover:bg-white/[0.06] transition"
            title="Source"
            onClick={(e) => {
              e.stopPropagation()
              setFocusedWidget(instance.instanceId)
            }}
          >
            <Code size={11} />
          </button>
          {/* Delete */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              removeWidget(instance.instanceId)
            }}
            className="p-1 rounded-lg text-text-muted hover:text-danger hover:bg-danger/10 transition"
            title="Remove"
          >
            <Trash2 size={11} />
          </button>
        </div>
      )}

      {/* ── Widget content ── */}
      <div className={cn('w-full h-full', !isBorderless && 'p-4')}>{children}</div>

      {/* ── L-shaped corner resize anchors (hover-only, edit + selected) ── */}
      {isEditing && isSelected && !isLocked && (
        <>
          {/* Bottom-right L-anchor */}
          <div
            className="absolute -bottom-1 -right-1 w-5 h-5 cursor-se-resize z-50 group/anchor"
            onPointerDown={onResizeStart}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
          >
            <div
              className={cn(
                'absolute bottom-0 right-0 transition-all duration-200',
                isHovered || isSelected ? 'opacity-100' : 'opacity-0',
              )}
            >
              <div className="absolute bottom-0 right-0 w-3 h-[2px] rounded-full bg-primary/80 shadow-[0_0_6px_rgba(0,243,255,0.4)]" />
              <div className="absolute bottom-0 right-0 w-[2px] h-3 rounded-full bg-primary/80 shadow-[0_0_6px_rgba(0,243,255,0.4)]" />
            </div>
          </div>
          {/* Top-left L-anchor */}
          <div className="absolute -top-1 -left-1 w-5 h-5 z-50 pointer-events-none">
            <div
              className={cn(
                'absolute top-0 left-0 transition-all duration-200',
                isHovered || isSelected ? 'opacity-100' : 'opacity-0',
              )}
            >
              <div className="absolute top-0 left-0 w-3 h-[2px] rounded-full bg-primary/80 shadow-[0_0_6px_rgba(0,243,255,0.4)]" />
              <div className="absolute top-0 left-0 w-[2px] h-3 rounded-full bg-primary/80 shadow-[0_0_6px_rgba(0,243,255,0.4)]" />
            </div>
          </div>
          {/* Top-right L-anchor */}
          <div className="absolute -top-1 -right-1 w-5 h-5 z-50 pointer-events-none">
            <div
              className={cn(
                'absolute top-0 right-0 transition-all duration-200',
                isHovered || isSelected ? 'opacity-100' : 'opacity-0',
              )}
            >
              <div className="absolute top-0 right-0 w-3 h-[2px] rounded-full bg-primary/80 shadow-[0_0_6px_rgba(0,243,255,0.4)]" />
              <div className="absolute top-0 right-0 w-[2px] h-3 rounded-full bg-primary/80 shadow-[0_0_6px_rgba(0,243,255,0.4)]" />
            </div>
          </div>
          {/* Bottom-left L-anchor */}
          <div className="absolute -bottom-1 -left-1 w-5 h-5 z-50 pointer-events-none">
            <div
              className={cn(
                'absolute bottom-0 left-0 transition-all duration-200',
                isHovered || isSelected ? 'opacity-100' : 'opacity-0',
              )}
            >
              <div className="absolute bottom-0 left-0 w-3 h-[2px] rounded-full bg-primary/80 shadow-[0_0_6px_rgba(0,243,255,0.4)]" />
              <div className="absolute bottom-0 left-0 w-[2px] h-3 rounded-full bg-primary/80 shadow-[0_0_6px_rgba(0,243,255,0.4)]" />
            </div>
          </div>
        </>
      )}
    </div>
  )
}
