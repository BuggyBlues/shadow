import { and, eq, sql } from 'drizzle-orm'
import { nanoid } from 'nanoid'
import type { OrderDao } from '../dao/order.dao'
import type { ServerDao } from '../dao/server.dao'
import type { Database } from '../db'
import {
  cartItems,
  orderItems,
  orders,
  products,
  skus,
  wallets,
  walletTransactions,
} from '../db/schema'
import type { CartService } from './cart.service'
import type { EntitlementService } from './entitlement.service'
import type { ProductService } from './product.service'
import type { ShopService } from './shop.service'
import type { WalletService } from './wallet.service'

/** Platform fee rate in basis points (500 = 5%) */
const PLATFORM_FEE_BPS = 500

const ORDER_STATE_TRANSITIONS: Record<
  string,
  Array<'processing' | 'shipped' | 'delivered' | 'completed' | 'cancelled' | 'refunded'>
> = {
  pending: ['cancelled'],
  paid: ['processing', 'cancelled', 'refunded'],
  processing: ['shipped', 'cancelled', 'refunded'],
  shipped: ['delivered', 'refunded'],
  delivered: ['completed', 'refunded'],
  completed: ['refunded'],
  cancelled: [],
  refunded: [],
}

/**
 * OrderService — orchestrates order lifecycle.
 * Coordinates between Product, Wallet, Entitlement, and Cart services.
 */
export class OrderService {
  constructor(
    private deps: {
      orderDao: OrderDao
      db: Database
      serverDao: ServerDao
      productService: ProductService
      walletService: WalletService
      entitlementService: EntitlementService
      cartService: CartService
      shopService: ShopService
    },
  ) {}

  /* ───────── Create Order ───────── */

