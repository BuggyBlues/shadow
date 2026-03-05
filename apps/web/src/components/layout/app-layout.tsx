import { useQuery } from '@tanstack/react-query'
import { Outlet, useNavigate } from '@tanstack/react-router'
import { useEffect } from 'react'
import { fetchApi } from '../../lib/api'
import { connectSocket, disconnectSocket } from '../../lib/socket'
import { useAuthStore } from '../../stores/auth.store'
import { ServerSidebar } from '../server/server-sidebar'

export function AppLayout() {
  const navigate = useNavigate()
  const { setUser, logout } = useAuthStore()

  // Fetch current user on mount
  const { data: me, error: meError } = useQuery({
    queryKey: ['me'],
    queryFn: () =>
      fetchApi<{
        id: string
        email: string
        username: string
        displayName: string | null
        avatarUrl: string | null
        status: string
      }>('/api/auth/me'),
    retry: false,
  })

  useEffect(() => {
    if (me) setUser(me)
  }, [me, setUser])

  // Redirect to login on auth failure
  useEffect(() => {
    if (meError && (meError as any).status === 401) {
      logout()
      navigate({ to: '/login' })
    }
  }, [meError, logout, navigate])

  // WebSocket connection
  useEffect(() => {
    connectSocket()
    return () => disconnectSocket()
  }, [])

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-bg-tertiary">
      <ServerSidebar />
      <Outlet />
    </div>
  )
}
