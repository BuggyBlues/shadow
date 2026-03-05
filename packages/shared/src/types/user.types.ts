export type UserStatus = 'online' | 'idle' | 'dnd' | 'offline'

export interface User {
  id: string
  email: string
  username: string
  displayName: string
  avatarUrl: string | null
  status: UserStatus
  isBot: boolean
  createdAt: string
  updatedAt: string
}

export interface UserProfile {
  id: string
  username: string
  displayName: string
  avatarUrl: string | null
  status: UserStatus
  isBot: boolean
}

export interface LoginRequest {
  email: string
  password: string
}

export interface RegisterRequest {
  email: string
  username: string
  displayName: string
  password: string
}

export interface AuthResponse {
  user: User
  accessToken: string
  refreshToken: string
}
