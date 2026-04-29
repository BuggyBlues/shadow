import { ShadowClient } from '@shadowob/sdk'
import type { ChannelMessageActionContext } from 'openclaw/plugin-sdk'
import { DEFAULT_ACCOUNT_ID, getAccountConfig, listAccountIds } from '../config.js'
import { parseTarget } from '../outbound.js'
import {
  firstString,
  readMessageTarget,
  resolveShadowInteractiveBlock,
  validateApprovalMessageContent,
} from './interactive.js'
import { sendShadowMessage } from './send.js'
import { shadowMessageToolSchemaProperties } from './typebox-schema.js'

const SHADOW_DISCOVERED_ACTIONS = [
  'send',
  'send-interactive',
  'upload-file',
  'react',
  'edit',
  'delete',
] as const

const SHADOW_HANDLED_ACTIONS = [...SHADOW_DISCOVERED_ACTIONS, 'get-connection-status'] as const

const SHADOW_ACTION_ALIASES: Record<string, (typeof SHADOW_HANDLED_ACTIONS)[number]> = {
  uploadFile: 'upload-file',
  sendFile: 'upload-file',
  'send-file': 'upload-file',
  sendMedia: 'upload-file',
  'send-media': 'upload-file',
}

type ShadowActionResult = {
  content: Array<{ type: 'text'; text: string }>
  details: Record<string, unknown>
}

function textResult(value: Record<string, unknown>): ShadowActionResult {
  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify(value),
      },
    ],
    details: value,
  }
}

function normalizeShadowAction(action: string): string {
  return SHADOW_ACTION_ALIASES[action] ?? action
}

function readAttachmentSource(params: Record<string, unknown>) {
  return (
    firstString(
      params.media,
      params.mediaUrl,
      params.mediaURL,
      params.url,
      params.path,
      params.filePath,
      params.file,
      params.fileUrl,
      params.fileURL,
    ) ?? ''
  )
}

