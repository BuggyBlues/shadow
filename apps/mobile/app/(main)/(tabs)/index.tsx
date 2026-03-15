import { useQuery } from '@tanstack/react-query'
import { useRouter } from 'expo-router'
import { Search } from 'lucide-react-native'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native'
import { Avatar } from '../../../src/components/common/avatar'
import { EmptyState } from '../../../src/components/common/empty-state'
import { LoadingScreen } from '../../../src/components/common/loading-screen'
import { fetchApi } from '../../../src/lib/api'
import { fontSize, radius, spacing, useColors } from '../../../src/theme'

interface ServerEntry {
  server: {
    id: string
    name: string
    slug: string | null
    iconUrl: string | null
    description?: string | null
  }
  member: {
    role: string
  }
}

export default function ServersScreen() {
  const { t } = useTranslation()
  const colors = useColors()
  const router = useRouter()
  const [search, setSearch] = useState('')

  const {
    data: servers = [],
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ['servers'],
    queryFn: () => fetchApi<ServerEntry[]>('/api/servers'),
  })
  const [refreshing, setRefreshing] = useState(false)

  const filtered = useMemo(() => {
    if (!search.trim()) return servers
    const q = search.toLowerCase()
    return servers.filter(
      (s) =>
        s.server.name.toLowerCase().includes(q) || s.server.description?.toLowerCase().includes(q),
    )
  }, [servers, search])

  if (isLoading) return <LoadingScreen />

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Search bar */}
      <View style={[styles.searchWrap, { backgroundColor: colors.surface }]}>
        <View style={[styles.searchBox, { backgroundColor: colors.inputBackground }]}>
          <Search size={16} color={colors.textMuted} />
          <TextInput
            style={[styles.searchInput, { color: colors.text }]}
            value={search}
            onChangeText={setSearch}
            placeholder={t('common.search')}
            placeholderTextColor={colors.textMuted}
          />
        </View>
      </View>

      {filtered.length === 0 ? (
        <EmptyState
          icon="💬"
          title={search ? t('common.noResults') : t('server.noServers')}
          description={search ? undefined : t('server.noServersDesc')}
        />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.server.id}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={async () => {
                setRefreshing(true)
                await refetch()
                setRefreshing(false)
              }}
              tintColor={colors.textMuted}
            />
          }
          renderItem={({ item }) => {
            const subtitle =
              item.server.description ||
              t(
                `member.role${item.member.role.charAt(0).toUpperCase()}${item.member.role.slice(1)}`,
              )
            return (
              <Pressable
                style={({ pressed }) => [
                  styles.serverRow,
                  pressed && { backgroundColor: colors.surfaceHover },
                ]}
                onPress={() => router.push(`/(main)/servers/${item.server.slug ?? item.server.id}`)}
              >
                <Avatar
                  uri={item.server.iconUrl}
                  name={item.server.name}
                  size={48}
                  userId={item.server.id}
                />
                <View style={styles.serverContent}>
                  <Text style={[styles.serverName, { color: colors.text }]} numberOfLines={1}>
                    {item.server.name}
                  </Text>
                  <Text
                    style={[styles.serverSubtitle, { color: colors.textMuted }]}
                    numberOfLines={1}
                  >
                    {subtitle}
                  </Text>
                </View>
              </Pressable>
            )
          }}
          ItemSeparatorComponent={() => (
            <View style={[styles.separator, { backgroundColor: colors.border }]} />
          )}
        />
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  searchWrap: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    height: 36,
    gap: spacing.xs,
  },
  searchInput: {
    flex: 1,
    fontSize: fontSize.sm,
    paddingVertical: 0,
  },
  serverRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    gap: spacing.md,
  },
  serverContent: {
    flex: 1,
    justifyContent: 'center',
  },
  serverName: {
    fontSize: fontSize.md,
    fontWeight: '600',
  },
  serverSubtitle: {
    fontSize: fontSize.sm,
    marginTop: 2,
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    marginLeft: 48 + spacing.lg + spacing.md,
  },
})
