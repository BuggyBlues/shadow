import type { Mocked } from 'vitest'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { WalletDao } from '../dao/wallet.dao'
import type { Database } from '../db'
import { wallets } from '../db/schema'
import { WalletService } from './wallet.service'

describe('WalletService', () => {
  const mockWallet = {
    id: 'wallet-1',
    userId: 'user-1',
    balance: 1000,
    frozenAmount: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
  }

  const mockDb = {
    update: vi.fn(),
    insert: vi.fn(),
  } as unknown as Mocked<Database>

  const mockWalletDao: Mocked<WalletDao> = {
    getOrCreate: vi.fn().mockResolvedValue(mockWallet),
    findByUserId: vi.fn().mockResolvedValue(mockWallet),
    getTransactions: vi.fn().mockResolvedValue([]),
    countTransactions: vi.fn().mockResolvedValue(0),
  } as unknown as Mocked<WalletDao>

  let service: WalletService
  const mockUpdateReturn = (value: unknown) => {
    ;(mockDb.update as unknown as ReturnType<typeof vi.fn>).mockReturnValue(value)
  }
  const mockInsertReturn = (value: unknown) => {
    ;(mockDb.insert as unknown as ReturnType<typeof vi.fn>).mockReturnValue(value)
  }

  beforeEach(() => {
    vi.clearAllMocks()
    mockWalletDao.getOrCreate.mockResolvedValue(mockWallet)
    mockWalletDao.findByUserId.mockResolvedValue(mockWallet)

    service = new WalletService({
      walletDao: mockWalletDao,
      db: mockDb,
    })
  })

  describe('topUp', () => {
    it('uses atomic balance increment and records transaction', async () => {
      const chain = {
        set: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        returning: vi.fn().mockResolvedValue([{ balance: 1500 }]),
      }
      mockUpdateReturn(chain)
      mockInsertReturn({ values: vi.fn().mockResolvedValue(undefined) })

      const result = await service.topUp('user-1', 500, 'Test top-up')

      expect(mockDb.update).toHaveBeenCalledWith(wallets)
      expect(chain.set).toHaveBeenCalled()
      expect(chain.returning).toHaveBeenCalled()
      expect(result).toEqual(mockWallet)
    })
  })

  describe('debit', () => {
    it('uses atomic decrement with WHERE guard for insufficient balance', async () => {
      const chain = {
        set: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        returning: vi.fn().mockResolvedValue([{ balance: 500 }]),
      }
      mockUpdateReturn(chain)
      mockInsertReturn({ values: vi.fn().mockResolvedValue(undefined) })

      const result = await service.debit('user-1', 500, 'order-1', 'order', 'Purchase')

      expect(mockDb.update).toHaveBeenCalledWith(wallets)
      expect(chain.where).toHaveBeenCalledWith(expect.stringContaining('balance'))
      expect(result).toBe(500)
    })

    it('throws Insufficient balance when WHERE guard matches no rows', async () => {
      const chain = {
        set: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        returning: vi.fn().mockResolvedValue([]),
      }
      mockUpdateReturn(chain)

      await expect(
        service.debit('user-1', 9999, 'order-1', 'order', 'Purchase'),
      ).rejects.toMatchObject({
        message: 'Insufficient balance',
        status: 402,
        code: 'WALLET_INSUFFICIENT_BALANCE',
        requiredAmount: 9999,
        balance: 1000,
        shortfall: 8999,
        nextAction: 'earn_or_recharge',
      })
    })
  })

  describe('refund', () => {
    it('uses atomic balance increment', async () => {
      const chain = {
        set: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        returning: vi.fn().mockResolvedValue([{ balance: 1200 }]),
      }
      mockUpdateReturn(chain)
      mockInsertReturn({ values: vi.fn().mockResolvedValue(undefined) })

      const result = await service.refund('user-1', 200, 'order-1', 'order', 'Refund')

      expect(mockDb.update).toHaveBeenCalledWith(wallets)
      expect(chain.set).toHaveBeenCalledWith(
        expect.objectContaining({ updatedAt: expect.any(Date) }),
      )
      expect(result).toBe(1200)
    })
  })

  describe('settle', () => {
    it('uses atomic balance increment for seller payout', async () => {
      const chain = {
        set: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        returning: vi.fn().mockResolvedValue([{ balance: 2000 }]),
      }
      mockUpdateReturn(chain)
      mockInsertReturn({ values: vi.fn().mockResolvedValue(undefined) })

      const result = await service.settle('user-1', 1000, 'contract-1', 'rental', 'Settlement')

      expect(mockDb.update).toHaveBeenCalledWith(wallets)
      expect(result).toBe(2000)
    })
  })

  describe('getOrCreateWallet', () => {
    it('delegates to walletDao.getOrCreate', async () => {
      await service.getOrCreateWallet('user-1')
      expect(mockWalletDao.getOrCreate).toHaveBeenCalledWith('user-1')
    })
  })

  describe('getTransactions', () => {
    it('delegates to walletDao with pagination', async () => {
      await service.getTransactions('user-1', 20, 10)
      expect(mockWalletDao.getOrCreate).toHaveBeenCalledWith('user-1')
      expect(mockWalletDao.getTransactions).toHaveBeenCalledWith(mockWallet.id, 20, 10)
    })
  })
})
