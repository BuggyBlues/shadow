import { Alert } from 'react-native'

type ToastType = 'error' | 'success' | 'info'

/**
 * Show a toast notification using React Native Alert as a simple cross-platform fallback.
 * In production, consider using a dedicated toast library like react-native-toast-message.
 */
export function showToast(message: string, type: ToastType = 'info') {
  const titles: Record<ToastType, string> = {
    error: '❌',
    success: '✅',
    info: 'ℹ️',
  }
  Alert.alert(titles[type], message, [{ text: 'OK' }], { cancelable: true })
}
