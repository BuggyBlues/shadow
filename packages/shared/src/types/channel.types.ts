export type ChannelType = 'text' | 'voice' | 'announcement'

export interface Channel {
  id: string
  name: string
  type: ChannelType
  serverId: string
  topic: string | null
  position: number
  createdAt: string
  updatedAt: string
}

export interface CreateChannelRequest {
  name: string
  type?: ChannelType
  topic?: string
}

export interface UpdateChannelRequest {
  name?: string
  topic?: string
  position?: number
}
