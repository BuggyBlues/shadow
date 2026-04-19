/**
 * Plugin Registry — stores and queries registered plugins.
 */

import type { PluginCapability, PluginCategory, PluginDefinition, PluginRegistry } from './types.js'

export function createPluginRegistry(): PluginRegistry {
  const plugins = new Map<string, PluginDefinition>()

  return {
    get size() {
      return plugins.size
    },

    register(plugin: PluginDefinition): void {
      const { id, version } = plugin.manifest
      const existing = plugins.get(id)
      if (existing) {
        // Idempotent: same version is a no-op (handles repeated loadAllPlugins in tests)
        if (existing.manifest.version === version) return
        // Different version: overwrite (e.g. hot-reload during development)
        console.warn(`Plugin "${id}" re-registered with version ${version} (was ${existing.manifest.version})`)
      }
      plugins.set(id, plugin)
    },

    get(id: string): PluginDefinition | undefined {
      return plugins.get(id)
    },

    getAll(): PluginDefinition[] {
      return [...plugins.values()]
    },

    getByCategory(category: PluginCategory): PluginDefinition[] {
      return [...plugins.values()].filter((p) => p.manifest.category === category)
    },

    getByCapability(cap: PluginCapability): PluginDefinition[] {
      return [...plugins.values()].filter((p) => p.manifest.capabilities.includes(cap))
    },

    search(query: string): PluginDefinition[] {
      const q = query.toLowerCase()
      return [...plugins.values()].filter((p) => {
        const m = p.manifest
        return (
          m.name.toLowerCase().includes(q) ||
          m.description.toLowerCase().includes(q) ||
          m.id.toLowerCase().includes(q) ||
          m.tags.some((t) => t.toLowerCase().includes(q))
        )
      })
    },
  }
}

// ─── Singleton ──────────────────────────────────────────────────────────────

let _globalRegistry: PluginRegistry | null = null

export function getPluginRegistry(): PluginRegistry {
  if (!_globalRegistry) {
    _globalRegistry = createPluginRegistry()
  }
  return _globalRegistry
}

export function resetPluginRegistry(): void {
  _globalRegistry = null
}
