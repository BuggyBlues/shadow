import type { CloudConfigValidationSummary } from './config-validation.js'
import { GENERATED_TEMPLATE_LIBRARY } from './template-library.generated.js'

export interface TemplateLibraryEntry {
  slug: string
  title: string
  description: string
  category: string
  plugins: string[]
  channels: string[]
  buddyNames: string[]
  agentCount: number
  systemPromptExcerpt: string
  valid: boolean
  validation: CloudConfigValidationSummary
  searchText: string
}

export interface TemplateLibrarySearchResult extends TemplateLibraryEntry {
  score: number
  matchedTerms: string[]
}

const TEMPLATE_ALIASES: Record<string, string[]> = {
  周报: ['brief', 'report', 'daily'],
  简报: ['brief', 'morning'],
  增长: ['growth', 'seo', 'gstack'],
  科研: ['scientific', 'research'],
  财务: ['financial', 'retire'],
  代码: ['code', 'git', 'github'],
  营销: ['marketing', 'ads', 'seo'],
}

function normalizeQuery(query: string) {
  const rawTerms = query
    .toLowerCase()
    .split(/[^a-z0-9\u4e00-\u9fa5._-]+/u)
    .map((term) => term.trim())
    .filter((term) => term.length >= 2)
    .slice(0, 40)
  const terms = new Set<string>()
  for (const term of rawTerms) {
    terms.add(term)
    for (const [alias, aliases] of Object.entries(TEMPLATE_ALIASES)) {
      if (term.includes(alias)) {
        for (const item of aliases) terms.add(item)
      }
    }
  }
  return [...terms]
}

export function listTemplateLibrary(): TemplateLibraryEntry[] {
  return GENERATED_TEMPLATE_LIBRARY
}

export function searchTemplateLibrary(
  query: string,
  options: { limit?: number } = {},
): TemplateLibrarySearchResult[] {
  const terms = normalizeQuery(query)
  return listTemplateLibrary()
    .map((entry) => {
      let score = entry.valid ? 8 : -100
      const matchedTerms: string[] = []
      for (const term of terms) {
        if (!entry.searchText.includes(term)) continue
        matchedTerms.push(term)
        if (entry.slug.includes(term)) score += 18
        if (entry.title.toLowerCase().includes(term)) score += 14
        if (entry.plugins.some((plugin) => plugin.includes(term))) score += 9
        if (entry.channels.some((channel) => channel.toLowerCase().includes(term))) score += 4
        score += 3
      }
      return { ...entry, score, matchedTerms }
    })
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score || a.slug.localeCompare(b.slug))
    .slice(0, options.limit ?? 8)
}
