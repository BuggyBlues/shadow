import { BlurView } from 'expo-blur'
import { Image } from 'expo-image'
import { Tabs } from 'expo-router'
import { Bell } from 'lucide-react-native'
import { useEffect } from 'react'
import { Platform, StyleSheet, View } from 'react-native'
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated'
import { TabBuddySvg, TabHomeSvg, TabMeSvg } from '../../../src/components/common/cat-svg'
import { getImageUrl } from '../../../src/lib/api'
import { useAuthStore } from '../../../src/stores/auth.store'
import { useColors } from '../../../src/theme'

function AnimatedTabIcon({ focused, children }: { focused: boolean; children: React.ReactNode }) {
  const scale = useSharedValue(1)
  const translateY = useSharedValue(0)

  useEffect(() => {
    scale.value = withSpring(focused ? 1.18 : 1, { damping: 12, stiffness: 200 })
    translateY.value = withSpring(focused ? -2 : 0, { damping: 12, stiffness: 200 })
  }, [focused, scale, translateY])

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }, { translateY: translateY.value }],
  }))

  return <Animated.View style={animatedStyle}>{children}</Animated.View>
}

function TabIconShell({
  focused,
  children,
  activeColor,
}: {
  focused: boolean
  children: React.ReactNode
  activeColor: string
}) {
  return (
    <View
      style={{
        width: 34,
        height: 34,
        borderRadius: 17,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: focused ? `${activeColor}20` : 'transparent',
      }}
    >
      {children}
    </View>
  )
}

export default function TabsLayout() {
  const colors = useColors()
  const currentUser = useAuthStore((s) => s.user)

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
          position: 'absolute',
          bottom: Platform.OS === 'ios' ? 24 : 16,
          left: 24,
          right: 24,
          height: 68,
          backgroundColor: `${colors.surface}E6`,
          borderTopWidth: 0,
          borderWidth: 1,
          borderColor: colors.border,
          borderRadius: 34,
          elevation: 0,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.14,
          shadowRadius: 14,
          paddingBottom: 0,
          paddingHorizontal: 12,
        },
        tabBarBackground: () => (
          <View style={[StyleSheet.absoluteFill, { overflow: 'hidden', borderRadius: 34 }]}>
            <BlurView tint="light" intensity={60} style={StyleSheet.absoluteFill} />
          </View>
        ),
        tabBarItemStyle: {
          paddingVertical: 7,
          borderRadius: 22,
        },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          headerShown: false,
          title: '主页',
          tabBarIcon: ({ color, focused }) => (
            <AnimatedTabIcon focused={focused}>
              <TabIconShell focused={focused} activeColor={colors.primary}>
                <TabHomeSvg size={24} color={color} />
              </TabIconShell>
            </AnimatedTabIcon>
          ),
        }}
      />
      <Tabs.Screen
        name="buddies"
        options={{
          title: 'Buddy 市集',
          tabBarIcon: ({ color, focused }) => (
            <AnimatedTabIcon focused={focused}>
              <TabIconShell focused={focused} activeColor={colors.primary}>
                <TabBuddySvg size={24} color={color} />
              </TabIconShell>
            </AnimatedTabIcon>
          ),
        }}
      />
      <Tabs.Screen
        name="notifications"
        options={{
          title: '通知',
          tabBarIcon: ({ color, focused }) => (
            <AnimatedTabIcon focused={focused}>
              <TabIconShell focused={focused} activeColor={colors.primary}>
                <Bell size={22} color={color} strokeWidth={focused ? 2.4 : 2.1} />
              </TabIconShell>
            </AnimatedTabIcon>
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: '我',
          tabBarIcon: ({ color, focused }) => {
            const icon = currentUser?.avatarUrl
              ? (() => {
                  const uri = getImageUrl(currentUser.avatarUrl)
                  if (uri) {
                    return (
                      <Image
                        source={{ uri }}
                        style={{
                          width: 24,
                          height: 24,
                          borderRadius: 12,
                          borderWidth: 1,
                          borderColor: color,
                        }}
                        contentFit="cover"
                      />
                    )
                  }
                  return null
                })()
              : null
            return (
              <AnimatedTabIcon focused={focused}>
                <TabIconShell focused={focused} activeColor={colors.primary}>
                  {icon ?? <TabMeSvg size={24} color={color} />}
                </TabIconShell>
              </AnimatedTabIcon>
            )
          },
        }}
      />
    </Tabs>
  )
}
