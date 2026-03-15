import { useQuery } from '@tanstack/react-query'
import { useRouter } from 'expo-router'
import { Compass, Plus } from 'lucide-react-native'
import { useTranslation } from 'react-i18next'
import { Pressable, ScrollView, StyleSheet, View } from 'react-native'
import { fetchApi } from '../../lib/api'
import { useAuthStore } from '../../stores/auth.store'
import { useChatStore } from '../../stores/chat.store'
import { radius, spacing, useColors } from '../../theme'
import { Avatar } from '../common/avatar'

interface Server {
  id: string
  name: string
  slug: string
  iconUrl: string | null
}

export function ServerSidebar() {
  const { t } = useTranslation()
  const colors = useColors()
  const router = useRouter()
  const user = useAuthStore((s) => s.user)
  const activeServerId = useChatStore((s) => s.activeServerId)
  const setActiveServer = useChatStore((s) => s.setActiveServer)

  const { data: servers = [] } = useQuery({
    queryKey: ['servers'],
    queryFn: () => fetchApi<Server[]>('/api/servers'),
  })

  return (
    <View style={[styles.container, { backgroundColor: colors.serverSidebar }]}>
      <ScrollView style={styles.list} showsVerticalScrollIndicator={false}>
        {servers.map((server) => {
          const isActive = activeServerId === server.id
          return (
            <Pressable
              key={server.id}
              style={[styles.serverItem, isActive && { backgroundColor: `${colors.primary}30` }]}
              onPress={() => {
                setActiveServer(server.id)
                router.push(`/(main)/servers/${server.slug}`)
              }}
            >
              <Avatar uri={server.iconUrl} name={server.name} size={44} />
              {isActive && (
                <View style={[styles.activeIndicator, { backgroundColor: colors.primary }]} />
              )}
            </Pressable>
          )
        })}

        {/* Divider */}
        <View style={[styles.divider, { backgroundColor: colors.border }]} />

        {/* Create server */}
        <Pressable
          style={[styles.actionItem, { backgroundColor: colors.surface }]}
          onPress={() => router.push('/(main)/create-server')}
        >
          <Plus size={22} color={colors.success} />
        </Pressable>

        {/* Discover */}
        <Pressable
          style={[styles.actionItem, { backgroundColor: colors.surface }]}
          onPress={() => router.push('/(main)/discover')}
        >
          <Compass size={22} color={colors.primary} />
        </Pressable>
      </ScrollView>

      {/* User avatar at bottom */}
      <Pressable style={styles.userSection} onPress={() => router.push('/(main)/settings')}>
        <Avatar
          uri={user?.avatarUrl}
          name={user?.displayName || user?.username || '?'}
          size={36}
          userId={user?.id}
        />
      </Pressable>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    width: 68,
    alignItems: 'center',
    paddingTop: spacing.sm,
  },
  list: {
    flex: 1,
    paddingHorizontal: spacing.sm,
  },
  serverItem: {
    width: 48,
    height: 48,
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
    position: 'relative',
  },
  activeIndicator: {
    position: 'absolute',
    left: -8,
    width: 4,
    height: 24,
    borderRadius: 2,
  },
  divider: {
    height: 2,
    width: 32,
    alignSelf: 'center',
    borderRadius: 1,
    marginVertical: spacing.sm,
  },
  actionItem: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  userSection: {
    paddingVertical: spacing.md,
  },
})
