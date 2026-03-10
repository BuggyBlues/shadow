/** @vitest-environment jsdom */

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render } from '@testing-library/react'
import type React from 'react'
import { vi } from 'vitest'

export const fetchApiMock = vi.fn()
export const showToastMock = vi.fn()

vi.mock('../../../src/lib/api', () => ({
  fetchApi: (path: string, options?: RequestInit) => fetchApiMock(path, options),
}))

vi.mock('../../../src/lib/toast', () => ({
  showToast: (message: string, type?: 'error' | 'success' | 'info') => showToastMock(message, type),
}))

export function renderWithQuery(ui: React.ReactNode) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  })

  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>)
}

export const serverId = '550e8400-e29b-41d4-a716-446655440000'

export function resetMocks() {
  fetchApiMock.mockReset()
  showToastMock.mockReset()
}
