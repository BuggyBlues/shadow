/**
 * TemplateService — template discovery and reading.
 *
 * Provides access to config templates for `init` and `serve` commands.
 */

import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

export interface TemplateMeta {
  name: string
  file: string
  description: string
  teamName: string
  agentCount: number
  namespace: string
}

export class TemplateService {
  private templatesDir: string

  constructor(templatesDir?: string) {
    // After tsup bundling, import.meta.url points to dist/index.js
    // so we only need to go up 1 level to reach the package root.
    this.templatesDir =
      templatesDir ?? resolve(fileURLToPath(import.meta.url), '..', '..', 'templates')
  }

  /** Get the templates directory path. */
  getDir(): string {
    return this.templatesDir
  }

  /** Discover all available config templates. */
  discover(): TemplateMeta[] {
    if (!existsSync(this.templatesDir)) return []
    return readdirSync(this.templatesDir)
      .filter((f) => f.endsWith('.template.json'))
      .map((file) => {
        const name = file.replace(/\.template\.json$/, '')
        const filePath = resolve(this.templatesDir, file)
        try {
          const raw = JSON.parse(readFileSync(filePath, 'utf-8'))
          return {
            name,
            file,
            description: raw.description ?? raw.team?.description ?? '',
            teamName: raw.team?.name ?? raw.name ?? name,
            agentCount: (raw.deployments?.agents ?? []).length,
            namespace: raw.deployments?.namespace ?? name,
          }
        } catch {
          return { name, file, description: '', teamName: name, agentCount: 0, namespace: name }
        }
      })
      .sort((a, b) => {
        if (a.name === 'shadowob-cloud') return -1
        if (b.name === 'shadowob-cloud') return 1
        return a.name.localeCompare(b.name)
      })
  }

  /** Read a template by name. Returns parsed JSON or null if not found. */
  getTemplate(name: string): unknown | null {
    const filePath = resolve(this.templatesDir, `${name}.template.json`)
    if (!existsSync(filePath)) return null
    try {
      return JSON.parse(readFileSync(filePath, 'utf-8'))
    } catch {
      return null
    }
  }

  /** List templates in a display-friendly format. */
  list(): Array<{
    name: string
    description: string
    teamName: string
    agentCount: number
    namespace: string
  }> {
    return this.discover()
  }
}
