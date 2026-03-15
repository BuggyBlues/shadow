import { Tabs, useRouter } from 'expo-router'
import { Bot, ChevronLeft, Compass, MessageSquare, Plus, Settings } from 'lucide-react-native'
import { useTranslation } from 'react-i18next'
import { HeaderButton, HeaderButtonGroup } from '../../../src/components/common/header-button'
import { NotificationBell } from '../../../src/components/notification/notification-bell'
import { useColors } from '../../../src/theme'

export default function TabsLayout() {
  const { t } = useTranslation()
  const colors = useColors()
  const router = useRouter()

  return (
    <Tabs
      screenOptions={{
        headerShown: true,
        headerStyle: { backgroundColor: colors.surface },
        headerTintColor: colors.text,
        headerTitleStyle: { fontWeight: '700' },
        tabBarShowLabel: true,
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '600',
        },
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          borderTopWidth: 0,
          elevation: 0,
        },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: t('nav.servers'),
          tabBarIcon: ({ color }) => <MessageSquare size={24} color={color} />,
          headerLeft: () => (
            <HeaderButtonGroup>
              <HeaderButton icon={Compass} onPress={() => router.push('/(main)/(tabs)/discover')} />
            </HeaderButtonGroup>
          ),
          headerRight: () => (
            <HeaderButtonGroup>
              <HeaderButton icon={Plus} onPress={() => router.push('/(main)/create-server')} />
              <NotificationBell />
            </HeaderButtonGroup>
          ),
        }}
      />
      <Tabs.Screen
        name="discover"
        options={{
          href: null,
          title: t('discover.title'),
          headerLeft: () => (
            <HeaderButtonGroup>
              <HeaderButton
                icon={ChevronLeft}
                onPress={() => router.back()}
                color={colors.primary}
                size={22}
              />
            </HeaderButtonGroup>
          ),
        }}
      />
      <Tabs.Screen
        name="buddies"
        options={{
          title: t('buddies.title'),
          tabBarIcon: ({ color }) => <Bot size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: t('settings.sidebarTitle'),
          tabBarIcon: ({ color }) => <Settings size={24} color={color} />,
        }}
      />
    </Tabs>
  )
}