export const shadowMessageActions = {
  describeMessageTool: () =>
    ({
      actions: [...SHADOW_DISCOVERED_ACTIONS],
      capabilities: ['interactive'],
      schema: {
        visibility: 'current-channel',
        properties: shadowMessageToolSchemaProperties,
      },
      mediaSourceParams: {
        'upload-file': [
          'media',
          'mediaUrl',
          'url',
          'path',
          'filePath',
          'file',
          'fileUrl',
          'buffer',
        ],
      },
    }) as unknown as ReturnType<
      NonNullable<import('openclaw/plugin-sdk').ChannelPlugin['actions']>['describeMessageTool']
    >,

  messageActionTargetAliases: {
    'upload-file': { aliases: ['recipient', 'to', 'channelId'] },
    'send-interactive': { aliases: ['recipient'] },
  } as Record<string, { aliases: string[] }>,

  supportsAction: ({ action }: { action: string }): boolean =>
    (SHADOW_HANDLED_ACTIONS as readonly string[]).includes(normalizeShadowAction(action)),

  handleAction: async (ctx: ChannelMessageActionContext) => {
    const account = getAccountConfig(ctx.cfg, ctx.accountId ?? DEFAULT_ACCOUNT_ID)
    if (!account) {
      return textResult({ ok: false, error: 'Shadow account not configured' })
    }

    const requestedAction = String(ctx.action)
    const action = normalizeShadowAction(requestedAction)
    const { params } = ctx

    if (action === 'send') {
      try {
        const client = new ShadowClient(account.serverUrl, account.token)
        const to = readMessageTarget(params)
        if (!to) return textResult({ ok: false, error: 'target is required' })

        const interactiveBlock = resolveShadowInteractiveBlock(params)
        const content =
          firstString(params.message, params.content, params.text, params.caption, params.prompt) ??
          (interactiveBlock ? '[interactive]' : '')
        if (!content.trim() && !interactiveBlock) {
          return textResult({ ok: false, error: 'message is required' })
        }
        const approvalError = validateApprovalMessageContent(content, interactiveBlock)
        if (approvalError) return textResult({ ok: false, error: approvalError })

        const message = await sendShadowMessage({
          client,
          to,
          content: content.trim() ? content : '[interactive]',
          threadId: params.threadId as string | undefined,
          replyToId:
            (params.replyTo as string | undefined) ?? (params.replyToId as string | undefined),
          metadata: interactiveBlock ? { interactive: interactiveBlock } : undefined,
        })

        return textResult({
          ok: true,
          action: 'send',
          messageId: message.id,
          interactive: !!interactiveBlock,
          kind: interactiveBlock?.kind,
        })
      } catch (err) {
        return textResult({ ok: false, error: err instanceof Error ? err.message : String(err) })
      }
    }

    if (action === 'upload-file') {
      try {
        const client = new ShadowClient(account.serverUrl, account.token)
        const to = readMessageTarget(params)
        if (!to) return textResult({ ok: false, error: 'target is required' })
        const text = firstString(params.message, params.content, params.text, params.caption) ?? ''
        const filename = (params.filename as string) || 'file'
        const contentType =
          (params.contentType as string) ||
          (params.mimeType as string) ||
          'application/octet-stream'
        const base64Buffer = params.buffer as string | undefined
        const mediaUrl = readAttachmentSource(params)

        const { channelId, threadId: parsedThreadId, dmChannelId } = parseTarget(to)
        const threadId = (params.threadId as string) ?? parsedThreadId

        const content = text || '\u200B'
        let message: Awaited<ReturnType<typeof client.sendMessage>> | undefined
        if (dmChannelId) {
          message = await client.sendDmMessage(dmChannelId, content, {
            replyToId: params.replyTo as string | undefined,
          })
        } else if (threadId) {
          message = await client.sendToThread(threadId, content)
        } else if (channelId) {
          message = await client.sendMessage(channelId, content, {
            replyToId: params.replyTo as string | undefined,
          })
        } else {
          return textResult({
            ok: false,
            error: 'Could not resolve target channel, thread, or DM',
          })
        }

        if (base64Buffer) {
          const raw = base64Buffer.includes(',') ? (base64Buffer.split(',')[1] ?? '') : base64Buffer
          if (!raw) throw new Error('Invalid base64 attachment payload')
          const bytes = Buffer.from(raw, 'base64')
          const blob = new Blob([Uint8Array.from(bytes)], { type: contentType })
          await client.uploadMedia(
            blob,
            filename,
            contentType,
            dmChannelId ? { dmMessageId: message.id } : message.id,
          )
        } else if (mediaUrl) {
          await client.uploadMediaFromUrl(
            mediaUrl,
            dmChannelId ? { dmMessageId: message.id } : message.id,
          )
        } else {
          return textResult({
            ok: false,
            error: 'No buffer or media URL provided for attachment',
          })
        }

        return textResult({
          ok: true,
          action: requestedAction,
          canonicalAction: 'upload-file',
          messageId: message.id,
          filename,
        })
      } catch (err) {
        return textResult({ ok: false, error: err instanceof Error ? err.message : String(err) })
      }
    }

    if (action === 'send-interactive') {
      try {
        const client = new ShadowClient(account.serverUrl, account.token)
        const to = readMessageTarget(params)
        const kind = (params.kind as string) ?? 'buttons'
        const prompt = (params.prompt as string) ?? (params.message as string) ?? ''
        if (!to) return textResult({ ok: false, error: 'target is required' })
        if (!['buttons', 'select', 'form', 'approval'].includes(kind)) {
          return textResult({ ok: false, error: `unsupported interactive kind: ${kind}` })
        }
        const block = resolveShadowInteractiveBlock({ ...params, kind, prompt })
        if (!block) return textResult({ ok: false, error: 'interactive block is required' })
        const blockId = String(block.id)
        const content = prompt && prompt.trim() ? prompt : '[interactive]'
        const approvalError = validateApprovalMessageContent(content, block)
        if (approvalError) return textResult({ ok: false, error: approvalError })
        const message = await sendShadowMessage({
          client,
          to,
          content,
          threadId: params.threadId as string | undefined,
          replyToId: params.replyTo as string | undefined,
          metadata: { interactive: block },
        })
        return textResult({
          ok: true,
          action: 'send-interactive',
          messageId: message.id,
          blockId,
          kind,
        })
      } catch (err) {
        return textResult({ ok: false, error: err instanceof Error ? err.message : String(err) })
      }
    }

    if (action === 'react') {
      const client = new ShadowClient(account.serverUrl, account.token)
      const messageId = (params.messageId as string) ?? (params.message_id as string) ?? ''
      const emoji = (params.emoji as string) ?? (params.reaction as string) ?? ''
      if (!messageId || !emoji) {
        return textResult({ ok: false, error: 'messageId and emoji are required' })
      }
      try {
        await client.addReaction(messageId, emoji)
        return textResult({ ok: true, action: 'react', messageId, emoji })
      } catch (err) {
        return textResult({ ok: false, error: String(err) })
      }
    }

    if (action === 'edit') {
      const client = new ShadowClient(account.serverUrl, account.token)
      const messageId = (params.messageId as string) ?? (params.message_id as string) ?? ''
      const content = (params.message as string) ?? (params.content as string) ?? ''
      if (!messageId || !content) {
        return textResult({ ok: false, error: 'messageId and content are required' })
      }
      try {
        await client.editMessage(messageId, content)
        return textResult({ ok: true, action: 'edit', messageId })
      } catch (err) {
        return textResult({ ok: false, error: String(err) })
      }
    }

    if (action === 'delete') {
      const client = new ShadowClient(account.serverUrl, account.token)
      const messageId = (params.messageId as string) ?? (params.message_id as string) ?? ''
      if (!messageId) {
        return textResult({ ok: false, error: 'messageId is required' })
      }
      try {
        await client.deleteMessage(messageId)
        return textResult({ ok: true, action: 'delete', messageId })
      } catch (err) {
        return textResult({ ok: false, error: String(err) })
      }
    }

    if (action === 'pin' || action === 'unpin') {
      return textResult({ ok: false, error: `${action} is not yet supported for Shadow channels` })
    }

    if (action === 'get-connection-status') {
      const accountIds = listAccountIds(ctx.cfg)
      const results = await Promise.all(
        accountIds.map(async (id) => {
          const acc = getAccountConfig(ctx.cfg, id)
          if (!acc) return { accountId: id, configured: false, ok: false, error: 'not configured' }
          if (!acc.token?.trim())
            return { accountId: id, configured: false, ok: false, error: 'no token' }
          try {
            const client = new ShadowClient(acc.serverUrl, acc.token)
            const me = await client.getMe()
            return {
              accountId: id,
              configured: true,
              enabled: acc.enabled !== false,
              ok: true,
              serverUrl: acc.serverUrl,
              user: me,
            }
          } catch (err) {
            return {
              accountId: id,
              configured: true,
              enabled: acc.enabled !== false,
              ok: false,
              serverUrl: acc.serverUrl,
              error: err instanceof Error ? err.message : String(err),
            }
          }
        }),
      )
      return textResult({ ok: true, action: 'get-connection-status', accounts: results })
    }

    return textResult({ ok: false, error: `Action ${action} not yet implemented` })
  },
}
