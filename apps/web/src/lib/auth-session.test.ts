import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useAuthStore } from '../stores/auth.store'
import { clearAuthenticatedSession, ensureAuthenticatedSession } from './auth-session'
import { disconnectSocket } from './socket'

vi.mock('./socket', () => ({
  disconnectSocket: vi.fn(),
}))

const user = {
  id: 'user-1',
  email: 'admin@shadowob.app',
  username: 'admin',
  displayName: 'Admin',
  avatarUrl: null,
}

function jsonResponse(body: unknown, init?: ResponseInit) {
  return new Response(JSON.stringify(body), {
    headers: { 'Content-Type': 'application/json' },
    ...init,
  })
}

describe('auth session', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.restoreAllMocks()
    vi.mocked(disconnectSocket).mockClear()
    useAuthStore.setState({ user: null, accessToken: null, isAuthenticated: false })
  })

  it('clears the in-memory auth state when the stored token cannot be refreshed', async () => {
    localStorage.setItem('accessToken', 'expired-access')
    useAuthStore.setState({
      user,
      accessToken: 'expired-access',
      isAuthenticated: true,
    })
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse({ ok: false }, { status: 401 })))

    await expect(ensureAuthenticatedSession()).resolves.toBeNull()

    expect(localStorage.getItem('accessToken')).toBeNull()
    expect(useAuthStore.getState().isAuthenticated).toBe(false)
    expect(useAuthStore.getState().user).toBeNull()
    expect(disconnectSocket).toHaveBeenCalled()
  })

  it('refreshes an expired access token before marking the user authenticated', async () => {
    localStorage.setItem('accessToken', 'expired-access')
    localStorage.setItem('refreshToken', 'valid-refresh')
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({ ok: false }, { status: 401 }))
      .mockResolvedValueOnce(
        jsonResponse({ accessToken: 'new-access', refreshToken: 'new-refresh' }),
      )
      .mockResolvedValueOnce(jsonResponse(user))
    vi.stubGlobal('fetch', fetchMock)

    await expect(ensureAuthenticatedSession()).resolves.toEqual(user)

    expect(localStorage.getItem('accessToken')).toBe('new-access')
    expect(localStorage.getItem('refreshToken')).toBe('new-refresh')
    expect(useAuthStore.getState()).toMatchObject({
      user,
      accessToken: 'new-access',
      isAuthenticated: true,
    })
  })

  it('clears all auth state on explicit session clear', () => {
    localStorage.setItem('accessToken', 'access')
    localStorage.setItem('refreshToken', 'refresh')
    useAuthStore.setState({ user, accessToken: 'access', isAuthenticated: true })

    clearAuthenticatedSession()

    expect(localStorage.getItem('accessToken')).toBeNull()
    expect(localStorage.getItem('refreshToken')).toBeNull()
    expect(useAuthStore.getState().isAuthenticated).toBe(false)
    expect(disconnectSocket).toHaveBeenCalled()
  })
})
