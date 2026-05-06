import { eq, sql } from 'drizzle-orm'
import { nanoid } from 'nanoid'
import type { Server as SocketIOServer } from 'socket.io'
import type { WorkspaceNodeDao } from '../dao/workspace-node.dao'
import type { Database } from '../db'
import { commerceDeliverables, commerceFulfillmentJobs } from '../db/schema'
import type { DmService } from './dm.service'
import type { MessageService } from './message.service'

function errorCode(err: unknown) {
  if (
    err &&
    typeof err === 'object' &&
    'code' in err &&
    typeof (err as { code?: unknown }).code === 'string'
  ) {
    return (err as { code: string }).code
  }
  return 'COMMERCE_FULFILLMENT_FAILED'
}

function textFromMetadata(metadata: Record<string, unknown> | null, key: string) {
  const value = metadata?.[key]
  return typeof value === 'string' && value.trim() ? value.trim() : undefined
}

export class CommerceFulfillmentService {
  constructor(
    private deps: {
      db: Database
      messageService: MessageService
      dmService: DmService
      workspaceNodeDao: WorkspaceNodeDao
      io?: SocketIOServer
    },
  ) {}

  private get db() {
    return this.deps.db
  }

  private emit(room: string, event: string, payload: unknown) {
    try {
      this.deps.io?.to(room).emit(event, payload)
    } catch {
      /* io is not registered in some focused service tests */
    }
  }

  async processJob(jobId: string) {
    const [job] = await this.db
      .select()
      .from(commerceFulfillmentJobs)
      .where(eq(commerceFulfillmentJobs.id, jobId))
      .limit(1)
    if (!job || (job.status !== 'pending' && job.status !== 'failed')) return job ?? null

    await this.db
      .update(commerceFulfillmentJobs)
      .set({
        status: 'sending',
        attempts: sql`${commerceFulfillmentJobs.attempts} + 1`,
        updatedAt: new Date(),
      })
      .where(eq(commerceFulfillmentJobs.id, job.id))

    try {
      const [deliverable] = job.deliverableId
        ? await this.db
            .select()
            .from(commerceDeliverables)
            .where(eq(commerceDeliverables.id, job.deliverableId))
            .limit(1)
        : []
      if (!deliverable || deliverable.status !== 'active') {
        throw Object.assign(new Error('Deliverable unavailable'), {
          code: 'COMMERCE_DELIVERABLE_UNAVAILABLE',
        })
      }

      const metadata = (deliverable.metadata ?? {}) as Record<string, unknown>
      const senderId = job.senderBuddyUserId ?? deliverable.senderBuddyUserId ?? job.buyerId
      const content = textFromMetadata(metadata, 'message') ?? '\u200B'
      let resultMessageId: string | null = null

      if (deliverable.kind === 'paid_file') {
        const file = await this.deps.workspaceNodeDao.findById(deliverable.resourceId)
        if (!file || file.kind !== 'file') {
          throw Object.assign(new Error('Paid file unavailable'), {
            code: 'PAID_FILE_NOT_FOUND',
          })
        }
        const card = {
          id: nanoid(12),
          kind: 'paid_file' as const,
          fileId: file.id,
          entitlementId: job.entitlementId,
          deliverableId: deliverable.id,
          snapshot: {
            name: file.name,
            mime: file.mime,
            sizeBytes: file.sizeBytes,
            previewUrl: file.previewUrl,
            summary: textFromMetadata(metadata, 'summary') ?? null,
          },
          action: { mode: 'open_paid_file' as const },
        }
        const messageMetadata = {
          paidFileCards: [card],
          commerceFulfillment: { jobId: job.id, deliverableId: deliverable.id },
        }

        if (job.destinationKind === 'channel') {
          const message = await this.deps.messageService.send(job.destinationId, senderId, {
            content,
            metadata: messageMetadata,
          })
          resultMessageId = message.id
          this.emit(`channel:${job.destinationId}`, 'message:new', message)
        } else {
          const message = await this.deps.dmService.sendMessage(
            job.destinationId,
            senderId,
            content,
            undefined,
            undefined,
            messageMetadata,
          )
          resultMessageId = message.id ?? null
          this.emit(`dm:${job.destinationId}`, 'dm:message', message)
        }
      } else {
        if (job.destinationKind === 'channel') {
          const message = await this.deps.messageService.send(job.destinationId, senderId, {
            content,
            metadata: { commerceFulfillment: { jobId: job.id, deliverableId: deliverable.id } },
          })
          resultMessageId = message.id
          this.emit(`channel:${job.destinationId}`, 'message:new', message)
        } else {
          const message = await this.deps.dmService.sendMessage(
            job.destinationId,
            senderId,
            content,
          )
          resultMessageId = message.id ?? null
          this.emit(`dm:${job.destinationId}`, 'dm:message', message)
        }
      }

      const [updated] = await this.db
        .update(commerceFulfillmentJobs)
        .set({
          status: 'sent',
          resultMessageId,
          lastErrorCode: null,
          updatedAt: new Date(),
        })
        .where(eq(commerceFulfillmentJobs.id, job.id))
        .returning()
      return updated ?? null
    } catch (err) {
      const [updated] = await this.db
        .update(commerceFulfillmentJobs)
        .set({
          status: 'failed',
          lastErrorCode: errorCode(err),
          updatedAt: new Date(),
        })
        .where(eq(commerceFulfillmentJobs.id, job.id))
        .returning()
      return updated ?? null
    }
  }

  async processJobs(jobIds: string[]) {
    const results = []
    for (const jobId of jobIds) {
      results.push(await this.processJob(jobId))
    }
    return results.filter(Boolean)
  }
}
