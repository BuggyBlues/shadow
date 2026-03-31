/** Anthropic plugin — AI model provider. */

import { createProviderPlugin } from '../helpers.js'
import type { PluginDefinition } from '../types.js'
import manifest from './manifest.json' with { type: 'json' }

const plugin: PluginDefinition = createProviderPlugin(
  manifest as unknown as PluginDefinition['manifest'],
  {
    provider: { id: 'anthropic', api: 'anthropic' },
    defaultModel: 'claude-sonnet-4-20250514',
  },
)

export default plugin
