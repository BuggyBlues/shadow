import { create } from 'zustand'

interface ChatState {
  activeServerId: string | null
  activeChannelId: string | null
  activeThreadId: string | null
  setActiveServer: (serverId: string | null) => void
  setActiveChannel: (channelId: string | null) => void
  setActiveThread: (threadId: string | null) => void
}

export const useChatStore = create<ChatState>((set, get) => ({
  activeServerId: null,
  activeChannelId: null,
  activeThreadId: null,

  setActiveServer: (serverId) => {
    const current = get()
    if (current.activeServerId === serverId) return
    // Only reset activeChannelId / activeThreadId when explicitly told to (e.g. ServerHomeView).
    // Channel-level route components sync the channel themselves, and clearing it here
    // would race with layout effects that already set the correct channelId from the URL.
    set({ activeServerId: serverId })
  },

  setActiveChannel: (channelId) => set({ activeChannelId: channelId, activeThreadId: null }),

  setActiveThread: (threadId) => set({ activeThreadId: threadId }),
}))
