import type { Mocked } from 'vitest'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { WalletDao } from '../src/dao/wallet.dao'
import type { Database } from '../src/db'
import { wallets, walletTransactions, walletUsageAccruals } from '../src/db/schema'
import { LedgerService } from '../src/services/ledger.service'
import { WalletService } from '../src/services/wallet.service'

describe('WalletService micro-Shrimp settlement', () => {
  const mockWallet = {
    id: 'wallet-1',
    userId: 'user-1',
    balance: 1000,
    frozenAmount: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
  }

  const mockWalletDao: Mocked<WalletDao> = {
    getOrCreate: vi.fn().mockResolvedValue(mockWallet),
    findByUserId: vi.fn().mockResolvedValue(mockWallet),
    getTransactions: vi.fn().mockResolvedValue([]),
    countTransactions: vi.fn().mockResolvedValue(0),
  } as unknown as Mocked<WalletDao>

  let mockDb: Mocked<Database>
  let service: WalletService

  beforeEach(() => {
    vi.clearAllMocks()
    mockWalletDao.getOrCreate.mockResolvedValue(mockWallet)
    mockDb = {} as Mocked<Database>
    const ledgerService = new LedgerService({
      walletDao: mockWalletDao,
      db: mockDb,
    })
    service = new WalletService({
      walletDao: mockWalletDao,
      ledgerService,
    })
  })

  function mockUsageAccrualTransaction(options: {
    initialAccruedMicros: number
    initialBalance: number
  }) {
    const insertedTransactions: unknown[] = []
    const accrual = {
      id: 'accrual-1',
      walletId: mockWallet.id,
      source: 'model_proxy',
      accruedMicros: options.initialAccruedMicros,
    }
    let balance = options.initialBalance

    const tx = {
      insert: vi.fn((table: unknown) => ({
        values: vi.fn((values: unknown) => {
          if (table === walletUsageAccruals) {
            return { onConflictDoNothing: vi.fn().mockResolvedValue(undefined) }
          }
          if (table === walletTransactions) {
            insertedTransactions.push(values)
          }
          return Promise.resolve(undefined)
        }),
      })),
      select: vi.fn(() => ({
        from: vi.fn((table: unknown) => ({
          where: vi.fn(() => ({
            limit: vi
              .fn()
              .mockResolvedValue(table === walletUsageAccruals ? [accrual] : [{ balance }]),
          })),
        })),
      })),
      update: vi.fn((table: unknown) => ({
        set: vi.fn((patch: Record<string, unknown>) => ({
          where: vi.fn(() => ({
            returning: vi.fn().mockImplementation(() => {
              if (table === wallets) {
                balance += 1
                return Promise.resolve([{ balance }])
              }
              accrual.accruedMicros = Number(patch.accruedMicros)
              return Promise.resolve([{ accruedMicros: accrual.accruedMicros }])
            }),
          })),
        })),
      })),
    }

    ;(mockDb as unknown as { transaction: ReturnType<typeof vi.fn> }).transaction = vi.fn(
      async (callback: (transaction: typeof tx) => Promise<unknown>) => callback(tx),
    )

    return { insertedTransactions, accrual }
  }

  it('refunds an over-reserve and keeps fractional usage pending', async () => {
    const { insertedTransactions, accrual } = mockUsageAccrualTransaction({
      initialAccruedMicros: 800_000,
      initialBalance: 999,
    })

    const result = await service.settleReservedMicros(
      'user-1',
      100_000,
      1,
      'model_proxy',
      'request-1',
      'model_proxy',
      'Model usage',
    )

    expect(result).toEqual({
      chargedAmount: 0,
      pendingMicros: 900_000,
      balanceAfter: 1000,
    })
    expect(accrual.accruedMicros).toBe(900_000)
    expect(insertedTransactions).toEqual([
      expect.objectContaining({
        type: 'refund',
        amount: 1,
        balanceAfter: 1000,
        referenceId: 'request-1',
        referenceType: 'model_proxy',
      }),
    ])
  })

  it('rolls pending micro-usage into a whole-coin charge', async () => {
    const { insertedTransactions, accrual } = mockUsageAccrualTransaction({
      initialAccruedMicros: 800_000,
      initialBalance: 999,
    })

    const result = await service.settleReservedMicros(
      'user-1',
      200_000,
      1,
      'model_proxy',
      'request-2',
      'model_proxy',
      'Model usage',
    )

    expect(result).toEqual({
      chargedAmount: 1,
      pendingMicros: 0,
      balanceAfter: 999,
    })
    expect(accrual.accruedMicros).toBe(0)
    expect(insertedTransactions).toEqual([])
  })
})
