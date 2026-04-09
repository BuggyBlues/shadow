import { create } from 'zustand'
import { getSocket } from '@/lib/socket'

interface VoiceChannelMember {
  userId: string
  username: string
  displayName: string
  muted: boolean
  screenSharing: boolean
  joinedAt: string
}

interface VoiceChannelState {
  activeChannelId: string | null
  activeChannelName: string | null
  members: VoiceChannelMember[]
  isMuted: boolean
  isScreenSharing: boolean
  error: string | null
  agoraUid: number
  joinChannel: (channelId: string, channelName: string, agoraUid?: number) => void
  leaveChannel: () => void
  setMuted: (muted: boolean) => void
  setScreenSharing: (sharing: boolean) => void
  setError: (error: string | null) => void
  updateMembers: (members: VoiceChannelMember[]) => void
}

export const useVoiceStore = create<VoiceChannelState>((set, get) => ({
  activeChannelId: null,
  activeChannelName: null,
  members: [],
  isMuted: false,
  isScreenSharing: false,
  error: null,
  agoraUid: 0,

  joinChannel: (channelId: string, channelName: string, agoraUid = 0) => {
    const socket = getSocket()
    socket.emit(
      'voice:join',
      { channelId, agoraUid },
      (res: { ok: boolean; state?: { members: VoiceChannelMember[] }; error?: string }) => {
        if (res.ok && res.state) {
          set({
            activeChannelId: channelId,
            activeChannelName: channelName,
            members: res.state.members,
            agoraUid,
            error: null,
          })
        } else {
          set({ error: res.error ?? 'Failed to join voice channel' })
        }
      },
    )
  },

  leaveChannel: () => {
    const { activeChannelId } = get()
    if (activeChannelId) {
      const socket = getSocket()
      socket.emit('voice:leave', { channelId: activeChannelId })
    }
    set({
      activeChannelId: null,
      activeChannelName: null,
      members: [],
      isMuted: false,
      isScreenSharing: false,
      error: null,
      agoraUid: 0,
    })
  },

  setMuted: (muted: boolean) => {
    const { activeChannelId } = get()
    if (activeChannelId) {
      const socket = getSocket()
      socket.emit('voice:mute', { channelId: activeChannelId, muted })
    }
    set({ isMuted: muted })
  },

  setScreenSharing: (sharing: boolean) => {
    const { activeChannelId } = get()
    if (activeChannelId) {
      const socket = getSocket()
      socket.emit(sharing ? 'voice:screenshare:start' : 'voice:screenshare:stop', {
        channelId: activeChannelId,
      })
    }
    set({ isScreenSharing: sharing })
  },

  setError: (error: string | null) => set({ error }),

  updateMembers: (members: VoiceChannelMember[]) => set({ members }),
}))
