import { and, desc, eq, inArray, sql } from 'drizzle-orm'
import type { Database } from '../db'
import { orderItems, orders, shops, users, wallets, walletTransactions } from '../db/schema'

export type WalletTransactionAudience = 'ledger' | 'consumer'
export type WalletTransactionDirection = 'all' | 'income' | 'expense'

function walletTransactionWhere(input: {
  walletId: string
  audience: WalletTransactionAudience
  direction: WalletTransactionDirection
}) {
  const filters = [eq(walletTransactions.walletId, input.walletId)]
  if (input.audience === 'consumer') {
    filters.push(
      sql`(${walletTransactions.referenceType} is null or ${walletTransactions.referenceType} <> 'model_proxy')`,
    )
  }
  if (input.direction === 'income') {
    filters.push(sql`${walletTransactions.amount} > 0`)
  } else if (input.direction === 'expense') {
    filters.push(sql`${walletTransactions.amount} < 0`)
  }
  return and(...filters)
}

export class WalletDao {
  constructor(private deps: { db: Database }) {}
  private get db() {
    return this.deps.db
  }

  async findByUserId(userId: string) {
    const r = await this.db.select().from(wallets).where(eq(wallets.userId, userId)).limit(1)
    return r[0] ?? null
  }

  async getOrCreate(userId: string) {
    let wallet = await this.findByUserId(userId)
    if (!wallet) {
      const r = await this.db.insert(wallets).values({ userId }).returning()
      wallet = r[0] ?? null
    }
    return wallet!
  }

  async updateBalance(id: string, balance: number) {
    const r = await this.db
      .update(wallets)
      .set({ balance, updatedAt: new Date() })
      .where(eq(wallets.id, id))
      .returning()
    return r[0] ?? null
  }

  async debit(id: string, amount: number) {
    const r = await this.db
      .update(wallets)
      .set({ balance: sql`${wallets.balance} - ${amount}`, updatedAt: new Date() })
      .where(and(eq(wallets.id, id), sql`${wallets.balance} >= ${amount}`))
      .returning()
    return r[0] ?? null
  }

  async credit(id: string, amount: number) {
    const r = await this.db
      .update(wallets)
      .set({ balance: sql`${wallets.balance} + ${amount}`, updatedAt: new Date() })
      .where(eq(wallets.id, id))
      .returning()
    return r[0] ?? null
  }

  async addTransaction(data: {
    walletId: string
    type: 'topup' | 'purchase' | 'refund' | 'reward' | 'transfer' | 'adjustment' | 'settlement'
    amount: number
    balanceAfter: number
    referenceId?: string
    referenceType?: string
    note?: string
  }) {
    const r = await this.db.insert(walletTransactions).values(data).returning()
    return r[0] ?? null
  }

  async getTransactions(
    walletId: string,
    limit = 50,
    offset = 0,
    opts?: {
      audience?: WalletTransactionAudience
      direction?: WalletTransactionDirection
    },
  ) {
    const audience = opts?.audience ?? 'ledger'
    const direction = opts?.direction ?? 'all'
    return this.db
      .select()
      .from(walletTransactions)
      .where(walletTransactionWhere({ walletId, audience, direction }))
      .orderBy(desc(walletTransactions.createdAt))
      .limit(limit)
      .offset(offset)
  }

  async countTransactions(
    walletId: string,
    opts?: {
      audience?: WalletTransactionAudience
      direction?: WalletTransactionDirection
    },
  ) {
    const audience = opts?.audience ?? 'ledger'
    const direction = opts?.direction ?? 'all'
    const r = await this.db
      .select({ count: sql<number>`count(*)::int` })
      .from(walletTransactions)
      .where(walletTransactionWhere({ walletId, audience, direction }))
    return r[0]?.count ?? 0
  }

  async getOrderSummaries(orderIds: string[]) {
    if (orderIds.length === 0) return []
    return this.db
      .select({
        id: orders.id,
        orderNo: orders.orderNo,
        status: orders.status,
        totalAmount: orders.totalAmount,
        currency: orders.currency,
        shopId: shops.id,
        shopName: shops.name,
        buyerId: users.id,
        buyerUsername: users.username,
        buyerDisplayName: users.displayName,
        buyerAvatarUrl: users.avatarUrl,
        productName: orderItems.productName,
      })
      .from(orders)
      .leftJoin(orderItems, eq(orderItems.orderId, orders.id))
      .leftJoin(shops, eq(shops.id, orders.shopId))
      .leftJoin(users, eq(users.id, orders.buyerId))
      .where(inArray(orders.id, orderIds))
  }
}
