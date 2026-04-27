import nodeCrypto from 'node:crypto'
import fsPromises from 'node:fs/promises'
import nodePath from 'node:path'
import { ShadowClient, type ShadowMessage } from '@shadowob/sdk'
import type { ShadowAccountConfig, ShadowRuntimeLogger } from '../types.js'
import { getDataDir } from './paths.js'

export type ShadowInboundMediaContext = {
  cleanBody: string
  fields: Record<string, unknown>
}

function inferMimeType(filename: string, headerType?: string) {
  const ext = filename.split('.').pop()?.toLowerCase() ?? ''
  const map: Record<string, string> = {
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    gif: 'image/gif',
    webp: 'image/webp',
    svg: 'image/svg+xml',
    mp4: 'video/mp4',
    webm: 'video/webm',
    mp3: 'audio/mpeg',
    wav: 'audio/wav',
    ogg: 'audio/ogg',
    pdf: 'application/pdf',
  }
  return map[ext] ?? headerType ?? 'application/octet-stream'
}

export async function resolveShadowInboundMediaContext(params: {
  account: ShadowAccountConfig
  message: ShadowMessage
  rawBody: string
  runtime: ShadowRuntimeLogger
}): Promise<ShadowInboundMediaContext> {
  const { account, message, rawBody, runtime } = params
  const attachmentUrls = (message.attachments ?? []).map((a) => a.url).filter(Boolean)
  const markdownMediaRegex = /!?\[[^\]]*\]\(([^)]+)\)/g
  const markdownUrls: string[] = []
  for (const mdMatch of rawBody.matchAll(markdownMediaRegex)) {
    const url = mdMatch[1]!
    if (url.startsWith('/') && url.includes('/uploads/')) {
      markdownUrls.push(url)
    } else if (url.startsWith('http')) {
      markdownUrls.push(url)
    }
  }

  const allRawUrls = [...new Set([...attachmentUrls, ...markdownUrls])]
  if (allRawUrls.length === 0) {
    return { cleanBody: rawBody, fields: {} }
  }

  const mediaClient = new ShadowClient(account.serverUrl, account.token)
  const dataDir = await getDataDir()
  const mediaDir = nodePath.join(dataDir, 'media', 'inbound')
  await fsPromises.mkdir(mediaDir, { recursive: true })

  const localMediaPaths: string[] = []
  const localMediaTypes: string[] = []
  const resolvedMediaUrls: string[] = []

  for (const rawUrl of allRawUrls) {
    try {
      const downloaded = await mediaClient.downloadFile(rawUrl)
      const uuid = nodeCrypto.randomUUID()
      const ext = nodePath.extname(downloaded.filename) || '.bin'
      const safeBase = downloaded.filename
        .replace(/[^a-zA-Z0-9._\u4e00-\u9fff-]/g, '_')
        .slice(0, 100)
      const localFilename = `${safeBase}---${uuid}${ext.startsWith('.') ? '' : '.'}${ext}`
      const localPath = nodePath.join(mediaDir, localFilename)
      await fsPromises.writeFile(localPath, new Uint8Array(downloaded.buffer))

      localMediaPaths.push(localPath)
      localMediaTypes.push(inferMimeType(downloaded.filename, downloaded.contentType))

      const baseUrl = account.serverUrl.replace(/\/$/, '')
      resolvedMediaUrls.push(rawUrl.startsWith('/') ? `${baseUrl}${rawUrl}` : rawUrl)

      runtime.log?.(
        `[media] Downloaded ${rawUrl} → ${localPath} (${downloaded.buffer.byteLength} bytes)`,
      )
    } catch (err) {
      runtime.error?.(`[media] Failed to download ${rawUrl}: ${String(err)}`)
    }
  }

  if (localMediaPaths.length === 0) {
    return { cleanBody: rawBody, fields: {} }
  }

  const cleanBody =
    rawBody
      .replace(/!?\[[^\]]*\]\([^)]*\/uploads\/[^)]+\)/g, '')
      .replace(/\n{2,}/g, '\n')
      .trim() || '[Media attached]'

  return {
    cleanBody,
    fields: {
      MediaPath: localMediaPaths[0],
      MediaPaths: localMediaPaths,
      MediaUrl: resolvedMediaUrls[0],
      MediaUrls: resolvedMediaUrls,
      MediaType: localMediaTypes[0],
      MediaTypes: localMediaTypes,
    },
  }
}
