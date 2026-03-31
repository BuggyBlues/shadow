/**
 * Cluster handler — deployments, pods, logs, scale.
 */

import { Hono } from 'hono'
import { streamSSE } from 'hono/streaming'
import { redactSecrets } from '../../../utils/redact.js'
import type { HandlerContext } from './types.js'

export function createClusterHandler(ctx: HandlerContext): Hono {
  const app = new Hono()

  app.get('/deployments', (c) => {
    const result: unknown[] = []
    for (const ns of ctx.namespaces) {
      try {
        const deps = ctx.container.k8s.getDeployments(ns)
        for (const d of deps) result.push({ ...d, namespace: ns })
      } catch {
        /* namespace may not exist */
      }
    }
    return c.json(result)
  })

  app.get('/deployments/:ns/:id/pods', (c) => {
    const ns = c.req.param('ns')
    const agentId = c.req.param('id')
    try {
      const allPods = ctx.container.k8s.getPods(ns)
      const filtered = agentId ? allPods.filter((p: any) => p.name.includes(agentId)) : allPods
      return c.json(filtered)
    } catch (err) {
      return c.json({ error: String(err) }, 500)
    }
  })

  app.get('/deployments/:ns/:id/logs', (c) => {
    const ns = c.req.param('ns')
    const podName = c.req.param('id')

    return streamSSE(c, async (stream) => {
      const child = ctx.container.k8s.streamLogs(ns, podName, { follow: true, tail: 200 })
      stream.onAbort(() => { child.kill() })

      let buffer = ''
      child.stdout?.on('data', (chunk: Buffer) => {
        buffer += chunk.toString()
        const lines = buffer.split('\n')
        buffer = lines.pop() ?? ''
        for (const line of lines) {
          void stream.writeSSE({ data: JSON.stringify(redactSecrets(line)) })
        }
      })
      child.stderr?.on('data', (chunk: Buffer) => {
        for (const line of chunk.toString().split('\n').filter(Boolean)) {
          void stream.writeSSE({ data: JSON.stringify(redactSecrets(`[stderr] ${line}`)) })
        }
      })

      await new Promise<void>((resolve) => {
        child.on('close', () => {
          void stream.writeSSE({ event: 'close', data: '{}' })
          resolve()
        })
      })
    })
  })

  app.post('/deployments/:ns/:id/scale', async (c) => {
    const ns = c.req.param('ns')
    const name = c.req.param('id')
    try {
      const body = await c.req.json<{ replicas: number }>()
      if (typeof body.replicas !== 'number' || body.replicas < 0) {
        return c.json({ error: 'Invalid replicas count' }, 400)
      }
      ctx.container.k8s.scaleDeployment(ns, name, body.replicas)
      return c.json({ ok: true, name, namespace: ns, replicas: body.replicas })
    } catch (err) {
      return c.json({ error: (err as Error).message }, 500)
    }
  })

  return app
}
