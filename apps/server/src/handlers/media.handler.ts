import { Hono } from 'hono'
import type { AppContainer } from '../container'
import { authMiddleware } from '../middleware/auth.middleware'

export function createMediaHandler(container: AppContainer) {
  const mediaHandler = new Hono()

  mediaHandler.use('*', authMiddleware)

  // POST /api/media/upload
  mediaHandler.post('/upload', async (c) => {
    const mediaService = container.resolve('mediaService')
    const messageDao = container.resolve('messageDao')
    const body = await c.req.parseBody()
    const file = body.file

    if (!file || !(file instanceof File)) {
      return c.json({ error: 'No file provided' }, 400)
    }

    const buffer = Buffer.from(await file.arrayBuffer())
    const result = await mediaService.upload(buffer, file.name, file.type)

    // If messageId is provided, create attachment record
    const messageId = body.messageId
    if (typeof messageId === 'string') {
      await messageDao.createAttachment({
        messageId,
        filename: file.name,
        url: result.url,
        contentType: file.type,
        size: result.size,
      })
    }

    return c.json(result, 201)
  })

  // GET /api/media/:id
  mediaHandler.get('/:id', async (c) => {
    const mediaService = container.resolve('mediaService')
    const id = c.req.param('id')
    try {
      const url = await mediaService.getPresignedUrl(id)
      return c.redirect(url)
    } catch {
      return c.json({ error: 'File not found' }, 404)
    }
  })

  return mediaHandler
}
