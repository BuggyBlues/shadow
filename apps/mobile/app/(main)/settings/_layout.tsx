import { Stack, useRouter } from 'expo-router'
import { ChevronLeft } from 'lucide-react-native'
import { useTranslation } from 'react-i18next'
import { Pressable } from 'react-native'
import { useColors } from '../../../src/theme'

export default function SettingsLayout() {
  const { t } = useTranslation()
  const colors = useColors()
  const router = useRouter()

  const headerLeft = () => (
    <Pressable onPress={() => router.back()} hitSlop={8} style={{ marginRight: 4 }}>
      <ChevronLeft size={24} color={colors.text} />
    </Pressable>
  )

  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.surface },
        headerTintColor: colors.text,
        headerTitleStyle: { fontWeight: '700' },
        headerLeft,
      }}
    >
      <Stack.Screen name="profile" options={{ title: t('settings.tabProfile') }} />
      <Stack.Screen name="appearance" options={{ title: t('settings.tabAppearance') }} />
      <Stack.Screen name="notifications" options={{ title: '通知' }} />
      <Stack.Screen name="tasks" options={{ title: '任务中心' }} />
      <Stack.Screen name="buddy" options={{ title: t('settings.tabBuddy') }} />
      <Stack.Screen name="account" options={{ title: t('settings.tabAccount') }} />
      <Stack.Screen name="invite" options={{ title: t('settings.tabInvite') }} />
    </Stack>
  )
}
