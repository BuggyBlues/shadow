/** Anthropic plugin — AI model provider. */

import { createProviderPlugin } from '../helpers.js'
import type { PluginDefinition, PluginManifest } from '../types.js'
import manifest from './manifest.json' with { type: 'json' }

const plugin: PluginDefinition = createProviderPlugin(manifest as PluginManifest, {
  provider: { id: 'anthropic', api: 'anthropic' },
})

export default plugin
