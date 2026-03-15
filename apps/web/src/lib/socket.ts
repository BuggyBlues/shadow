import { io, type Socket } from 'socket.io-client'

let socket: Socket | null = null

export function getSocket(): Socket {
  if (!socket) {
    socket = io(window.location.origin, {
      auth: (cb) => {
        cb({ token: localStorage.getItem('accessToken') })
      },
      transports: ['websocket'],
      autoConnect: false,
    })
  }
  return socket
}

export function connectSocket(): void {
  const s = getSocket()
  if (!s.connected) {
    s.connect()
  }

  // Ensure socket disconnects when page is closed/refreshed
  window.addEventListener('beforeunload', handleBeforeUnload)
  document.addEventListener('visibilitychange', handleVisibilityChange)
}

export function disconnectSocket(): void {
  window.removeEventListener('beforeunload', handleBeforeUnload)
  document.removeEventListener('visibilitychange', handleVisibilityChange)
  if (socket) {
    socket.disconnect()
    socket = null
  }
}

function handleBeforeUnload() {
  if (socket?.connected) {
    // Use sendBeacon as fallback for reliable disconnect signal
    const token = localStorage.getItem('accessToken')
    if (token) {
      navigator.sendBeacon(
        '/api/auth/disconnect',
        new Blob([JSON.stringify({ token })], { type: 'application/json' }),
      )
    }
    socket.disconnect()
  }
}

function handleVisibilityChange() {
  if (!socket) return
  if (document.visibilityState === 'hidden') {
    // Page is hidden — start a grace timer. If the page stays hidden
    // for > 2 minutes, disconnect to save resources.
    ;(handleVisibilityChange as any)._timer = setTimeout(() => {
      if (document.visibilityState === 'hidden' && socket?.connected) {
        socket.disconnect()
      }
    }, 120_000)
  } else {
    // Page became visible — clear timer and reconnect if needed
    clearTimeout((handleVisibilityChange as any)._timer)
    if (!socket.connected) {
      socket.connect()
    }
  }
}

export function joinChannel(channelId: string): void {
  getSocket().emit('channel:join', { channelId })
}

export function leaveChannel(channelId: string): void {
  getSocket().emit('channel:leave', { channelId })
}

export function sendWsMessage(data: {
  channelId: string
  content: string
  threadId?: string
  replyToId?: string
}): void {
  getSocket().emit('message:send', data)
}

export function sendTyping(channelId: string): void {
  getSocket().emit('message:typing', { channelId })
}

export function updatePresence(status: 'online' | 'idle' | 'dnd' | 'offline'): void {
  getSocket().emit('presence:update', { status })
}

export function joinApp(
  appId: string,
  ack?: (res: { ok: boolean; channelId?: string }) => void,
): void {
  getSocket().emit('app:join', { appId }, ack)
}

export function leaveApp(appId: string): void {
  getSocket().emit('app:leave', { appId })
}

export function broadcastAppState(appId: string, type: string, payload: unknown): void {
  getSocket().emit('app:broadcast', { appId, type, payload })
}

// DM helpers
export function joinDm(dmChannelId: string): void {
  getSocket().emit('dm:join', { dmChannelId })
}

export function leaveDm(dmChannelId: string): void {
  getSocket().emit('dm:leave', { dmChannelId })
}

export function sendDmMessage(data: { dmChannelId: string; content: string }): void {
  getSocket().emit('dm:send', data)
}

export function sendDmTyping(dmChannelId: string): void {
  getSocket().emit('dm:typing', { dmChannelId })
}
