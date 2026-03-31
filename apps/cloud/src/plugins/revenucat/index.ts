/**
 * RevenueCat plugin — in-app subscription management.
 */

import { createSkillPlugin } from '../helpers.js'
import type { PluginDefinition } from '../types.js'
import manifest from './manifest.json' with { type: 'json' }

const plugin: PluginDefinition = createSkillPlugin(
  manifest as unknown as PluginDefinition['manifest'],
  {
    skills: {
      bundled: ['revenucat'],
      entries: [
        {
          id: 'revenucat',
          name: 'RevenueCat',
          description: 'Offerings, products, entitlements, packages, and price experiments',
          // biome-ignore lint/suspicious/noTemplateCurlyInString: OpenClaw template syntax
          env: { REVENUECAT_SECRET_KEY: '${env:REVENUECAT_SECRET_KEY}' },
        },
      ],
      install: { npmPackages: ['revenuecat-mcp'] },
    },
    mcp: {
      server: {
        transport: 'stdio',
        command: 'npx',
        args: ['-y', 'revenuecat-mcp'],
        // biome-ignore lint/suspicious/noTemplateCurlyInString: OpenClaw template syntax
        env: { REVENUECAT_SECRET_KEY: '${env:REVENUECAT_SECRET_KEY}' },
      },
    },
  },
)

export default plugin
