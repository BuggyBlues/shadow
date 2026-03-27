import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { StatsCards } from '../stats-cards'

// @vitest-environment jsdom

// Mock i18next
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, defaultValue?: string) => {
      // Return default value if provided, otherwise return key
      return defaultValue || key
    },
  }),
}))

describe('StatsCards', () => {
  const mockStats = {
    totalMessages: 1234,
    totalOnlineSeconds: 3665, // 1h 1m 5s
    activeDays30d: 15,
    currentStreak: 5,
    longestStreak: 10,
  }

  it('renders all stat cards', () => {
    render(<StatsCards stats={mockStats} />)

    expect(screen.getByText('Total Messages')).toBeTruthy()
    expect(screen.getByText('Online Time')).toBeTruthy()
    expect(screen.getByText('Active Days (30d)')).toBeTruthy()
    expect(screen.getByText('Current Streak')).toBeTruthy()
  })

  it('displays correct values', () => {
    render(<StatsCards stats={mockStats} />)

    expect(screen.getByText('1,234')).toBeTruthy() // totalMessages
    expect(screen.getByText('1h 1m')).toBeTruthy() // online time
    expect(screen.getByText('15')).toBeTruthy() // active days
    expect(screen.getByText('5 days')).toBeTruthy() // streak
  })

  it('shows best streak when available', () => {
    render(<StatsCards stats={mockStats} />)
    expect(screen.getByText(/Best/)).toBeTruthy()
  })
})
