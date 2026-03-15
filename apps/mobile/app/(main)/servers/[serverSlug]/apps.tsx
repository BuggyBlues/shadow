import { useQuery } from '@tanstack/react-query'
import { useLocalSearchParams } from 'expo-router'
import { useTranslation } from 'react-i18next'
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native'
import { Avatar } from '../../../../src/components/common/avatar'
import { EmptyState } from '../../../../src/components/common/empty-state'
import { LoadingScreen } from '../../../../src/components/common/loading-screen'
import { fetchApi } from '../../../../src/lib/api'
import { fontSize, radius, spacing, useColors } from '../../../../src/theme'

interface App {
  id: string
  name: string
  description: string | null
  iconUrl: string | null
  status: string
}

export default function AppsScreen() {
  const { serverSlug } = useLocalSearchParams<{ serverSlug: string }>()
  const { t } = useTranslation()
  const colors = useColors()

  const { data: server } = useQuery({
    queryKey: ['server', serverSlug],
    queryFn: () => fetchApi<{ id: string }>(`/api/servers/${serverSlug}`),
    enabled: !!serverSlug,
  })

  const { data: apps = [], isLoading } = useQuery({
    queryKey: ['server-apps', server?.id],
    queryFn: () => fetchApi<App[]>(`/api/servers/${server!.id}/apps`),
    enabled: !!server?.id,
  })

  if (isLoading) return <LoadingScreen />

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {apps.length === 0 ? (
        <EmptyState icon="📱" title={t('apps.noApps')} />
      ) : (
        <FlatList
          data={apps}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <Pressable style={[styles.card, { backgroundColor: colors.surface }]}>
              <Avatar uri={item.iconUrl} name={item.name} size={44} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.name, { color: colors.text }]}>{item.name}</Text>
                {item.description && (
                  <Text
                    style={{ color: colors.textSecondary, fontSize: fontSize.sm }}
                    numberOfLines={2}
                  >
                    {item.description}
                  </Text>
                )}
              </View>
              <View
                style={[
                  styles.statusDot,
                  { backgroundColor: item.status === 'active' ? '#23a559' : colors.textMuted },
                ]}
              />
            </Pressable>
          )}
        />
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  list: { padding: spacing.md, gap: spacing.sm },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.lg,
    borderRadius: radius.xl,
    gap: spacing.md,
  },
  name: { fontSize: fontSize.md, fontWeight: '700' },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
})
