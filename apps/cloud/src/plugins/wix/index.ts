/**
 * Wix plugin — Documentation and site management via official Wix MCP server.
 */

import { createSkillPlugin } from '../helpers.js'
import type { PluginDefinition } from '../types.js'
import manifest from './manifest.json' with { type: 'json' }

const plugin: PluginDefinition = createSkillPlugin(
  manifest as unknown as PluginDefinition['manifest'],
  {
    skills: {
      bundled: ['wix'],
      entries: [
        {
          id: 'wix',
          name: 'Wix',
          description: 'Documentation search, design system, SDK reference, site API access',
          // biome-ignore lint/suspicious/noTemplateCurlyInString: OpenClaw template syntax
          env: { WIX_API_KEY: '${env:WIX_API_KEY}' },
        },
      ],
    },
    mcp: {
      server: {
        transport: 'stdio',
        command: 'npx',
        args: ['-y', '@wix/mcp'],
      },
    },
  },
)

export default plugin
