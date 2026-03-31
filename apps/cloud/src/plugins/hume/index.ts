/**
 * Hume AI plugin — emotion AI and empathic voice interface.
 * Uses the official @humeai/mcp-server for real-time emotion analysis.
 */

import type { PluginDefinition } from '../types.js'
import { createSkillPlugin } from '../helpers.js'
import manifest from './manifest.json' with { type: 'json' }

const plugin: PluginDefinition = createSkillPlugin(
  manifest as unknown as PluginDefinition['manifest'],
  {
    skills: {
      bundled: ['hume'],
      entries: [
        {
          id: 'hume-evi',
          name: 'Hume EVI',
          description: 'Empathic Voice Interface — emotion-aware AI conversations',
          // biome-ignore lint/suspicious/noTemplateCurlyInString: OpenClaw template syntax
          apiKey: '${env:HUME_API_KEY}',
        },
        {
          id: 'hume-expression',
          name: 'Hume Expression Measurement',
          description: 'Analyze facial expressions and vocal emotions',
          // biome-ignore lint/suspicious/noTemplateCurlyInString: OpenClaw template syntax
          apiKey: '${env:HUME_API_KEY}',
        },
      ],
      install: { npmPackages: ['@humeai/mcp-server'] },
    },
    mcp: {
      server: {
        transport: 'stdio',
        command: 'npx',
        args: ['-y', '@humeai/mcp-server'],
        // biome-ignore lint/suspicious/noTemplateCurlyInString: OpenClaw template syntax
        env: { HUME_API_KEY: '${env:HUME_API_KEY}' },
      },
    },
  },
)

export default plugin
