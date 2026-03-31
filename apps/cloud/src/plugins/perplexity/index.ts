/** Perplexity plugin — AI model provider. */

import { createProviderPlugin } from '../helpers.js'
import type { PluginDefinition } from '../types.js'
import manifest from './manifest.json' with { type: 'json' }

const plugin: PluginDefinition = createProviderPlugin(
  manifest as unknown as PluginDefinition['manifest'],
  {
    provider: { id: 'perplexity', api: 'openai', baseUrl: 'https://api.perplexity.ai' },
    defaultModel: 'llama-3.1-sonar-large-128k-online',
  },
)

export default plugin
