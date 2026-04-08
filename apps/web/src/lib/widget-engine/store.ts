/* ─────────────────────────────────────────────────────────────────────────────
 *  Shadow OS — Widget Engine Store (Zustand)
 *
 *  Manages the canvas layout, widget instances, viewport state, and the
 *  currently selected / editing widget for the active server home.
 * ───────────────────────────────────────────────────────────────────────────── */

import { create } from 'zustand'
import type {
  CanvasLayout,
  CanvasViewport,
  WidgetInstance,
  WidgetManifest,
  WidgetRect,
} from './types'

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
  bringToFront: (instanceId: string) => void
  sendToBack: (instanceId: string) => void
  setBackgroundWidget: (instanceId: string | null) => void

  /* ── Selection ── */
  selectedWidgetId: string | null
  selectWidget: (instanceId: string | null) => void

  /* ── Editing mode ── */
  isEditing: boolean
  setEditing: (v: boolean) => void

  /* ── Widget Picker ── */
  pickerOpen: boolean
  setPickerOpen: (v: boolean) => void

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
      const snap = s.layout.gridSnap
      const applySnap = (v: number) => (snap > 0 ? Math.round(v / snap) * snap : v)
      return {
        layout: {
          ...s.layout,
          widgets: s.layout.widgets.map((w) =>
            w.instanceId === instanceId
              ? {
                  ...w,
                  rect: {
                    ...w.rect,
                    ...(rect.x != null ? { x: applySnap(rect.x) } : {}),
                    ...(rect.y != null ? { y: applySnap(rect.y) } : {}),
                    ...(rect.w != null ? { w: Math.max(0, rect.w) } : {}),
                    ...(rect.h != null ? { h: Math.max(0, rect.h) } : {}),
                    ...(rect.z != null ? { z: rect.z } : {}),
                  },
                }
              : w,
          ),
        },
      }
    }),

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

  /* ── Selection ── */
  selectedWidgetId: null,
  selectWidget: (instanceId) => set({ selectedWidgetId: instanceId }),

  /* ── Editing ── */
  isEditing: false,
  setEditing: (v) => set({ isEditing: v, selectedWidgetId: v ? get().selectedWidgetId : null }),

  /* ── Picker ── */
  pickerOpen: false,
  setPickerOpen: (v) => set({ pickerOpen: v }),

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
