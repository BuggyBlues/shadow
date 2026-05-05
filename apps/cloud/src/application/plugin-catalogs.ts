import type { PluginCapability, PluginCategory, PluginManifest } from '../plugins/types.js'
import { listPluginLibrary } from './plugin-library.js'

export interface PluginCatalogEntry {
  id: string
  name: string
  description: string
  category: PluginCategory
  capabilities: PluginCapability[]
  tags: string[]
  authType: PluginManifest['auth']['type']
  requiredFields: Array<{
    key: string
    label: string
    description?: string
    sensitive: boolean
  }>
}

export function listPluginCatalogs(): PluginCatalogEntry[] {
  return listPluginLibrary()
    .map((entry) => {
      const { manifest } = entry
      return {
        id: manifest.id,
        name: manifest.name,
        description: manifest.description,
        category: manifest.category,
        capabilities: manifest.capabilities,
        tags: manifest.tags,
        authType: manifest.auth.type,
        requiredFields: manifest.auth.fields
          .filter((field) => field.required)
          .map((field) => ({
            key: field.key,
            label: field.label,
            description: field.description,
            sensitive: field.sensitive,
          })),
      }
    })
    .sort((a, b) => a.category.localeCompare(b.category) || a.id.localeCompare(b.id))
}
