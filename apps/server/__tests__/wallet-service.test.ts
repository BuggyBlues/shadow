import { describe, expect, it, vi } from 'vitest'
import { WalletService } from '../src/services/wallet.service'

describe('WalletService consumer transaction display', () => {
  const wallet = {
    id: 'wallet-1',
    userId: 'user-1',
    balance: 100,
    frozenAmount: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
  }

  it('passes consumer filters to the DAO and enriches order transactions', async () => {
    const walletDao = {
      getOrCreate: vi.fn(async () => wallet),
      getTransactions: vi.fn(async () => [
        {
          id: 'tx-1',
          walletId: 'wallet-1',
          type: 'settlement',
          amount: 8,
          balanceAfter: 108,
          currency: 'shrimp_coin',
          referenceId: '11111111-1111-4111-8111-111111111111',
          referenceType: 'order',
          note: 'settlement',
          createdAt: new Date(),
        },
      ]),
      getOrderSummaries: vi.fn(async () => [
        {
          id: '11111111-1111-4111-8111-111111111111',
          orderNo: 'SH123',
          status: 'completed',
          totalAmount: 8,
          currency: 'shrimp_coin',
          shopId: 'shop-1',
          shopName: 'Match Shop',
          buyerId: 'buyer-1',
          buyerUsername: 'buyer',
          buyerDisplayName: 'Buyer',
          buyerAvatarUrl: null,
          productName: 'A glowing match box',
        },
      ]),
    }
    const service = new WalletService({
      walletDao: walletDao as any,
      ledgerService: {} as any,
    })

    const transactions = await service.getTransactions('user-1', 20, 0, {
      audience: 'consumer',
      direction: 'income',
    })

    expect(walletDao.getTransactions).toHaveBeenCalledWith('wallet-1', 20, 0, {
      audience: 'consumer',
      direction: 'income',
    })
    expect(walletDao.getOrderSummaries).toHaveBeenCalledWith([
      '11111111-1111-4111-8111-111111111111',
    ])
    expect(transactions[0]).toMatchObject({
      display: { title: 'A glowing match box', subtitle: 'Match Shop' },
      order: { orderNo: 'SH123', productName: 'A glowing match box' },
      counterparty: { userId: 'buyer-1', displayName: 'Buyer' },
    })
  })

  it('uses the same consumer filters for counts', async () => {
    const walletDao = {
      getOrCreate: vi.fn(async () => wallet),
      countTransactions: vi.fn(async () => 3),
    }
    const service = new WalletService({
      walletDao: walletDao as any,
      ledgerService: {} as any,
    })

    await expect(
      service.getTransactionCount('user-1', { audience: 'consumer', direction: 'expense' }),
    ).resolves.toBe(3)
    expect(walletDao.countTransactions).toHaveBeenCalledWith('wallet-1', {
      audience: 'consumer',
      direction: 'expense',
    })
  })
})
