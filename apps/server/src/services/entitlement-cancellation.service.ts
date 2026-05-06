import type { OrderDao } from '../dao/order.dao'
import { apiError } from '../lib/api-error'
import type { EntitlementService } from './entitlement.service'
import type { LedgerService } from './ledger.service'
import type { NotificationTriggerService } from './notification-trigger.service'
import type { ProductService } from './product.service'

function startOfUtcDay(date: Date) {
  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate())
}

export function refundByNaturalDay(input: {
  paidAmount: number
  startsAt: Date
  expiresAt: Date
  now: Date
}) {
  const start = startOfUtcDay(input.startsAt)
  const end = startOfUtcDay(input.expiresAt)
  const now = startOfUtcDay(input.now)
  const totalDays = Math.max(Math.ceil((end - start) / 86_400_000), 1)
  const remainingDays = Math.max(Math.ceil((end - now) / 86_400_000), 0)
  return Math.floor((input.paidAmount * Math.min(remainingDays, totalDays)) / totalDays)
}

export class EntitlementCancellationService {
  constructor(
    private deps: {
      entitlementService: EntitlementService
      orderDao: OrderDao
      productService: ProductService
      ledgerService: LedgerService
      notificationTriggerService: NotificationTriggerService
    },
  ) {}

  async cancel(input: { actorUserId: string; entitlementId: string; reason?: string }) {
    const entitlement = await this.deps.entitlementService.getEntitlement(input.entitlementId)
    if (entitlement.userId !== input.actorUserId) {
      throw apiError('ENTITLEMENT_OWNER_MISMATCH', 403)
    }
    if (!entitlement.isActive || entitlement.status !== 'active') {
      throw apiError('ENTITLEMENT_NOT_ACTIVE', 400)
    }

    const order = entitlement.orderId
      ? await this.deps.orderDao.findById(entitlement.orderId)
      : null
    const product = entitlement.productId
      ? await this.deps.productService.getProductById(entitlement.productId)
      : null
    const metadata = (entitlement.metadata ?? {}) as Record<string, unknown>
    const paidAmount =
      typeof metadata.refundBaseAmount === 'number'
        ? metadata.refundBaseAmount
        : (order?.totalAmount ?? 0)
    const refundAmount =
      entitlement.expiresAt && paidAmount > 0
        ? refundByNaturalDay({
            paidAmount,
            startsAt: entitlement.startsAt,
            expiresAt: entitlement.expiresAt,
            now: new Date(),
          })
        : 0

    const cancelled = await this.deps.entitlementService.cancelEntitlement(
      entitlement.id,
      input.reason ?? 'user_cancelled',
    )

    if (refundAmount > 0) {
      await this.deps.ledgerService.credit({
        userId: entitlement.userId,
        amount: refundAmount,
        type: 'refund',
        referenceId: entitlement.orderId,
        referenceType: 'order',
        note: `虚拟服务取消退款 - ${product?.name ?? entitlement.id}`,
      })
    }

    await this.deps.notificationTriggerService.triggerCommerceSubscriptionCancelled({
      userId: entitlement.userId,
      entitlementId: entitlement.id,
      refundAmount,
      productName: product?.name,
    })

    return { entitlement: cancelled, refundAmount }
  }
}
