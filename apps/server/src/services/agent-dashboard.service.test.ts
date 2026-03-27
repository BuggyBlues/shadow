import { describe, expect, it, vi } from 'vitest'
import type { AgentDashboardDao } from '../dao/agent-dashboard.dao'
import type { AgentDao } from '../dao/agent.dao'
import type { ClawListingDao } from '../dao/claw-listing.dao'
import type { RentalContractDao } from '../dao/rental-contract.dao'
import type { UserDao } from '../dao/user.dao'
import { AgentDashboardService } from './agent-dashboard.service'

// Mock logger
const mockLogger = {
  info: vi.fn(),
  error: vi.fn(),
  warn: vi.fn(),
  debug: vi.fn(),
} as any

describe('AgentDashboardService', () => {
  // Mock DAOs
  const mockAgentDashboardDao = {
    findDailyStats: vi.fn(),
    findHourlyStats: vi.fn(),
    getTotalMessages: vi.fn(),
    getActiveDaysCount: vi.fn(),
    calculateStreaks: vi.fn(),
    findRecentEvents: vi.fn(),
    incrementMessageCount: vi.fn(),
    incrementHourlyMessage: vi.fn(),
    upsertDailyStats: vi.fn(),
    createEvent: vi.fn(),
    deleteOldEvents: vi.fn(),
  } as unknown as AgentDashboardDao

  const mockAgentDao = {
    findById: vi.fn(),
    findByUserId: vi.fn(),
  } as unknown as AgentDao

  const mockRentalContractDao = {
    findByListingIds: vi.fn(),
  } as unknown as RentalContractDao

  const mockClawListingDao = {
    findByAgentId: vi.fn(),
  } as unknown as ClawListingDao

  const mockUserDao = {
    findById: vi.fn(),
  } as unknown as UserDao

  const service = new AgentDashboardService({
    agentDashboardDao: mockAgentDashboardDao,
    agentDao: mockAgentDao,
    rentalContractDao: mockRentalContractDao,
    clawListingDao: mockClawListingDao,
    userDao: mockUserDao,
    logger: mockLogger,
  })

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('getDashboard', () => {
    it('should return dashboard data for agent owner', async () => {
      const agentId = 'agent-123'
      const userId = 'user-123'

      // Mock agent
      mockAgentDao.findById.mockResolvedValue({
        id: agentId,
        ownerId: userId,
        totalOnlineSeconds: 3600,
      })

      // Mock stats
      mockAgentDashboardDao.findDailyStats.mockResolvedValue([
        { date: '2025-03-26', messageCount: 10 },
        { date: '2025-03-27', messageCount: 5 },
      ])
      mockAgentDashboardDao.findHourlyStats.mockResolvedValue([
        { hourOfDay: 9, messageCount: 5 },
        { hourOfDay: 14, messageCount: 10 },
      ])
      mockAgentDashboardDao.getTotalMessages.mockResolvedValue(100)
      mockAgentDashboardDao.getActiveDaysCount.mockResolvedValue(15)
      mockAgentDashboardDao.calculateStreaks.mockResolvedValue({ current: 5, longest: 10 })
      mockAgentDashboardDao.findRecentEvents.mockResolvedValue([
        {
          id: 'event-1',
          eventType: 'message',
          eventData: { preview: 'Hello' },
          createdAt: new Date(),
        },
      ])

      // Mock rental stats
      mockClawListingDao.findByAgentId.mockResolvedValue([])

      const result = await service.getDashboard(agentId, userId)

      expect(result).toBeDefined()
      expect(result.stats.totalMessages).toBe(100)
      expect(result.stats.totalOnlineSeconds).toBe(3600)
      expect(result.stats.activeDays30d).toBe(15)
      expect(result.stats.currentStreak).toBe(5)
      expect(result.stats.longestStreak).toBe(10)
      expect(result.activityHeatmap).toHaveLength(365)
      expect(result.weeklyActivity).toHaveLength(7)
      expect(result.hourlyDistribution).toHaveLength(24)
      expect(result.monthlyTrend).toHaveLength(12)
      expect(result.recentEvents).toHaveLength(1)
    })

    it('should throw 404 if agent not found', async () => {
      mockAgentDao.findById.mockResolvedValue(null)

      await expect(service.getDashboard('agent-123', 'user-123')).rejects.toMatchObject({
        status: 404,
        message: 'Agent not found',
      })
    })

    it('should throw 403 if user is not owner or tenant', async () => {
      mockAgentDao.findById.mockResolvedValue({
        id: 'agent-123',
        ownerId: 'owner-123',
      })

      await expect(service.getDashboard('agent-123', 'other-user')).rejects.toMatchObject({
        status: 403,
        message: 'Forbidden',
      })
    })
  })

  describe('recordMessage', () => {
    it('should record message count and hourly stats', async () => {
      const agentId = 'agent-123'

      await service.recordMessage(agentId)

      expect(mockAgentDashboardDao.incrementMessageCount).toHaveBeenCalled()
      expect(mockAgentDashboardDao.incrementHourlyMessage).toHaveBeenCalled()
    })
  })

  describe('recordOnlineTime', () => {
    it('should record online time for today', async () => {
      const agentId = 'agent-123'
      const seconds = 300

      await service.recordOnlineTime(agentId, seconds)

      expect(mockAgentDashboardDao.upsertDailyStats).toHaveBeenCalledWith(
        agentId,
        expect.any(String),
        { onlineSeconds: seconds }
      )
    })
  })

  describe('addEvent', () => {
    it('should create activity event', async () => {
      const agentId = 'agent-123'
      const eventType = 'status_change'
      const eventData = { status: 'online' }

      await service.addEvent(agentId, eventType, eventData)

      expect(mockAgentDashboardDao.createEvent).toHaveBeenCalledWith(agentId, eventType, eventData)
    })
  })

  describe('cleanupOldEvents', () => {
    it('should delete events older than 90 days', async () => {
      await service.cleanupOldEvents()

      expect(mockAgentDashboardDao.deleteOldEvents).toHaveBeenCalled()
      expect(mockLogger.info).toHaveBeenCalled()
    })
  })
})
