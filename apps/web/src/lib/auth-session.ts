import { useAuthStore } from '../stores/auth.store'
import { useChatStore } from '../stores/chat.store'
import { queryClient } from './query-client'

export type AuthenticatedUser = {
  id: string
  email: string
  username: string
  displayName: string | null
  avatarUrl: string | null
  status?: string
  membership?: {
    status: string
    tier?: {
      id: string
      level: number
      label: string
      capabilities: string[]
    }
    level?: number
    isMember: boolean
    memberSince?: string | null
    inviteCodeId?: string | null
    capabilities: string[]
  }
}

export type AuthenticatedSession = {
  user: AuthenticatedUser
  accessToken: string
  refreshToken: string
}

export function applyAuthenticatedSession(session: AuthenticatedSession) {
  useAuthStore.getState().setAuth(session.user, session.accessToken, session.refreshToken)
  useChatStore.getState().setActiveServer(null)
  queryClient.removeQueries()
  queryClient.clear()
}
