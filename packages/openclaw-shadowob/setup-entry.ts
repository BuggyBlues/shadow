import { defineSetupPluginEntry } from 'openclaw/plugin-sdk/core'
import { shadowSetupPlugin } from './src/channel/setup.js'

export default defineSetupPluginEntry(shadowSetupPlugin)
