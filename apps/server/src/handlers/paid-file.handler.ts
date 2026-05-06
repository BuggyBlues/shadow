import { Hono } from 'hono'
import { lookup } from 'mime-types'
import type { AppContainer } from '../container'
import { authMiddleware } from '../middleware/auth.middleware'

export function createPaidFileHandler(container: AppContainer) {
  const h = new Hono()

  h.get('/paid-files/:fileId', authMiddleware, async (c) => {
    const user = c.get('user')
    const fileId = c.req.param('fileId')
    if (!fileId) return c.json({ ok: false, error: 'PAID_FILE_NOT_FOUND' }, 404)
    const paidFileService = container.resolve('paidFileService')
    return c.json(await paidFileService.getFileState(user.userId, fileId))
  })

  h.post('/paid-files/:fileId/open', authMiddleware, async (c) => {
    const user = c.get('user')
    const fileId = c.req.param('fileId')
    if (!fileId) return c.json({ ok: false, error: 'PAID_FILE_NOT_FOUND' }, 404)
    const paidFileService = container.resolve('paidFileService')
    return c.json(await paidFileService.openPaidFile(user.userId, fileId), 201)
  })

  h.get('/paid-files/:fileId/view/:grantId', async (c) => {
    const paidFileService = container.resolve('paidFileService')
    const fileId = c.req.param('fileId')
    const grantId = c.req.param('grantId')
    if (!fileId || !grantId) return c.json({ ok: false, error: 'PAID_FILE_GRANT_NOT_FOUND' }, 404)
    const result = await paidFileService.readGrantFile({
      fileId,
      grantId,
      token: c.req.query('token'),
    })
    const contentType = result.file.mime || lookup(result.file.name) || 'application/octet-stream'
    const headers: Record<string, string> = {
      'Cache-Control': 'private, no-store',
      'Content-Disposition': `inline; filename="${encodeURIComponent(result.file.name)}"`,
      'Content-Type': String(contentType),
      'X-Content-Type-Options': 'nosniff',
    }
    if (/html/i.test(String(contentType))) {
      headers['Content-Security-Policy'] = [
        "default-src 'none'",
        "script-src 'unsafe-inline'",
        "style-src 'unsafe-inline'",
        'img-src data: blob:',
        'media-src data: blob:',
        "font-src 'none'",
        "connect-src 'none'",
        "frame-ancestors 'self'",
      ].join('; ')
    }
    return c.body(new Uint8Array(result.buffer), 200, headers)
  })

  return h
}
