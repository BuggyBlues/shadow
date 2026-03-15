import { useQuery } from '@tanstack/react-query'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { useTranslation } from 'react-i18next'
import { Pressable, SectionList, StyleSheet, Text, View } from 'react-native'
import { Avatar } from '../../../../src/components/common/avatar'
import { LoadingScreen } from '../../../../src/components/common/loading-screen'
import { StatusBadge } from '../../../../src/components/common/status-badge'
import { fetchApi } from '../../../../src/lib/api'
import { fontSize, radius, spacing, useColors } from '../../../../src/theme'

interface Member {
  user: {
    id: string
    username: string
    displayName: string | null
    avatarUrl: string | null
    status?: string
  }
  role: string
  joinedAt: string
}

export default function MembersScreen() {
  const { serverSlug } = useLocalSearchParams<{ serverSlug: string }>()
  const { t } = useTranslation()
  const colors = useColors()
  const router = useRouter()

  const { data: server } = useQuery({
    queryKey: ['server', serverSlug],
    queryFn: () => fetchApi<{ id: string }>(`/api/servers/${serverSlug}`),
    enabled: !!serverSlug,
  })

  const { data: memberData, isLoading } = useQuery({
    queryKey: ['members', server?.id],
    queryFn: async () => {
      const res = await fetchApi<{ members: Member[] } | Member[]>(
        `/api/servers/${server!.id}/members`,
      )
      return Array.isArray(res) ? res : (res.members ?? [])
    },
    enabled: !!server?.id,
  })

  if (isLoading) return <LoadingScreen />

  const members: Member[] = memberData ?? []
  const online = members.filter(
    (m) => m.user.status === 'online' || m.user.status === 'idle' || m.user.status === 'dnd',
  )
  const offline = members.filter((m) => !m.user.status || m.user.status === 'offline')

  const sections = [
    { title: `${t('members.online')} — ${online.length}`, data: online },
    { title: `${t('members.offline')} — ${offline.length}`, data: offline },
  ].filter((s) => s.data.length > 0)

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <SectionList
        sections={sections}
        keyExtractor={(item) => item.user.id}
        renderSectionHeader={({ section }) => (
          <Text
            style={[
              styles.sectionHeader,
              { color: colors.textMuted, backgroundColor: colors.background },
            ]}
          >
            {section.title}
          </Text>
        )}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <Pressable
            style={[styles.memberRow, { backgroundColor: colors.surface }]}
            onPress={() => router.push(`/(main)/profile/${item.user.id}`)}
          >
            <View style={{ position: 'relative' }}>
              <Avatar
                uri={item.user.avatarUrl}
                name={item.user.displayName || item.user.username}
                size={40}
                userId={item.user.id}
              />
              <View style={{ position: 'absolute', bottom: -1, right: -1 }}>
                <StatusBadge status={item.user.status ?? 'offline'} size={12} />
              </View>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.name, { color: colors.text }]}>
                {item.user.displayName || item.user.username}
              </Text>
              <Text style={{ color: colors.textMuted, fontSize: fontSize.xs }}>{item.role}</Text>
            </View>
          </Pressable>
        )}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  list: { padding: spacing.md },
  sectionHeader: {
    fontSize: fontSize.xs,
    fontWeight: '700',
    textTransform: 'uppercase',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.lg,
    marginBottom: 2,
  },
  name: {
    fontSize: fontSize.md,
    fontWeight: '600',
  },
})
