import { defineChannelPluginEntry } from 'openclaw/plugin-sdk/core'
import { setShadowRuntime } from './src/runtime.js'
import { shadowPlugin } from './src/channel.js'

export { ShadowClient } from '@shadowob/sdk'
export { monitorShadowProvider } from './src/monitor.js'
export { shadowPlugin } from './src/channel.js'
export { getShadowRuntime, tryGetShadowRuntime } from './src/runtime.js'

export default defineChannelPluginEntry({
  id: 'openclaw-shadowob',
  name: 'ShadowOwnBuddy',
  description:
    'Shadow server channel plugin — enables AI agents to chat in Shadow channels with threads, reactions, and media support',
  plugin: shadowPlugin,
  setRuntime: setShadowRuntime,
  registerFull(_api) {
    // Full-mode registrations (CLI commands, background services, etc.)
    // can be added here. They are skipped during setup-only loading.
  },
})
