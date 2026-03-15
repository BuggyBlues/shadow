import * as SecureStore from 'expo-secure-store'

const LAST_CHANNEL_KEY = 'shadow-last-channel'

interface ChannelMap {
  [serverId: string]: string
}

export async function getLastChannel(serverId: string): Promise<string | null> {
  const raw = await SecureStore.getItemAsync(LAST_CHANNEL_KEY)
  if (!raw) return null
  try {
    const map: ChannelMap = JSON.parse(raw)
    return map[serverId] ?? null
  } catch {
    return null
  }
}

export async function setLastChannel(serverId: string, channelId: string): Promise<void> {
  let map: ChannelMap = {}
  const raw = await SecureStore.getItemAsync(LAST_CHANNEL_KEY)
  if (raw) {
    try {
      map = JSON.parse(raw)
    } catch {
      // ignore
    }
  }
  map[serverId] = channelId
  await SecureStore.setItemAsync(LAST_CHANNEL_KEY, JSON.stringify(map))
}