  async createOrder(
    buyerId: string,
    shopId: string,
    items: Array<{ productId: string; skuId?: string; quantity: number }>,
    buyerNote?: string,
  ) {
    if (items.length === 0) throw Object.assign(new Error('Cart is empty'), { status: 400 })

    // 1. Validate items and calculate total
    let totalAmount = 0
    const orderItemsData: Array<{
      orderId: string
      productId: string
      skuId?: string
      productName: string
      specValues: string[]
      price: number
      quantity: number
      imageUrl?: string
    }> = []

    for (const item of items) {
      const product = await this.deps.productService.getProductById(item.productId)
      if (product.status !== 'active') {
        throw Object.assign(new Error(`Product "${product.name}" is not available`), {
          status: 400,
        })
      }
      if (product.shopId !== shopId) {
        throw Object.assign(new Error(`Product "${product.name}" does not belong to this shop`), {
          status: 400,
        })
      }

      let price = product.basePrice
      let specValues: string[] = []
      let imageUrl: string | undefined

      if (item.skuId) {
        const sku = await this.deps.productService.getSkuById(item.skuId)
        if (!sku || !sku.isActive) {
          throw Object.assign(new Error(`SKU ${item.skuId} is not available`), { status: 400 })
        }
        if (sku.productId !== product.id) {
          throw Object.assign(new Error(`SKU ${item.skuId} does not belong to this product`), {
            status: 400,
          })
        }
        if (sku.stock < item.quantity) {
          throw Object.assign(new Error(`Insufficient stock for "${product.name}"`), {
            status: 400,
          })
        }
        price = sku.price
        specValues = (sku.specValues as string[]) || []
        imageUrl = sku.imageUrl ?? undefined
      }

      if (!imageUrl) {
        imageUrl = (await this.deps.productService.getProductFirstImage(product.id)) ?? undefined
      }

      totalAmount += price * item.quantity
      orderItemsData.push({
        orderId: '', // set after order creation
        productId: product.id,
        skuId: item.skuId,
        productName: product.name,
        specValues,
        price,
        quantity: item.quantity,
        imageUrl,
      })
    }

    // 2. Generate order number
    const orderNo = `SH${Date.now().toString(36).toUpperCase()}${nanoid(6).toUpperCase()}`

    const wallet = await this.deps.walletService.getOrCreateWallet(buyerId)

    const order = await this.deps.db.transaction(async (tx) => {
      for (const item of items) {
        if (!item.skuId) continue
        const stockRows = await tx
          .update(skus)
          .set({ stock: sql`${skus.stock} - ${item.quantity}`, updatedAt: new Date() })
          .where(and(eq(skus.id, item.skuId), sql`${skus.stock} >= ${item.quantity}`))
          .returning({ id: skus.id })
        if (stockRows.length === 0) {
          throw Object.assign(new Error('Insufficient stock'), { status: 400 })
        }
      }

      const debitRows = await tx
        .update(wallets)
        .set({ balance: sql`${wallets.balance} - ${totalAmount}`, updatedAt: new Date() })
        .where(and(eq(wallets.id, wallet.id), sql`${wallets.balance} >= ${totalAmount}`))
        .returning({ balance: wallets.balance })
      if (debitRows.length === 0) {
        throw Object.assign(new Error('Insufficient balance'), {
          status: 402,
          code: 'WALLET_INSUFFICIENT_BALANCE',
          requiredAmount: totalAmount,
          balance: wallet.balance,
          shortfall: Math.max(totalAmount - wallet.balance, 0),
          nextAction: 'earn_or_recharge',
        })
      }

      const [createdOrder] = await tx
        .insert(orders)
        .values({
          orderNo,
          shopId,
          buyerId,
          totalAmount,
          buyerNote,
          status: 'paid',
          paidAt: new Date(),
        })
        .returning()
      if (!createdOrder) throw new Error('Failed to create order')

      const itemsWithOrderId = orderItemsData.map((item) => ({
        ...item,
        orderId: createdOrder.id,
      }))
      await tx.insert(orderItems).values(itemsWithOrderId)

      await tx.insert(walletTransactions).values({
        walletId: wallet.id,
        type: 'purchase',
        amount: -totalAmount,
        balanceAfter: debitRows[0]!.balance,
        referenceId: createdOrder.id,
        referenceType: 'order',
        note: `购买商品 - 订单 ${orderNo}`,
      })

      for (const item of items) {
        await tx
          .update(products)
          .set({ salesCount: sql`${products.salesCount} + ${item.quantity}` })
          .where(eq(products.id, item.productId))
      }

      await tx
        .delete(cartItems)
        .where(and(eq(cartItems.userId, buyerId), eq(cartItems.shopId, shopId)))

      return createdOrder
    })

    // 9. Provision entitlements for entitlement-type products
    for (const item of items) {
      const product = await this.deps.productService.getProductById(item.productId)
      if (product.type === 'entitlement' && product.entitlementConfig) {
        const configs = Array.isArray(product.entitlementConfig)
          ? product.entitlementConfig
          : [product.entitlementConfig]
        const shop = await this.deps.shopService.getShopById(shopId)
        if (shop) {
          for (const config of configs) {
            const expiresAt = config.durationSeconds
              ? new Date(Date.now() + config.durationSeconds * 1000)
              : undefined
            await this.deps.entitlementService.grantEntitlement({
              userId: buyerId,
              serverId: shop.serverId,
              orderId: order.id,
              productId: product.id,
              type: config.type,
              targetId: config.targetId,
              expiresAt,
            })
          }
        }
      }
    }

    return this.getOrderDetail(order.id)
  }

  /* ───────── Query ───────── */

  async getOrderDetail(orderId: string) {
    const order = await this.deps.orderDao.findById(orderId)
    if (!order) throw Object.assign(new Error('Order not found'), { status: 404 })
    const items = await this.deps.orderDao.getItems(orderId)
    return { ...order, items }
  }

