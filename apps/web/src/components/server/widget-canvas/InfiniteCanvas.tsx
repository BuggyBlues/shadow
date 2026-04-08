/* ─────────────────────────────────────────────────────────────────────────────
 *  Shadow OS — Infinite Canvas
 *
 *  A pannable, zoomable infinite canvas that hosts widget instances.
 *  Supports:
 *   - Mouse/trackpad pan (middle-click drag or space+drag)
 *   - Pinch-to-zoom and scroll-wheel zoom
 *   - Canvas-space grid dots background
 *   - Widget selection, drag-to-move, and resize handles in edit mode
 * ───────────────────────────────────────────────────────────────────────────── */

import { cn } from '@shadowob/ui'
import { Grip, Maximize2, Minimize2, RotateCcw } from 'lucide-react'
import {
  type PointerEvent as ReactPointerEvent,
  type WheelEvent as ReactWheelEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react'
import { useWidgetEngine } from '../../../lib/widget-engine'

interface InfiniteCanvasProps {
  children: React.ReactNode
  className?: string
}

export function InfiniteCanvas({ children, className }: InfiniteCanvasProps) {
  const { viewport, pan, zoom, resetViewport, isEditing } = useWidgetEngine()
  const canvasRef = useRef<HTMLDivElement>(null)
  const [isPanning, setIsPanning] = useState(false)
  const [spaceHeld, setSpaceHeld] = useState(false)
  const lastPointer = useRef({ x: 0, y: 0 })

  /* ── Space key for pan mode ── */
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (
        e.code === 'Space' &&
        !e.repeat &&
        !(e.target as HTMLElement).closest('input, textarea')
      ) {
        e.preventDefault()
        setSpaceHeld(true)
      }
    }
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') setSpaceHeld(false)
    }
    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup', onKeyUp)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup', onKeyUp)
    }
  }, [])

  /* ── Wheel zoom ── */
  const onWheel = useCallback(
    (e: ReactWheelEvent) => {
      if (e.ctrlKey || e.metaKey) {
        // Pinch / ctrl+scroll → zoom
        e.preventDefault()
        const rect = canvasRef.current?.getBoundingClientRect()
        if (!rect) return
        const cx = e.clientX - rect.left
        const cy = e.clientY - rect.top
        zoom(-e.deltaY * 0.002, cx, cy)
      } else {
        // Normal scroll → pan
        pan(-e.deltaX, -e.deltaY)
      }
    },
    [pan, zoom],
  )

  /* ── Pointer pan ── */
  const onPointerDown = useCallback(
    (e: ReactPointerEvent) => {
      // Middle button OR space held → start pan
      if (e.button === 1 || (spaceHeld && e.button === 0)) {
        e.preventDefault()
        setIsPanning(true)
        lastPointer.current = { x: e.clientX, y: e.clientY }
        ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
      }
    },
    [spaceHeld],
  )

  const onPointerMove = useCallback(
    (e: ReactPointerEvent) => {
      if (!isPanning) return
      const dx = e.clientX - lastPointer.current.x
      const dy = e.clientY - lastPointer.current.y
      lastPointer.current = { x: e.clientX, y: e.clientY }
      pan(dx, dy)
    },
    [isPanning, pan],
  )

  const onPointerUp = useCallback(() => {
    setIsPanning(false)
  }, [])

  /* ── Grid pattern ── */
  const gridSize = 40 * viewport.zoom
  const gridOffsetX = ((viewport.panX % gridSize) + gridSize) % gridSize
  const gridOffsetY = ((viewport.panY % gridSize) + gridSize) % gridSize

  return (
    <div
      ref={canvasRef}
      className={cn(
        'relative w-full h-full overflow-hidden select-none',
        isPanning || spaceHeld ? 'cursor-grab' : '',
        isPanning ? 'cursor-grabbing' : '',
        className,
      )}
      onWheel={onWheel}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
    >
      {/* Grid dots background */}
      <div
        className="absolute inset-0 pointer-events-none opacity-20"
        style={{
          backgroundImage: 'radial-gradient(circle, var(--color-text-muted) 1px, transparent 1px)',
          backgroundSize: `${gridSize}px ${gridSize}px`,
          backgroundPosition: `${gridOffsetX}px ${gridOffsetY}px`,
        }}
      />

      {/* Transform layer — all widgets live here */}
      <div
        className="absolute origin-top-left"
        style={{
          transform: `translate(${viewport.panX}px, ${viewport.panY}px) scale(${viewport.zoom})`,
          willChange: 'transform',
        }}
      >
        {children}
      </div>

      {/* Viewport controls (bottom-right) */}
      <div className="absolute bottom-4 right-4 flex items-center gap-1 bg-bg-primary/80 backdrop-blur-xl rounded-2xl border border-border-subtle p-1 shadow-lg z-50">
        <button
          type="button"
          onClick={() => zoom(-0.2, 0, 0)}
          className="p-1.5 rounded-xl text-text-muted hover:text-text-primary hover:bg-bg-modifier-hover transition"
          title="Zoom out"
        >
          <Minimize2 size={14} />
        </button>
        <span className="text-[10px] font-black text-text-muted min-w-[36px] text-center tabular-nums">
          {Math.round(viewport.zoom * 100)}%
        </span>
        <button
          type="button"
          onClick={() => zoom(0.2, 0, 0)}
          className="p-1.5 rounded-xl text-text-muted hover:text-text-primary hover:bg-bg-modifier-hover transition"
          title="Zoom in"
        >
          <Maximize2 size={14} />
        </button>
        <div className="w-px h-4 bg-border-subtle" />
        <button
          type="button"
          onClick={resetViewport}
          className="p-1.5 rounded-xl text-text-muted hover:text-text-primary hover:bg-bg-modifier-hover transition"
          title="Reset view"
        >
          <RotateCcw size={14} />
        </button>
      </div>

      {/* Edit mode indicator */}
      {isEditing && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-accent/90 text-bg-deep px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-widest shadow-lg z-50 flex items-center gap-2">
          <Grip size={12} />
          Canvas Edit Mode
        </div>
      )}
    </div>
  )
}
