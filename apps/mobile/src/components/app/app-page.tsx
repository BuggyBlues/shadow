import { useQuery } from '@tanstack/react-query'
import { Image } from 'expo-image'
import { LayoutGrid } from 'lucide-react-native'
import { useTranslation } from 'react-i18next'
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native'
import { fetchApi, getImageUrl } from '../../lib/api'
import { useAppStore } from '../../stores/app.store'
import { useAuthStore } from '../../stores/auth.store'
import { fontSize, radius, spacing, useColors } from '../../theme'
import { EmptyState } from '../common/empty-state'

interface AppItem {
  id: string
  name: string
  description: string | null
  iconUrl: string | null
  sourceFileId: string | null
  serverId: string
  createdBy: string
  createdAt: string
  updatedAt: string
}

export function AppPage({ serverId }: { serverId: string }) {
  const { t } = useTranslation()
  const colors = useColors()
  const activeAppId = useAppStore((s) => s.activeAppId)
  const setActiveAppId = useAppStore((s) => s.setActiveAppId)
  const _user = useAuthStore((s) => s.user)

  const { data: apps = [] } = useQuery({
    queryKey: ['server-apps', serverId],
    queryFn: () => fetchApi<AppItem[]>(`/api/servers/${serverId}/apps`),
  })

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <LayoutGrid size={20} color={colors.primary} />
        <Text style={[styles.headerTitle, { color: colors.text }]}>Apps</Text>
      </View>

      <FlatList
        data={apps}
        numColumns={3}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.grid}
        columnWrapperStyle={styles.gridRow}
        renderItem={({ item }) => (
          <Pressable
            style={[
              styles.appCard,
              { backgroundColor: colors.card, borderColor: colors.cardBorder },
              activeAppId === item.id && { borderColor: colors.primary },
            ]}
            onPress={() => setActiveAppId(item.id)}
          >
            {item.iconUrl ? (
              <Image
                source={{ uri: getImageUrl(item.iconUrl)! }}
                style={styles.appIcon}
                contentFit="cover"
              />
            ) : (
              <View style={[styles.appIconPlaceholder, { backgroundColor: colors.surface }]}>
                <LayoutGrid size={24} color={colors.textMuted} />
              </View>
            )}
            <Text style={[styles.appName, { color: colors.text }]} numberOfLines={2}>
              {item.name}
            </Text>
          </Pressable>
        )}
        ListEmptyComponent={
          <EmptyState
            icon={<LayoutGrid size={48} color={colors.textMuted} />}
            title="No Apps"
            description="No apps have been published to this server yet."
          />
        }
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    height: 52,
    paddingHorizontal: spacing.lg,
    borderBottomWidth: 1,
  },
  headerTitle: { fontSize: fontSize.lg, fontWeight: '700' },
  grid: { padding: spacing.md },
  gridRow: { gap: spacing.md },
  appCard: {
    flex: 1,
    borderRadius: radius.lg,
    borderWidth: 1,
    padding: spacing.md,
    alignItems: 'center',
    gap: spacing.sm,
  },
  appIcon: { width: 48, height: 48, borderRadius: radius.md },
  appIconPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  appName: { fontSize: fontSize.sm, fontWeight: '600', textAlign: 'center' },
})
