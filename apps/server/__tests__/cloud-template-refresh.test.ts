import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { CloudService } from '../src/services/cloud.service'

type TemplateRow = {
  id: string
  slug: string
  name: string
  description?: string | null
  source: 'official' | 'community'
  reviewStatus: 'draft' | 'pending' | 'approved' | 'rejected'
  content: unknown
  tags: string[]
}

function makeTemplate(slug: string, title = slug): Record<string, unknown> {
  return {
    version: '1',
    title,
    description: `${title} description`,
    tags: ['ops', 123],
    deployments: {
      agents: [{ id: `${slug}-agent`, runtime: 'openclaw' }],
    },
  }
}

function createService(rows: TemplateRow[]) {
  const store = new Map(rows.map((row) => [row.slug, row]))
  const cloudTemplateDao = {
    async findBySlug(slug: string) {
      return store.get(slug) ?? null
    },
    async upsertOfficial(data: {
      slug: string
      name: string
      description?: string
      content: unknown
      tags?: string[]
    }) {
      const existing = store.get(data.slug)
      const row: TemplateRow = {
        id: existing?.id ?? `tpl-${data.slug}`,
        slug: data.slug,
        name: data.name,
        description: data.description ?? null,
        source: 'official',
        reviewStatus: 'approved',
        content: data.content,
        tags: data.tags ?? [],
      }
      store.set(data.slug, row)
      return row
    },
    async deleteOfficialNotIn(slugs: string[]) {
      const keep = new Set(slugs)
      const deleted: TemplateRow[] = []
      for (const row of store.values()) {
        if (row.source === 'official' && !keep.has(row.slug)) {
          deleted.push(row)
        }
      }
      for (const row of deleted) store.delete(row.slug)
      return deleted
    },
  }
  const service = new CloudService({
    cloudTemplateDao,
    cloudDeploymentDao: {},
    cloudClusterDao: {},
    cloudActivityDao: {},
  } as never)

  return { service, store }
}

let tmpDir: string | undefined

afterEach(async () => {
  if (tmpDir) await rm(tmpDir, { recursive: true, force: true })
  tmpDir = undefined
})

describe('CloudService.refreshOfficialTemplates', () => {
  it('syncs official templates from disk and prunes stale official rows', async () => {
    tmpDir = await mkdtemp(join(tmpdir(), 'shadow-cloud-templates-'))
    await writeFile(
      join(tmpDir, 'alpha.template.json'),
      JSON.stringify(makeTemplate('alpha', 'Alpha')),
    )
    await writeFile(
      join(tmpDir, 'community-conflict.template.json'),
      JSON.stringify(makeTemplate('community-conflict')),
    )
    await writeFile(join(tmpDir, 'broken.template.json'), JSON.stringify({ version: '1' }))

    const { service, store } = createService([
      {
        id: 'stale-1',
        slug: 'stale-template',
        name: 'Stale Template',
        source: 'official',
        reviewStatus: 'approved',
        content: makeTemplate('stale-template'),
        tags: [],
      },
      {
        id: 'community-1',
        slug: 'community-conflict',
        name: 'Community Conflict',
        source: 'community',
        reviewStatus: 'approved',
        content: makeTemplate('community-conflict'),
        tags: [],
      },
    ])

    const result = await service.refreshOfficialTemplates(tmpDir, { prune: true })

    expect(result).toMatchObject({
      totalFiles: 3,
      created: 1,
      updated: 0,
      skipped: 2,
      pruned: 1,
      slugs: ['alpha'],
      prunedSlugs: ['stale-template'],
    })
    expect(store.get('alpha')).toMatchObject({
      name: 'Alpha',
      source: 'official',
      tags: ['ops'],
    })
    expect(store.has('stale-template')).toBe(false)
    expect(store.get('community-conflict')?.source).toBe('community')
  })

  it('startup seed keeps stale official rows when prune is disabled', async () => {
    tmpDir = await mkdtemp(join(tmpdir(), 'shadow-cloud-templates-'))
    await writeFile(
      join(tmpDir, 'alpha.template.json'),
      JSON.stringify(makeTemplate('alpha', 'Alpha')),
    )
    const { service, store } = createService([
      {
        id: 'stale-1',
        slug: 'stale-template',
        name: 'Stale Template',
        source: 'official',
        reviewStatus: 'approved',
        content: makeTemplate('stale-template'),
        tags: [],
      },
    ])

    const result = await service.seedOfficialTemplates(tmpDir)

    expect(result.pruned).toBe(0)
    expect(store.has('stale-template')).toBe(true)
  })
})
