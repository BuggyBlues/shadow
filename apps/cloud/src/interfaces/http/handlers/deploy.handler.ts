/**
 * Deploy handler — deploy, destroy, validate, init, provision, generate.
 */

import { writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { Hono } from 'hono'
import { streamSSE } from 'hono/streaming'
import { redactSecrets } from '../../../utils/redact.js'
import type { HandlerContext } from './types.js'

function cleanupTmpFile(path: string): void {
  try {
    const { unlinkSync } = require('node:fs')
    unlinkSync(path)
  } catch {
    /* ignore */
  }
}

export function createDeployHandler(ctx: HandlerContext): Hono {
  const app = new Hono()

  // ── Deploy (SSE) ──────────────────────────────────────────────────────

  app.post('/deploy', async (c) => {
    let config: Record<string, unknown>
    try {
      config = await c.req.json<Record<string, unknown>>()
    } catch {
      return c.json({ error: 'Invalid JSON body' }, 400)
    }

    // Resolve env vars from DB + wizard inputs for ${env:VAR} template resolution
    const envOverrides: Record<string, string> = {}
    const originalEnv: Record<string, string | undefined> = {}

    // 1. Load saved env vars (decrypted) from DB
    try {
      const dbEnvVars = ctx.envVarDao.findAllDecrypted()
      Object.assign(envOverrides, dbEnvVars)
    } catch { /* ignore */ }

    // 2. Load saved secrets (decrypted, mapped to env var names) from DB
    try {
      const dbSecrets = ctx.secretDao.findAllDecrypted()
      Object.assign(envOverrides, dbSecrets)
    } catch { /* ignore */ }

    // 3. Apply wizard-supplied env vars (override DB values; resolve __SAVED__ sentinel)
    const wizardEnvVars = config.envVars as Record<string, string> | undefined
    if (wizardEnvVars && typeof wizardEnvVars === 'object') {
      for (const [k, v] of Object.entries(wizardEnvVars)) {
        if (typeof v === 'string' && v !== '__SAVED__' && v.trim() !== '') {
          envOverrides[k] = v
        }
        // __SAVED__ → already resolved from DB above; skip
      }
    }

    // Remove envVars from config before writing (not part of the template schema)
    const { envVars: _, ...templateConfig } = config

    const tmpFile = join(tmpdir(), `shadowob-deploy-${Date.now()}.json`)
    writeFileSync(tmpFile, JSON.stringify(templateConfig, null, 2), 'utf-8')

    // Temporarily inject resolved env vars into process.env
    for (const [k, v] of Object.entries(envOverrides)) {
      originalEnv[k] = process.env[k]
      process.env[k] = v
    }

    return streamSSE(c, async (stream) => {
      const sendLog = (msg: string) => {
        void stream.writeSSE({ event: 'log', data: JSON.stringify(msg) })
      }

      try {
        sendLog('Starting deployment...')

        const result = await ctx.container.deploy.up({
          filePath: tmpFile,
          namespace: templateConfig.namespace as string | undefined,
          dryRun: templateConfig.dryRun as boolean | undefined,
          onOutput: (out: string) => {
            for (const line of out.split('\n').filter(Boolean)) {
              void stream.writeSSE({ event: 'log', data: JSON.stringify(redactSecrets(line)) })
            }
          },
        })

        // Record deployment in DB
        try {
          ctx.deploymentDao.create({
            namespace: result.namespace ?? (config.namespace as string) ?? 'shadowob-cloud',
            templateSlug: (config.templateSlug as string) ?? 'unknown',
            status: 'deployed',
            config: config,
            agentCount: result.agentCount ?? 0,
          })
        } catch {
          /* non-critical */
        }

        await stream.writeSSE({
          event: 'done',
          data: JSON.stringify({
            exitCode: 0,
            result: { namespace: result.namespace, agentCount: result.agentCount },
          }),
        })
      } catch (err) {
        await stream.writeSSE({
          event: 'done',
          data: JSON.stringify({ exitCode: 1, error: (err as Error).message }),
        })
      } finally {
        cleanupTmpFile(tmpFile)
        // Restore process.env
        for (const [k, v] of Object.entries(originalEnv)) {
          if (v === undefined) {
            delete process.env[k]
          } else {
            process.env[k] = v
          }
        }
      }
    })
  })

  // ── Destroy ─────────────────────────────────────────────────────────────

  app.post('/destroy', async (c) => {
    try {
      const body = await c.req.json<{ namespace?: string; stack?: string }>()
      const ns = body.namespace ?? ctx.namespaces[0] ?? 'shadowob-cloud'
      await ctx.container.deploy.destroy({ namespace: ns, stack: body.stack })
      return c.json({ ok: true, namespace: ns })
    } catch (err) {
      return c.json({ error: (err as Error).message }, 500)
    }
  })

  // ── Validate ────────────────────────────────────────────────────────────

  app.post('/validate', async (c) => {
    try {
      const configData = await c.req.json<Record<string, unknown>>()
      const tmpFile = join(tmpdir(), `shadowob-validate-${Date.now()}.json`)
      writeFileSync(tmpFile, JSON.stringify(configData, null, 2), 'utf-8')

      try {
        const { config, violations } = ctx.container.config.validate(tmpFile)
        const refs = ctx.container.config.collectTemplateRefs(config)
        const agents = config.deployments?.agents ?? []
        const configurations = config.registry?.configurations ?? []

        const configIds = new Set(configurations.map((cfg: any) => cfg.id))
        const extendsErrors: string[] = []
        for (const agent of agents) {
          if (agent.configuration.extends && !configIds.has(agent.configuration.extends)) {
            extendsErrors.push(
              `Agent "${agent.id}" extends "${agent.configuration.extends}" not in registry.configurations`,
            )
          }
        }

        return c.json({
          valid: violations.length === 0 && extendsErrors.length === 0,
          agents: agents.length,
          configurations: configurations.length,
          violations: violations.map((v: any) => ({ path: v.path, prefix: v.prefix })),
          extendsErrors,
          templateRefs: {
            env: refs.filter((r: { type: string }) => r.type === 'env').length,
            secret: refs.filter((r: { type: string }) => r.type === 'secret').length,
            file: refs.filter((r: { type: string }) => r.type === 'file').length,
          },
        })
      } finally {
        cleanupTmpFile(tmpFile)
      }
    } catch (err) {
      return c.json({ error: (err as Error).message }, 400)
    }
  })

  // ── Init ────────────────────────────────────────────────────────────────

  app.post('/init', async (c) => {
    try {
      const body = await c.req.json<{ template?: string }>()
      const templateName = body.template ?? 'shadowob-cloud'
      const content = ctx.container.template.getTemplate(templateName)
      if (!content) {
        return c.json({ error: `Template not found: ${templateName}` }, 404)
      }

      // Persist the initialized config to DB
      ctx.configDao.upsert('current', content, templateName)

      return c.json(content)
    } catch (err) {
      return c.json({ error: (err as Error).message }, 400)
    }
  })

  // ── Provision ───────────────────────────────────────────────────────────

  app.post('/provision', async (c) => {
    try {
      const body = await c.req.json<{
        config: Record<string, unknown>
        shadowUrl?: string
        shadowToken?: string
        dryRun?: boolean
      }>()

      const shadowUrl = body.shadowUrl ?? process.env.SHADOW_SERVER_URL
      const shadowToken = body.shadowToken ?? process.env.SHADOW_USER_TOKEN

      if (!shadowUrl || !shadowToken) {
        return c.json({ error: 'shadowUrl and shadowToken are required' }, 400)
      }

      const tmpFile = join(tmpdir(), `shadowob-provision-${Date.now()}.json`)
      writeFileSync(tmpFile, JSON.stringify(body.config, null, 2), 'utf-8')

      try {
        const config = ctx.container.config.parseFile(tmpFile)
        const result = await ctx.container.provision.provision(config, {
          serverUrl: shadowUrl,
          userToken: shadowToken,
          dryRun: body.dryRun,
        })

        return c.json({
          ok: true,
          servers: Object.fromEntries(result.servers),
          channels: Object.fromEntries(result.channels),
          buddies: Object.fromEntries(
            [...result.buddies].map(([id, info]) => [
              id,
              { agentId: info.agentId, userId: info.userId },
            ]),
          ),
        })
      } finally {
        cleanupTmpFile(tmpFile)
      }
    } catch (err) {
      return c.json({ error: (err as Error).message }, 500)
    }
  })

  // ── Generate ────────────────────────────────────────────────────────────

  app.post('/generate/manifests', async (c) => {
    try {
      const body = await c.req.json<{
        config: Record<string, unknown>
        namespace?: string
        shadowUrl?: string
      }>()

      const tmpFile = join(tmpdir(), `shadowob-gen-${Date.now()}.json`)
      writeFileSync(tmpFile, JSON.stringify(body.config, null, 2), 'utf-8')

      try {
        const config = ctx.container.config.parseFile(tmpFile)
        const resolved = ctx.container.config.resolve(config)
        const ns = body.namespace ?? config.deployments?.namespace ?? 'shadowob-cloud'
        const manifests = ctx.container.manifest.build({
          config: resolved,
          namespace: ns,
          shadowServerUrl: body.shadowUrl,
        })
        return c.json({ manifests, count: manifests.length })
      } finally {
        cleanupTmpFile(tmpFile)
      }
    } catch (err) {
      return c.json({ error: (err as Error).message }, 400)
    }
  })

  app.post('/generate/openclaw-config', async (c) => {
    try {
      const body = await c.req.json<{ config: Record<string, unknown>; agentId: string }>()

      const tmpFile = join(tmpdir(), `shadowob-oc-${Date.now()}.json`)
      writeFileSync(tmpFile, JSON.stringify(body.config, null, 2), 'utf-8')

      try {
        const config = ctx.container.config.parseFile(tmpFile)
        const resolved = ctx.container.config.resolve(config)
        const agent = resolved.deployments?.agents?.find((a: any) => a.id === body.agentId)
        if (!agent) {
          return c.json({ error: `Agent "${body.agentId}" not found` }, 404)
        }
        const openclawConfig = ctx.container.config.buildOpenClawConfig(agent, resolved)
        delete openclawConfig._workspaceFiles
        return c.json(openclawConfig)
      } finally {
        cleanupTmpFile(tmpFile)
      }
    } catch (err) {
      return c.json({ error: (err as Error).message }, 400)
    }
  })

  return app
}
