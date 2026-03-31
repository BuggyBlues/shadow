/** Cohere plugin — AI model provider. */

import { createProviderPlugin } from '../helpers.js'
import type { PluginDefinition } from '../types.js'
import manifest from './manifest.json' with { type: 'json' }

const plugin: PluginDefinition = createProviderPlugin(
  manifest as unknown as PluginDefinition['manifest'],
  {
    provider: { id: 'cohere', api: 'openai', baseUrl: 'https://api.cohere.com/v2' },
    defaultModel: 'command-r-plus',
  },
)

export default plugin
