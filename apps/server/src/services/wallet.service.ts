import { eq } from 'drizzle-orm'
import type { Database } from '../db'
import { wallets, walletTransactions } from '../db/schema'
import type { WalletDao } from '../dao/wallet.dao'

/**
 * WalletService — manages virtual currency (虾币 / Shrimp Coins).
 * Handles balance queries, top-up, debit/credit, and transaction history.
 * Decoupled from orders — called by OrderService for payment.
 *
 * All balance mutations are wrapped in database transactions to ensure
 * atomicity between the balance update and the transaction record.
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
    const newBalance = wallet.balance + amount

    await this.deps.db.transaction(async (tx) => {
      await tx.update(wallets).set({ balance: newBalance, updatedAt: new Date() }).where(eq(wallets.id, wallet.id))
      await tx.insert(walletTransactions).values({
        walletId: wallet.id,
        type: 'topup',
        amount,
        balanceAfter: newBalance,
        note: note ?? '充值虾币',
      })
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
    if (wallet.balance < amount) {
      throw Object.assign(new Error('Insufficient balance'), { status: 400 })
    }
    const newBalance = wallet.balance - amount

    await this.deps.db.transaction(async (tx) => {
      await tx.update(wallets).set({ balance: newBalance, updatedAt: new Date() }).where(eq(wallets.id, wallet.id))
      await tx.insert(walletTransactions).values({
        walletId: wallet.id,
        type: 'purchase',
        amount: -amount,
        balanceAfter: newBalance,
        referenceId,
        referenceType,
        note,
      })
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
    const newBalance = wallet.balance + amount

    await this.deps.db.transaction(async (tx) => {
      await tx.update(wallets).set({ balance: newBalance, updatedAt: new Date() }).where(eq(wallets.id, wallet.id))
      await tx.insert(walletTransactions).values({
        walletId: wallet.id,
        type: 'refund',
        amount,
        balanceAfter: newBalance,
        referenceId,
        referenceType,
        note,
      })
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
    const newBalance = wallet.balance + amount

    await this.deps.db.transaction(async (tx) => {
      await tx.update(wallets).set({ balance: newBalance, updatedAt: new Date() }).where(eq(wallets.id, wallet.id))
      await tx.insert(walletTransactions).values({
        walletId: wallet.id,
        type: 'settlement',
        amount,
        balanceAfter: newBalance,
        referenceId,
        referenceType,
        note,
      })
    })

    return newBalance
  }
}
