/**
 * Apollo.io plugin — Sales intelligence via Apollo API.
 */

import { createSkillPlugin } from '../helpers.js'
import type { PluginDefinition } from '../types.js'
import manifest from './manifest.json' with { type: 'json' }

const plugin: PluginDefinition = createSkillPlugin(
  manifest as unknown as PluginDefinition['manifest'],
  {
    skills: {
      bundled: ['apollo'],
      entries: [
        {
          id: 'apollo',
          name: 'Apollo.io',
          description: 'People search, contact enrichment, sequences, deals',
          // biome-ignore lint/suspicious/noTemplateCurlyInString: OpenClaw template syntax
          env: { APOLLO_API_KEY: '${env:APOLLO_API_KEY}' },
        },
      ],
    },
    mcp: {
      server: {
        transport: 'stdio',
        command: 'npx',
        args: ['-y', 'apollo-mcp'],
        // biome-ignore lint/suspicious/noTemplateCurlyInString: OpenClaw template syntax
        env: { APOLLO_API_KEY: '${env:APOLLO_API_KEY}' },
      },
    },
  },
)

export default plugin
