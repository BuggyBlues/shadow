import { and, eq, sql } from 'drizzle-orm'
import type { WalletDao } from '../dao/wallet.dao'
import type { Database } from '../db'
import { wallets, walletTransactions, walletUsageAccruals } from '../db/schema'

const DEFAULT_WALLET_MICROS_PER_COIN = 1_000_000

function walletMicrosPerCoin() {
  const value = Number.parseInt(process.env.SHADOW_WALLET_MICROS_PER_COIN ?? '', 10)
  return Number.isFinite(value) && value > 0 ? value : DEFAULT_WALLET_MICROS_PER_COIN
}

function normalizePositiveInteger(value: number) {
  if (!Number.isFinite(value) || value <= 0) return 0
  return Math.round(value)
}

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
      throw Object.assign(new Error('Insufficient balance'), {
        status: 402,
        code: 'WALLET_INSUFFICIENT_BALANCE',
        requiredAmount: amount,
        balance: wallet.balance,
        shortfall: Math.max(amount - wallet.balance, 0),
        nextAction: 'earn_or_recharge',
      })
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
   * Settle usage measured in micro-Shrimp Coins while keeping wallet balances
   * integer-only. Fractional usage accrues per wallet/source until it reaches
   * one whole Shrimp Coin; any pre-reserved integer coins are refunded or
   * topped up so the net charge matches the accrued whole coins.
   */
  async settleReservedMicros(
    userId: string,
    amountMicros: number,
    reservedAmount: number,
    source: string,
    referenceId: string,
    referenceType: string,
    note: string,
  ) {
    const wallet = await this.deps.walletDao.getOrCreate(userId)
    const micros = normalizePositiveInteger(amountMicros)
    const reserved = normalizePositiveInteger(reservedAmount)
    const microsPerCoin = walletMicrosPerCoin()

    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        return await this.deps.db.transaction(async (tx) => {
          await tx
            .insert(walletUsageAccruals)
            .values({ walletId: wallet.id, source, accruedMicros: 0 })
            .onConflictDoNothing()

          const accrualRows = await tx
            .select()
            .from(walletUsageAccruals)
            .where(
              and(
                eq(walletUsageAccruals.walletId, wallet.id),
                eq(walletUsageAccruals.source, source),
              ),
            )
            .limit(1)
          const accrual = accrualRows[0]
          if (!accrual) {
            throw Object.assign(new Error('Wallet usage accrual unavailable'), {
              code: 'WALLET_ACCRUAL_UNAVAILABLE',
            })
          }

          const totalMicros = accrual.accruedMicros + micros
          const chargedAmount = Math.floor(totalMicros / microsPerCoin)
          const pendingMicros = totalMicros % microsPerCoin
          const delta = chargedAmount - reserved

          const walletRows = await tx
            .select({ balance: wallets.balance })
            .from(wallets)
            .where(eq(wallets.id, wallet.id))
            .limit(1)
          const currentBalance = walletRows[0]?.balance ?? wallet.balance
          let balanceAfter = currentBalance

          if (delta > 0) {
            const updated = await tx
              .update(wallets)
              .set({ balance: sql`${wallets.balance} - ${delta}`, updatedAt: new Date() })
              .where(sql`${wallets.id} = ${wallet.id} AND ${wallets.balance} >= ${delta}`)
              .returning({ balance: wallets.balance })

            if (updated.length === 0) {
              throw Object.assign(new Error('Insufficient balance'), {
                status: 402,
                code: 'WALLET_INSUFFICIENT_BALANCE',
                requiredAmount: delta,
                balance: currentBalance,
                shortfall: Math.max(delta - currentBalance, 0),
                nextAction: 'earn_or_recharge',
              })
            }

            balanceAfter = updated[0]!.balance
            await tx.insert(walletTransactions).values({
              walletId: wallet.id,
              type: 'purchase',
              amount: -delta,
              balanceAfter,
              referenceId,
              referenceType,
              note,
            })
          } else if (delta < 0) {
            const refund = Math.abs(delta)
            const refundRows = await tx
              .update(wallets)
              .set({ balance: sql`${wallets.balance} + ${refund}`, updatedAt: new Date() })
              .where(eq(wallets.id, wallet.id))
              .returning({ balance: wallets.balance })
            balanceAfter = refundRows[0]!.balance
            await tx.insert(walletTransactions).values({
              walletId: wallet.id,
              type: 'refund',
              amount: refund,
              balanceAfter,
              referenceId,
              referenceType,
              note: `${note} adjustment`,
            })
          }

          const accrualUpdated = await tx
            .update(walletUsageAccruals)
            .set({ accruedMicros: pendingMicros, updatedAt: new Date() })
            .where(
              and(
                eq(walletUsageAccruals.id, accrual.id),
                eq(walletUsageAccruals.accruedMicros, accrual.accruedMicros),
              ),
            )
            .returning({ accruedMicros: walletUsageAccruals.accruedMicros })

          if (accrualUpdated.length === 0) {
            throw Object.assign(new Error('Wallet usage accrual changed concurrently'), {
              code: 'WALLET_ACCRUAL_CONFLICT',
            })
          }

          return { chargedAmount, pendingMicros, balanceAfter }
        })
      } catch (err) {
        if ((err as { code?: string }).code === 'WALLET_ACCRUAL_CONFLICT' && attempt < 2) {
          continue
        }
        throw err
      }
    }

    throw Object.assign(new Error('Wallet usage accrual changed concurrently'), {
      code: 'WALLET_ACCRUAL_CONFLICT',
    })
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
