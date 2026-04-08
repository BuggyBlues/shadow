/* ─────────────────────────────────────────────────────────────────────────────
 *  Shadow OS — Widget Engine Store (Zustand)
 *
 *  Manages the canvas layout, widget instances, viewport state, and the
 *  currently selected / editing widget for the active server home.
 * ───────────────────────────────────────────────────────────────────────────── */

import { create } from 'zustand'
import type { SnapGuide } from './snap'
import { computeSnap, SNAP_GRID_SIZE } from './snap'
import type {
  CanvasLayout,
  CanvasViewport,
  WidgetInstance,
  WidgetManifest,
  WidgetRect,
} from './types'

interface GhostBox {
  x: number
  y: number
  w: number
  h: number
}

interface WidgetEngineState {
  /* ── Canvas ── */
  layout: CanvasLayout
  setLayout: (layout: CanvasLayout) => void

  /* ── Viewport ── */
  viewport: CanvasViewport
  pan: (dx: number, dy: number) => void
  zoom: (delta: number, cx: number, cy: number) => void
  resetViewport: () => void

  /* ── Widget Instances ── */
  addWidget: (instance: WidgetInstance) => void
  removeWidget: (instanceId: string) => void
  updateWidget: (instanceId: string, patch: Partial<WidgetInstance>) => void
  moveWidget: (instanceId: string, rect: Partial<WidgetRect>) => void
  resizeWidget: (instanceId: string, w: number, h: number) => void
  bringToFront: (instanceId: string) => void
  sendToBack: (instanceId: string) => void
  setBackgroundWidget: (instanceId: string | null) => void
  cloneWidget: (instanceId: string) => void
  lockWidget: (instanceId: string) => void

  /* ── Selection ── */
  selectedWidgetId: string | null
  selectWidget: (instanceId: string | null) => void

  /* ── Focus mode (double-click → deep interaction) ── */
  focusedWidgetId: string | null
  setFocusedWidget: (instanceId: string | null) => void

  /* ── Editing mode ── */
  isEditing: boolean
  setEditing: (v: boolean) => void

  /* ── Widget Picker ── */
  pickerOpen: boolean
  setPickerOpen: (v: boolean) => void

  /* ── Snap guides (visual feedback during drag) ── */
  snapGuides: SnapGuide[]
  setSnapGuides: (guides: SnapGuide[]) => void

  /* ── Ghost box (drop preview during drag) ── */
  ghostBox: GhostBox | null
  setGhostBox: (box: GhostBox | null) => void

  /* ── Quick Dial (right-click radial menu) ── */
  quickDialOpen: boolean
  quickDialPosition: { x: number; y: number }
  openQuickDial: (x: number, y: number) => void
  closeQuickDial: () => void

  /* ── Registry (manifest catalog) ── */
  registry: WidgetManifest[]
  registerWidget: (manifest: WidgetManifest) => void
  unregisterWidget: (widgetId: string) => void
}

const DEFAULT_VIEWPORT: CanvasViewport = { panX: 0, panY: 0, zoom: 1 }

const DEFAULT_LAYOUT: CanvasLayout = {
  viewport: { ...DEFAULT_VIEWPORT },
  widgets: [],
  backgroundWidgetId: null,
  gridSnap: 0,
}

const MIN_ZOOM = 0.1
const MAX_ZOOM = 5

