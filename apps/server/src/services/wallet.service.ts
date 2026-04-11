import { eq, sql } from 'drizzle-orm'
import type { WalletDao } from '../dao/wallet.dao'
import type { Database } from '../db'
import { wallets, walletTransactions } from '../db/schema'

/**
 * WalletService — manages virtual currency (虾币 / Shrimp Coins).
 * Handles balance queries, top-up, debit/credit, and transaction history.
 * Decoupled from orders — called by OrderService for payment.
 *
 * All balance mutations use atomic SQL operations (`balance = balance +/- n`)
 * to prevent lost-update race conditions under concurrent requests.
 * The debit operation uses a WHERE guard for insufficient-funds checks
 * instead of a separate SELECT + compare.
 */
export class WalletService {
  constructor(
    private deps: {
      walletDao: WalletDao
      db: Database
    },
  ) {}

  async getOrCreateWallet(userId: string) {
    return this.deps.walletDao.getOrCreate(userId)
  }

  async getWallet(userId: string) {
    return this.deps.walletDao.getOrCreate(userId)
  }

  async topUp(userId: string, amount: number, note?: string) {
    const wallet = await this.deps.walletDao.getOrCreate(userId)

    const rows = await this.deps.db
      .update(wallets)
      .set({ balance: sql`${wallets.balance} + ${amount}`, updatedAt: new Date() })
      .where(eq(wallets.id, wallet.id))
      .returning({ balance: wallets.balance })
    const newBalance = rows[0]!.balance

    await this.deps.db.insert(walletTransactions).values({
      walletId: wallet.id,
      type: 'topup',
      amount,
      balanceAfter: newBalance,
      note: note ?? '充值虾币',
    })

    return this.deps.walletDao.findByUserId(userId)
  }

  async getTransactions(userId: string, limit = 50, offset = 0) {
    const wallet = await this.deps.walletDao.getOrCreate(userId)
    return this.deps.walletDao.getTransactions(wallet.id, limit, offset)
  }

  async getTransactionCount(userId: string) {
    const wallet = await this.deps.walletDao.getOrCreate(userId)
    return this.deps.walletDao.countTransactions(wallet.id)
  }

  /**
   * Debit user's wallet for a purchase.
   * Uses atomic `UPDATE ... WHERE balance >= amount` to prevent
   * concurrent overdraw — no separate SELECT + compare needed.
   * Returns the new balance or throws if insufficient funds.
   */
  async debit(
    userId: string,
    amount: number,
    referenceId: string,
    referenceType: string,
    note: string,
  ) {
    const wallet = await this.deps.walletDao.getOrCreate(userId)

    const updated = await this.deps.db
      .update(wallets)
      .set({ balance: sql`${wallets.balance} - ${amount}`, updatedAt: new Date() })
      .where(sql`${wallets.id} = ${wallet.id} AND ${wallets.balance} >= ${amount}`)
      .returning({ balance: wallets.balance })

    if (updated.length === 0) {
      throw Object.assign(new Error('Insufficient balance'), { status: 400 })
    }

    const newBalance = updated[0]!.balance

    await this.deps.db.insert(walletTransactions).values({
      walletId: wallet.id,
      type: 'purchase',
      amount: -amount,
      balanceAfter: newBalance,
      referenceId,
      referenceType,
      note,
    })

    return newBalance
  }

  /**
   * Refund to user's wallet.
   */
  async refund(
    userId: string,
    amount: number,
    referenceId: string,
    referenceType: string,
    note: string,
  ) {
    const wallet = await this.deps.walletDao.getOrCreate(userId)

    const refundRows = await this.deps.db
      .update(wallets)
      .set({ balance: sql`${wallets.balance} + ${amount}`, updatedAt: new Date() })
      .where(eq(wallets.id, wallet.id))
      .returning({ balance: wallets.balance })
    const newBalance = refundRows[0]!.balance

    await this.deps.db.insert(walletTransactions).values({
      walletId: wallet.id,
      type: 'refund',
      amount,
      balanceAfter: newBalance,
      referenceId,
      referenceType,
      note,
    })

    return newBalance
  }

  /**
   * Settle (payout) to seller/owner wallet after order completion or rental usage.
   */
  async settle(
    userId: string,
    amount: number,
    referenceId: string,
    referenceType: string,
    note: string,
  ) {
    const wallet = await this.deps.walletDao.getOrCreate(userId)

    const settleRows = await this.deps.db
      .update(wallets)
      .set({ balance: sql`${wallets.balance} + ${amount}`, updatedAt: new Date() })
      .where(eq(wallets.id, wallet.id))
      .returning({ balance: wallets.balance })
    const newBalance = settleRows[0]!.balance

    await this.deps.db.insert(walletTransactions).values({
      walletId: wallet.id,
      type: 'settlement',
      amount,
      balanceAfter: newBalance,
      referenceId,
      referenceType,
      note,
    })

    return newBalance
  }
}
