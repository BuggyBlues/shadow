export { BUILTIN_WIDGETS, getBuiltinManifest } from './builtins'
export type { WidgetSandboxHandle } from './sandbox'
export { createWidgetSandbox, generateWidgetSDKScript } from './sandbox'
export type { SnapGuide, SnapResult } from './snap'
export { computeSnap, SNAP_GRID_SIZE, SNAP_THRESHOLD } from './snap'
export { useWidgetEngine } from './store'
export type {
  CanvasLayout,
  CanvasViewport,
  HostToWidgetMessage,
  WidgetAppearance,
  WidgetHostAPI,
  WidgetInstance,
  WidgetManifest,
  WidgetPermission,
  WidgetRect,
  WidgetRenderMode,
  WidgetToHostMessage,
} from './types'