  async getMyOrders(userId: string, opts?: { status?: string; limit?: number; offset?: number }) {
    const orderList = await this.deps.orderDao.findByBuyerId(userId, opts)
    return Promise.all(
      orderList.map(async (o) => {
        const items = await this.deps.orderDao.getItems(o.id)
        return { ...o, items }
      }),
    )
  }

  async getShopOrders(shopId: string, opts?: { status?: string; limit?: number; offset?: number }) {
    const orderList = await this.deps.orderDao.findByShopId(shopId, opts)
    return Promise.all(
      orderList.map(async (o) => {
        const items = await this.deps.orderDao.getItems(o.id)
        return { ...o, items }
      }),
    )
  }

  async getShopOrderCount(shopId: string, opts?: { status?: string }) {
    return this.deps.orderDao.countByShopId(shopId, opts)
  }

  /* ───────── Status Transitions ───────── */

  async updateOrderStatus(
    orderId: string,
    status: 'processing' | 'shipped' | 'delivered' | 'completed' | 'cancelled' | 'refunded',
    extra?: { trackingNo?: string; sellerNote?: string },
  ) {
    const currentOrder = await this.deps.orderDao.findById(orderId)
    if (!currentOrder) throw Object.assign(new Error('Order not found'), { status: 404 })

    if (currentOrder.status !== status) {
      const allowed = ORDER_STATE_TRANSITIONS[currentOrder.status] || []
      if (!allowed.includes(status)) {
        throw Object.assign(
          new Error(`Invalid order status transition: ${currentOrder.status} -> ${status}`),
          { status: 400 },
        )
      }
    }

    const timestamps: Record<string, Date> = {}
    if (status === 'shipped') timestamps.shippedAt = new Date()
    if (status === 'completed') timestamps.completedAt = new Date()
    if (status === 'cancelled') timestamps.cancelledAt = new Date()

    const result = await this.deps.orderDao.update(orderId, {
      status,
      ...extra,
      ...timestamps,
    } as Parameters<OrderDao['update']>[1])

    // Settle: credit the shop owner (server owner) on order completion
    if (status === 'completed') {
      try {
        await this.settleOrder(currentOrder)
      } catch {
        // Settlement failure should not block order completion
      }
    }

    return result
  }

  /**
   * Credit the shop owner after order completion, minus platform fee (5%).
   */
  private async settleOrder(order: {
    id: string
    shopId: string
    totalAmount: number
    orderNo: string
  }) {
    const shop = await this.deps.shopService.getShopById(order.shopId)
    if (!shop) return

    const server = await this.deps.serverDao.findById(shop.serverId)
    if (!server) return

    const platformFee = Math.ceil((order.totalAmount * PLATFORM_FEE_BPS) / 10000)
    const sellerPayout = order.totalAmount - platformFee

    if (sellerPayout > 0) {
      await this.deps.walletService.settle(
        server.ownerId,
        sellerPayout,
        order.id,
        'order',
        `订单结算 - ${order.orderNo}（扣除${platformFee}虾币手续费）`,
      )
    }
  }

  async cancelOrder(orderId: string, userId: string) {
    const order = await this.deps.orderDao.findById(orderId)
    if (!order) throw Object.assign(new Error('Order not found'), { status: 404 })
    if (order.buyerId !== userId) throw Object.assign(new Error('Not your order'), { status: 403 })
    if (!['pending', 'paid'].includes(order.status)) {
      throw Object.assign(new Error('Order cannot be cancelled'), { status: 400 })
    }

    // Refund to wallet
    if (order.status === 'paid') {
      await this.deps.walletService.refund(
        userId,
        order.totalAmount,
        orderId,
        'order',
        `退款 - 订单 ${order.orderNo}`,
      )
      // Revoke any entitlements granted by this order
      await this.deps.entitlementService.revokeByOrder(orderId)
    }

    return this.deps.orderDao.update(orderId, { status: 'cancelled', cancelledAt: new Date() })
  }
}
