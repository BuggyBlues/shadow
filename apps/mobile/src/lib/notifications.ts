import * as Notifications from 'expo-notifications'
import { router } from 'expo-router'
import { Platform } from 'react-native'
import { fetchApi } from './api'

/**
 * Configure notification handling behavior.
 * Must be called early (outside of component tree).
 */
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
})

/**
 * Request notification permissions.
 * Returns true if granted.
 */
export async function requestNotificationPermissions(): Promise<boolean> {
  const { status: existing } = await Notifications.getPermissionsAsync()
  if (existing === 'granted') return true

  const { status } = await Notifications.requestPermissionsAsync()
  return status === 'granted'
}

export async function registerRemotePushToken(): Promise<void> {
  const granted = await requestNotificationPermissions()
  if (!granted) return
  const token = await Notifications.getExpoPushTokenAsync()
  await fetchApi('/api/notifications/push-tokens', {
    method: 'POST',
    body: JSON.stringify({
      platform: Platform.OS,
      token: token.data,
      deviceName: Platform.OS,
    }),
  })
}

/**
 * Schedule a local notification for an incoming message.
 */
export async function showMessageNotification(params: {
  channelId: string
  serverSlug?: string
  channelName?: string
  senderName: string
  content: string
}): Promise<void> {
  await Notifications.scheduleNotificationAsync({
    content: {
      title: params.channelName ? `#${params.channelName}` : params.senderName,
      body: params.channelName ? `${params.senderName}: ${params.content}` : params.content,
      data: {
        channelId: params.channelId,
        serverSlug: params.serverSlug,
      },
    },
    trigger: null, // show immediately
  })
}

/**
 * Set up a listener that navigates to the channel when user taps a notification.
 * Returns cleanup function.
 */
export function setupNotificationResponseListener(): () => void {
  const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
    const data = response.notification.request.content.data as {
      channelId?: string
      serverSlug?: string
    }
    if (data.serverSlug && data.channelId) {
      router.push(`/(main)/servers/${data.serverSlug}/channels/${data.channelId}` as never)
    }
  })
  return () => subscription.remove()
}

/**
 * Configure notification channel for Android.
 */
export async function setupAndroidChannel(): Promise<void> {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('messages', {
      name: 'Messages',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      sound: 'default',
    })
  }
}
