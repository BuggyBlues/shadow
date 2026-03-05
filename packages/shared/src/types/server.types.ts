export interface Server {
  id: string
  name: string
  iconUrl: string | null
  ownerId: string
  inviteCode: string
  createdAt: string
  updatedAt: string
}

export interface CreateServerRequest {
  name: string
  iconUrl?: string
}

export interface UpdateServerRequest {
  name?: string
  iconUrl?: string
}

export type MemberRole = 'owner' | 'admin' | 'member'

export interface Member {
  id: string
  userId: string
  serverId: string
  role: MemberRole
  nickname: string | null
  joinedAt: string
  user?: {
    id: string
    username: string
    displayName: string
    avatarUrl: string | null
    status: string
    isBot: boolean
  }
}
