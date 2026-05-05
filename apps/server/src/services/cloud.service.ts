import { readdir, readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { validateCloudSaasConfigSnapshot } from '@shadowob/cloud'
import type { CloudActivityDao } from '../dao/cloud-activity.dao'
import type { CloudClusterDao } from '../dao/cloud-cluster.dao'
import type { CloudDeploymentDao } from '../dao/cloud-deployment.dao'
import type { CloudTemplateDao } from '../dao/cloud-template.dao'
import { decrypt, encrypt } from '../lib/kms'

export class CloudService {
  constructor(
    private deps: {
      cloudDeploymentDao: CloudDeploymentDao
      cloudTemplateDao: CloudTemplateDao
      cloudClusterDao: CloudClusterDao
      cloudActivityDao: CloudActivityDao
    },
  ) {}

  // ─── Template Seed ───────────────────────────────────────────────────────

  private getTemplateMetadata(slug: string, content: Record<string, unknown>) {
    const name =
      typeof content.title === 'string' && content.title.trim()
        ? content.title
        : slug
            .split('-')
            .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
            .join(' ')
    const description =
      typeof content.description === 'string' && content.description.trim()
        ? content.description
        : undefined
    const tags = Array.isArray(content.tags)
      ? content.tags.filter((tag): tag is string => typeof tag === 'string')
      : undefined

    return { name, description, tags }
  }

  /**
   * Idempotently seed official templates from the @shadowob/cloud templates/ directory.
   * Called once on server startup.
   */
  async seedOfficialTemplates(templatesDir: string) {
    return this.refreshOfficialTemplates(templatesDir, { prune: false })
  }

  async refreshOfficialTemplates(templatesDir: string, options?: { prune?: boolean }) {
    let files: string[]
    try {
      files = await readdir(templatesDir)
    } catch {
      return {
        templatesDir,
        totalFiles: 0,
        created: 0,
        updated: 0,
        skipped: 0,
        pruned: 0,
        slugs: [],
        skippedFiles: [{ file: templatesDir, reason: 'templates directory not found' }],
        prunedSlugs: [],
      }
    }

    const jsonFiles = files.filter((f) => f.endsWith('.template.json'))
    const fileSlugs = jsonFiles.map((file) => file.replace('.template.json', ''))
    const slugs: string[] = []
    const skippedFiles: Array<{ file: string; reason: string }> = []
    let created = 0
    let updated = 0

    for (const file of jsonFiles) {
      const slug = file.replace('.template.json', '')
      const raw = await readFile(join(templatesDir, file), 'utf-8')
      let content: Record<string, unknown>
      try {
        content = validateCloudSaasConfigSnapshot(JSON.parse(raw))
      } catch (err) {
        const reason = err instanceof Error ? err.message : String(err)
        skippedFiles.push({ file, reason })
        console.warn(`[cloud] Skipping invalid official template "${file}": ${reason}`)
        continue
      }
      const existing = await this.deps.cloudTemplateDao.findBySlug(slug)
      if (existing && existing.source !== 'official') {
        skippedFiles.push({ file, reason: `slug already exists as ${existing.source}` })
        continue
      }
      const { name, description, tags } = this.getTemplateMetadata(slug, content)
      await this.deps.cloudTemplateDao.upsertOfficial({ slug, name, description, tags, content })
      slugs.push(slug)
      if (existing) {
        updated += 1
      } else {
        created += 1
      }
    }

    const shouldPrune = options?.prune === true && fileSlugs.length > 0
    const prunedRows = shouldPrune
      ? await this.deps.cloudTemplateDao.deleteOfficialNotIn(fileSlugs)
      : []

    return {
      templatesDir,
      totalFiles: jsonFiles.length,
      created,
      updated,
      skipped: skippedFiles.length,
      pruned: prunedRows.length,
      slugs,
      skippedFiles,
      prunedSlugs: prunedRows.map((row) => row.slug),
    }
  }

  // ─── Deploy ──────────────────────────────────────────────────────────────

  async createDeployment(data: {
    userId: string
    namespace: string
    name: string
    clusterId?: string | null
    agentCount?: number
    configSnapshot?: unknown
  }) {
    if (data.clusterId) {
      const cluster = await this.deps.cloudClusterDao.findById(data.clusterId, data.userId)
      if (!cluster) {
        throw Object.assign(new Error('Cluster not found'), { status: 403 })
      }
    }
    const deployment = await this.deps.cloudDeploymentDao.create(data)
    if (!deployment) throw new Error('Failed to create deployment')
    await this.deps.cloudActivityDao.log({
      userId: data.userId,
      type: 'deploy',
      namespace: data.namespace,
      meta: { deploymentId: deployment.id, name: data.name },
    })
    return deployment
  }

  // ─── Cluster BYOK ────────────────────────────────────────────────────────

  async addCluster(data: {
    userId: string
    name: string
    kubeconfig: string // plaintext, will be encrypted
  }) {
    const encryptedValue = encrypt(data.kubeconfig)
    const cluster = await this.deps.cloudClusterDao.create({
      userId: data.userId,
      name: data.name,
      kubeconfigEncrypted: encryptedValue,
    })
    if (!cluster) throw new Error('Failed to create cluster')
    await this.deps.cloudActivityDao.log({
      userId: data.userId,
      type: 'cluster_add',
      meta: { clusterId: cluster.id, name: data.name },
    })
    return cluster
  }

  async getDecryptedKubeconfig(clusterId: string, userId: string): Promise<string | null> {
    const cluster = await this.deps.cloudClusterDao.findById(clusterId, userId)
    if (!cluster?.kubeconfigEncrypted) return null
    return decrypt(cluster.kubeconfigEncrypted)
  }
}