export const useWidgetEngine = create<WidgetEngineState>((set, get) => ({
  /* ── Canvas ── */
  layout: { ...DEFAULT_LAYOUT },
  setLayout: (layout) => set({ layout, viewport: layout.viewport }),

  /* ── Viewport ── */
  viewport: { ...DEFAULT_VIEWPORT },
  pan: (dx, dy) =>
    set((s) => ({
      viewport: { ...s.viewport, panX: s.viewport.panX + dx, panY: s.viewport.panY + dy },
    })),
  zoom: (delta, cx, cy) =>
    set((s) => {
      const next = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, s.viewport.zoom * (1 + delta)))
      const ratio = next / s.viewport.zoom
      return {
        viewport: {
          zoom: next,
          panX: cx - (cx - s.viewport.panX) * ratio,
          panY: cy - (cy - s.viewport.panY) * ratio,
        },
      }
    }),
  resetViewport: () => set({ viewport: { ...DEFAULT_VIEWPORT } }),

  /* ── Widget Instances ── */
  addWidget: (instance) =>
    set((s) => ({
      layout: { ...s.layout, widgets: [...s.layout.widgets, instance] },
    })),

  removeWidget: (instanceId) =>
    set((s) => ({
      layout: {
        ...s.layout,
        widgets: s.layout.widgets.filter((w) => w.instanceId !== instanceId),
        backgroundWidgetId:
          s.layout.backgroundWidgetId === instanceId ? null : s.layout.backgroundWidgetId,
      },
      selectedWidgetId: s.selectedWidgetId === instanceId ? null : s.selectedWidgetId,
      focusedWidgetId: s.focusedWidgetId === instanceId ? null : s.focusedWidgetId,
    })),

  updateWidget: (instanceId, patch) =>
    set((s) => ({
      layout: {
        ...s.layout,
        widgets: s.layout.widgets.map((w) =>
          w.instanceId === instanceId ? { ...w, ...patch } : w,
        ),
      },
    })),

  moveWidget: (instanceId, rect) =>
    set((s) => {
      const widget = s.layout.widgets.find((w) => w.instanceId === instanceId)
      if (!widget) return {}

      // Build proposed rect
      const proposed: WidgetRect = {
        ...widget.rect,
        ...(rect.x != null ? { x: rect.x } : {}),
        ...(rect.y != null ? { y: rect.y } : {}),
        ...(rect.w != null ? { w: Math.max(0, rect.w) } : {}),
        ...(rect.h != null ? { h: Math.max(0, rect.h) } : {}),
        ...(rect.z != null ? { z: rect.z } : {}),
      }

      // Compute snap against other widgets
      const others = s.layout.widgets.filter((w) => w.instanceId !== instanceId).map((w) => w.rect)
      const snapResult = computeSnap(proposed, others, 0, 0, SNAP_GRID_SIZE)

      return {
        layout: {
          ...s.layout,
          widgets: s.layout.widgets.map((w) =>
            w.instanceId === instanceId
              ? { ...w, rect: { ...proposed, x: snapResult.x, y: snapResult.y } }
              : w,
          ),
        },
        snapGuides: snapResult.guides,
        ghostBox: { x: snapResult.x, y: snapResult.y, w: proposed.w, h: proposed.h },
      }
    }),

  resizeWidget: (instanceId, w, h) =>
    set((s) => ({
      layout: {
        ...s.layout,
        widgets: s.layout.widgets.map((wi) =>
          wi.instanceId === instanceId
            ? { ...wi, rect: { ...wi.rect, w: Math.max(80, w), h: Math.max(60, h) } }
            : wi,
        ),
      },
    })),

  bringToFront: (instanceId) =>
    set((s) => {
      const maxZ = Math.max(0, ...s.layout.widgets.map((w) => w.rect.z))
      return {
        layout: {
          ...s.layout,
          widgets: s.layout.widgets.map((w) =>
            w.instanceId === instanceId ? { ...w, rect: { ...w.rect, z: maxZ + 1 } } : w,
          ),
        },
      }
    }),

  sendToBack: (instanceId) =>
    set((s) => {
      const minZ = Math.min(0, ...s.layout.widgets.map((w) => w.rect.z))
      return {
        layout: {
          ...s.layout,
          widgets: s.layout.widgets.map((w) =>
            w.instanceId === instanceId ? { ...w, rect: { ...w.rect, z: minZ - 1 } } : w,
          ),
        },
      }
    }),

  setBackgroundWidget: (instanceId) =>
    set((s) => ({
      layout: { ...s.layout, backgroundWidgetId: instanceId },
    })),

  cloneWidget: (instanceId) => {
    const s = get()
    const original = s.layout.widgets.find((w) => w.instanceId === instanceId)
    if (!original) return
    const clone: WidgetInstance = {
      ...original,
      instanceId: `wi_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      rect: { ...original.rect, x: original.rect.x + 40, y: original.rect.y + 40 },
    }
    set((prev) => ({
      layout: { ...prev.layout, widgets: [...prev.layout.widgets, clone] },
      selectedWidgetId: clone.instanceId,
    }))
  },

  lockWidget: (instanceId) =>
    set((s) => ({
      layout: {
        ...s.layout,
        widgets: s.layout.widgets.map((w) =>
          w.instanceId === instanceId ? { ...w, locked: !w.locked } : w,
        ),
      },
    })),

  /* ── Selection ── */
  selectedWidgetId: null,
  selectWidget: (instanceId) => set({ selectedWidgetId: instanceId }),

  /* ── Focus mode ── */
  focusedWidgetId: null,
  setFocusedWidget: (instanceId) => set({ focusedWidgetId: instanceId }),

  /* ── Editing ── */
  isEditing: false,
  setEditing: (v) =>
    set({
      isEditing: v,
      selectedWidgetId: v ? get().selectedWidgetId : null,
      focusedWidgetId: null,
      snapGuides: [],
      ghostBox: null,
    }),

  /* ── Picker ── */
  pickerOpen: false,
  setPickerOpen: (v) => set({ pickerOpen: v }),

  /* ── Snap guides ── */
  snapGuides: [],
  setSnapGuides: (guides) => set({ snapGuides: guides }),

  /* ── Ghost box ── */
  ghostBox: null,
  setGhostBox: (box) => set({ ghostBox: box }),

  /* ── Quick Dial ── */
  quickDialOpen: false,
  quickDialPosition: { x: 0, y: 0 },
  openQuickDial: (x, y) => set({ quickDialOpen: true, quickDialPosition: { x, y } }),
  closeQuickDial: () => set({ quickDialOpen: false }),

  /* ── Registry ── */
  registry: [],
  registerWidget: (manifest) =>
    set((s) => ({
      registry: s.registry.some((m) => m.id === manifest.id)
        ? s.registry.map((m) => (m.id === manifest.id ? manifest : m))
        : [...s.registry, manifest],
    })),
  unregisterWidget: (widgetId) =>
    set((s) => ({
      registry: s.registry.filter((m) => m.id !== widgetId),
    })),
}))
