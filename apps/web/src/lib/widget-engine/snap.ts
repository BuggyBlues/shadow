/* ─────────────────────────────────────────────────────────────────────────────
 *  Shadow OS — Magnetic Snap Engine
 *
 *  Provides real-time snapping computation for widget drag operations.
 *  When a widget edge/center comes within SNAP_THRESHOLD of a grid line,
 *  another widget's edge, or the canvas center, it "locks" to that guide
 *  and returns guide-line data for visual feedback.
 * ───────────────────────────────────────────────────────────────────────────── */

import type { WidgetRect } from './types'

/** Snap distance in canvas-space pixels (PRD: 12px magnetic range) */
export const SNAP_THRESHOLD = 12

/** Grid size for the elastic grid (PRD: 24×24 invisible grid) */
export const SNAP_GRID_SIZE = 24

export interface SnapGuide {
  /** "x" = vertical line, "y" = horizontal line */
  axis: 'x' | 'y'
  /** Position on the axis (canvas-space px) */
  position: number
  /** Type of snap origin */
  type: 'grid' | 'widget-edge' | 'widget-center' | 'canvas-center'
}

export interface SnapResult {
  /** Snapped x (or original if no x snap) */
  x: number
  /** Snapped y (or original if no y snap) */
  y: number
  /** Active guide lines to render */
  guides: SnapGuide[]
  /** Whether any snapping occurred (for haptic feedback trigger) */
  didSnap: boolean
}

/**
 * Compute snapped position + guide lines for a moving widget.
 *
 * @param moving  The rect being dragged (with proposed x/y already applied)
 * @param others  All other widget rects on the canvas (excluding the moving one)
 * @param canvasW Visible canvas width (for center snap, 0 to skip)
 * @param canvasH Visible canvas height (for center snap, 0 to skip)
 * @param gridSize Grid pitch (0 = no grid snap)
 */
export function computeSnap(
  moving: WidgetRect,
  others: WidgetRect[],
  canvasW = 0,
  canvasH = 0,
  gridSize = SNAP_GRID_SIZE,
): SnapResult {
  const guides: SnapGuide[] = []
  let sx = moving.x
  let sy = moving.y
  let snappedX = false
  let snappedY = false

  // Widget edges & center
  const mLeft = moving.x
  const mRight = moving.x + moving.w
  const mCx = moving.x + moving.w / 2
  const mTop = moving.y
  const mBottom = moving.y + moving.h
  const mCy = moving.y + moving.h / 2

  // ── Snap to other widgets ──
  for (const o of others) {
    const oLeft = o.x
    const oRight = o.x + o.w
    const oCx = o.x + o.w / 2
    const oTop = o.y
    const oBottom = o.y + o.h
    const oCy = o.y + o.h / 2

    // X-axis snaps (vertical guide lines)
    if (!snappedX) {
      const xChecks = [
        { from: mLeft, to: oLeft, type: 'widget-edge' as const },
        { from: mLeft, to: oRight, type: 'widget-edge' as const },
        { from: mRight, to: oLeft, type: 'widget-edge' as const },
        { from: mRight, to: oRight, type: 'widget-edge' as const },
        { from: mCx, to: oCx, type: 'widget-center' as const },
      ]
      for (const chk of xChecks) {
        if (Math.abs(chk.from - chk.to) < SNAP_THRESHOLD) {
          sx = moving.x + (chk.to - chk.from)
          guides.push({ axis: 'x', position: chk.to, type: chk.type })
          snappedX = true
          break
        }
      }
    }

    // Y-axis snaps (horizontal guide lines)
    if (!snappedY) {
      const yChecks = [
        { from: mTop, to: oTop, type: 'widget-edge' as const },
        { from: mTop, to: oBottom, type: 'widget-edge' as const },
        { from: mBottom, to: oTop, type: 'widget-edge' as const },
        { from: mBottom, to: oBottom, type: 'widget-edge' as const },
        { from: mCy, to: oCy, type: 'widget-center' as const },
      ]
      for (const chk of yChecks) {
        if (Math.abs(chk.from - chk.to) < SNAP_THRESHOLD) {
          sy = moving.y + (chk.to - chk.from)
          guides.push({ axis: 'y', position: chk.to, type: chk.type })
          snappedY = true
          break
        }
      }
    }

    if (snappedX && snappedY) break
  }

  // ── Snap to grid ──
  if (gridSize > 0) {
    if (!snappedX) {
      const nearestGridX = Math.round(mLeft / gridSize) * gridSize
      if (Math.abs(mLeft - nearestGridX) < SNAP_THRESHOLD) {
        sx = nearestGridX
        guides.push({ axis: 'x', position: nearestGridX, type: 'grid' })
        snappedX = true
      }
    }
    if (!snappedY) {
      const nearestGridY = Math.round(mTop / gridSize) * gridSize
      if (Math.abs(mTop - nearestGridY) < SNAP_THRESHOLD) {
        sy = nearestGridY
        guides.push({ axis: 'y', position: nearestGridY, type: 'grid' })
        snappedY = true
      }
    }
  }

  // ── Snap to canvas center ──
  if (canvasW > 0 && !snappedX) {
    const centerX = canvasW / 2
    if (Math.abs(mCx - centerX) < SNAP_THRESHOLD) {
      sx = centerX - moving.w / 2
      guides.push({ axis: 'x', position: centerX, type: 'canvas-center' })
      snappedX = true
    }
  }
  if (canvasH > 0 && !snappedY) {
    const centerY = canvasH / 2
    if (Math.abs(mCy - centerY) < SNAP_THRESHOLD) {
      sy = centerY - moving.h / 2
      guides.push({ axis: 'y', position: centerY, type: 'canvas-center' })
      snappedY = true
    }
  }

  return {
    x: sx,
    y: sy,
    guides,
    didSnap: snappedX || snappedY,
  }
}
