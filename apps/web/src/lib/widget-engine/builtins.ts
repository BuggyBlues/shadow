/* ─────────────────────────────────────────────────────────────────────────────
 *  Shadow OS — Built-in Widget Manifests
 *
 *  Registers the default widgets that ship with every server home canvas.
 *  These are native React widgets rendered in-process (renderMode: 'react').
 * ───────────────────────────────────────────────────────────────────────────── */

import type { WidgetManifest } from './types'

export const BUILTIN_WIDGETS: WidgetManifest[] = [
  {
    id: 'builtin:hero-banner',
    name: 'serverHome.widgetHeroBanner',
    description: 'Server identity hero with icon, name and description',
    icon: 'Sparkles',
    renderMode: 'react',
    permissions: [],
    appearance: { borderless: false, transparent: false, radius: 32 },
    defaultRect: { x: 0, y: 0, w: 920, h: 160 },
    tags: ['identity', 'builtin'],
  },
  {
    id: 'builtin:activity-feed',
    name: 'serverHome.widgetActivity',
    description: 'Live feed of recent channel activity and Buddy actions',
    icon: 'TrendingUp',
    renderMode: 'react',
    permissions: [],
    appearance: { borderless: false, transparent: false, radius: 28 },
    defaultRect: { x: 0, y: 180, w: 450, h: 300 },
    tags: ['social', 'builtin'],
  },
  {
    id: 'builtin:buddy-roster',
    name: 'serverHome.widgetBuddies',
    description: 'Resident Buddy roster with online status',
    icon: 'PawPrint',
    renderMode: 'react',
    permissions: ['buddy.subscribe'],
    appearance: { borderless: false, transparent: false, radius: 28 },
    defaultRect: { x: 470, y: 180, w: 450, h: 300 },
    tags: ['buddy', 'builtin'],
  },
  {
    id: 'builtin:quick-actions',
    name: 'serverHome.widgetQuickActions',
    description: 'Shortcut buttons for Chat, Store, Workspace',
    icon: 'Zap',
    renderMode: 'react',
    permissions: [],
    appearance: { borderless: false, transparent: false, radius: 28 },
    defaultRect: { x: 0, y: 500, w: 450, h: 240 },
    tags: ['navigation', 'builtin'],
  },
  {
    id: 'builtin:channel-overview',
    name: 'serverHome.widgetChannels',
    description: 'Channel count stats overview',
    icon: 'Hash',
    renderMode: 'react',
    permissions: [],
    appearance: { borderless: false, transparent: false, radius: 28 },
    defaultRect: { x: 470, y: 500, w: 450, h: 240 },
    tags: ['channels', 'builtin'],
  },
]

/** Get a builtin manifest by ID */
export function getBuiltinManifest(id: string): WidgetManifest | undefined {
  return BUILTIN_WIDGETS.find((m) => m.id === id)
}
