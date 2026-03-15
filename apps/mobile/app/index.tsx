import { Redirect } from 'expo-router'
import { LoadingScreen } from '../src/components/common/loading-screen'
import { useAuthStore } from '../src/stores/auth.store'

export default function Index() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const isLoading = useAuthStore((s) => s.isLoading)

  if (isLoading) {
    return <LoadingScreen />
  }

  if (isAuthenticated) {
    return <Redirect href="/(main)" />
  }

  return <Redirect href="/(auth)/login" />
}
