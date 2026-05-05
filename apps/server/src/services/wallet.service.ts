import type { WalletDao } from '../dao/wallet.dao'
import type { LedgerService } from './ledger.service'

/**
 * WalletService — read/query facade for virtual currency.
 *
 * Balance mutations must go through LedgerService. These methods are kept as
 * compatibility wrappers for existing call sites while centralizing the actual
 * wallet update + transaction writes in one service.
 */
export class WalletService {
  constructor(
    private deps: {
      walletDao: WalletDao
      ledgerService: LedgerService
    },
  ) {}

  async getOrCreateWallet(userId: string) {
    return this.deps.walletDao.getOrCreate(userId)
  }

  async getWallet(userId: string) {
    return this.deps.walletDao.getOrCreate(userId)
  }

  async topUp(userId: string, amount: number, note?: string) {
    await this.deps.ledgerService.credit({
      userId,
      amount,
      type: 'topup',
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

  async debit(
    userId: string,
    amount: number,
    referenceId: string,
    referenceType: string,
    note: string,
  ) {
    return this.deps.ledgerService.debit({
      userId,
      amount,
      type: 'purchase',
      referenceId,
      referenceType,
      note,
    })
  }

  async refund(
    userId: string,
    amount: number,
    referenceId: string,
    referenceType: string,
    note: string,
  ) {
    return this.deps.ledgerService.credit({
      userId,
      amount,
      type: 'refund',
      referenceId,
      referenceType,
      note,
    })
  }

  async settleReservedMicros(
    userId: string,
    amountMicros: number,
    reservedAmount: number,
    source: string,
    referenceId: string,
    referenceType: string,
    note: string,
  ) {
    return this.deps.ledgerService.settleReservedMicros(
      userId,
      amountMicros,
      reservedAmount,
      source,
      referenceId,
      referenceType,
      note,
    )
  }

  async settle(
    userId: string,
    amount: number,
    referenceId: string,
    referenceType: string,
    note: string,
  ) {
    return this.deps.ledgerService.credit({
      userId,
      amount,
      type: 'settlement',
      referenceId,
      referenceType,
      note,
    })
  }
}
