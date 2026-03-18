import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'expo-router'
import {
  Check,
  ChevronLeft,
  ChevronRight,
  MessageCircle,
  Search,
  Trash2,
  UserPlus,
  X,
} from 'lucide-react-native'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Alert,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native'
import Reanimated, { FadeInRight } from 'react-native-reanimated'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Avatar } from '../../src/components/common/avatar'
import { EmptyState } from '../../src/components/common/empty-state'
import { fetchApi } from '../../src/lib/api'
import { showToast } from '../../src/lib/toast'
import { fontSize, radius, spacing, useColors } from '../../src/theme'

interface FriendUser {
  id: string
  username: string
  displayName: string | null
  avatarUrl: string | null
  status: string
  isBot: boolean
}

interface FriendEntry {
  friendshipId: string
  source: 'friend' | 'owned_claw' | 'rented_claw'
  user: FriendUser
  clawStatus?: 'available' | 'listed' | 'rented_out'
  createdAt: string
}

interface DmChannel {
  id: string
  userAId: string
  userBId: string
  lastMessageAt: string | null
  createdAt: string
  otherUser?: {
    id: string
    username: string
    displayName: string
    avatarUrl: string | null
    status: string
  }
}

type Tab = 'chats' | 'friends' | 'pending' | 'add'

export default function FriendsScreen() {
  const { t } = useTranslation()
  const colors = useColors()
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const queryClient = useQueryClient()
  const [activeTab, setActiveTab] = useState<Tab>('friends')
  const [searchQuery, setSearchQuery] = useState('')
  const [addUsername, setAddUsername] = useState('')
  const [refreshing, setRefreshing] = useState(false)

  const { data: dmChannels = [], refetch: refetchDm } = useQuery({
    queryKey: ['dm-channels'],
    queryFn: () => fetchApi<DmChannel[]>('/api/dm/channels'),
  })

  const { data: friends = [], refetch: refetchFriends } = useQuery({
    queryKey: ['friends'],
    queryFn: () => fetchApi<FriendEntry[]>('/api/friends'),
  })

  const { data: pendingReceived = [] } = useQuery({
    queryKey: ['friends-pending'],
    queryFn: () => fetchApi<FriendEntry[]>('/api/friends/pending'),
  })

  const { data: pendingSent = [] } = useQuery({
    queryKey: ['friends-sent'],
    queryFn: () => fetchApi<FriendEntry[]>('/api/friends/sent'),
  })

  const sendRequest = useMutation({
    mutationFn: (username: string) =>
      fetchApi('/api/friends/request', {
        method: 'POST',
        body: JSON.stringify({ username }),
      }),
    onSuccess: () => {
      showToast(t('friends.requestSent', '好友请求已发送'), 'success')
      setAddUsername('')
      queryClient.invalidateQueries({ queryKey: ['friends-sent'] })
    },
    onError: (err: Error) => showToast(err.message, 'error'),
  })

  const acceptRequest = useMutation({
    mutationFn: (id: string) => fetchApi(`/api/friends/${id}/accept`, { method: 'POST' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['friends'] })
      queryClient.invalidateQueries({ queryKey: ['friends-pending'] })
      showToast(t('friends.accepted', '已接受好友请求'), 'success')
    },
  })

  const rejectRequest = useMutation({
    mutationFn: (id: string) => fetchApi(`/api/friends/${id}/reject`, { method: 'POST' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['friends-pending'] })
    },
  })

  const removeFriend = useMutation({
    mutationFn: (id: string) => fetchApi(`/api/friends/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['friends'] })
      showToast(t('friends.removed', '已删除好友'), 'success')
    },
  })

  const startChat = useMutation({
    mutationFn: (userId: string) =>
      fetchApi<{ id: string }>('/api/dm/channels', {
        method: 'POST',
        body: JSON.stringify({ userId }),
      }),
    onSuccess: (data) => {
      router.push(`/(main)/dm/${data.id}` as never)
    },
  })

  const filteredFriends = useMemo(() => {
    if (!searchQuery) return friends
    const q = searchQuery.toLowerCase()
    return friends.filter(
      (f) =>
        f.user.username.toLowerCase().includes(q) ||
        (f.user.displayName ?? '').toLowerCase().includes(q),
    )
  }, [friends, searchQuery])

  const filteredDm = useMemo(() => {
    if (!searchQuery) return dmChannels
    const q = searchQuery.toLowerCase()
    return dmChannels.filter((dm) => {
      const name = dm.otherUser?.displayName ?? dm.otherUser?.username ?? ''
      return name.toLowerCase().includes(q)
    })
  }, [dmChannels, searchQuery])

  const onRefresh = async () => {
    setRefreshing(true)
    await Promise.all([refetchDm(), refetchFriends()])
    setRefreshing(false)
  }

  const statusColors: Record<string, string> = {
    online: '#23a559',
    idle: '#f59e0b',
    dnd: '#ed4245',
    offline: '#747f8d',
  }

  const tabs: { key: Tab; label: string; badge?: number }[] = [
    { key: 'chats', label: t('friends.tabChats', '私信') },
    { key: 'friends', label: t('friends.tabAll', '好友') },
    {
      key: 'pending',
      label: t('friends.tabPending', '待处理'),
      badge: pendingReceived.length || undefined,
    },
    { key: 'add', label: t('friends.tabAdd', '添加') },
  ]

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View
        style={[
          styles.navBar,
          {
            backgroundColor: colors.surface,
            paddingTop: insets.top + 8,
            borderBottomColor: colors.border,
          },
        ]}
      >
        <Pressable onPress={() => router.back()} hitSlop={12} style={styles.backBtn}>
          <ChevronLeft size={22} color={colors.text} />
        </Pressable>
        <View style={styles.navTitleWrap}>
          <Text style={[styles.navTitle, { color: colors.text }]}>
            {t('friends.title', '好友')}
          </Text>
        </View>
        <View style={styles.navSpacer} />
      </View>

      <View
        style={[
          styles.tabWrap,
          { backgroundColor: colors.surface, borderBottomColor: colors.border },
        ]}
      >
        {tabs.map((tab) => (
          <Pressable
            key={tab.key}
            hitSlop={10}
            style={[
              styles.tab,
              {
                borderBottomColor: activeTab === tab.key ? colors.primary : 'transparent',
              },
            ]}
            onPress={() => {
              setActiveTab(tab.key)
              setSearchQuery('')
            }}
          >
            <Text
              style={[
                styles.tabText,
                { color: activeTab === tab.key ? colors.primary : colors.textMuted },
              ]}
            >
              {tab.label}
            </Text>
            {tab.badge != null && tab.badge > 0 && (
              <View style={styles.tabBadge}>
                <Text style={styles.tabBadgeText}>{tab.badge}</Text>
              </View>
            )}
          </Pressable>
        ))}
      </View>

      {(activeTab === 'chats' || activeTab === 'friends') && (
        <View style={[styles.searchWrap, { backgroundColor: colors.surface }]}>
          <View style={[styles.searchBox, { backgroundColor: colors.inputBackground }]}>
            <Search size={16} color={colors.textMuted} />
            <TextInput
              style={[styles.searchInput, { color: colors.text }]}
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder={
                activeTab === 'chats'
                  ? t('friends.searchChats', '搜索私信...')
                  : t('friends.searchPlaceholder', '搜索好友...')
              }
              placeholderTextColor={colors.textMuted}
            />
            {searchQuery.length > 0 && (
              <Pressable onPress={() => setSearchQuery('')} hitSlop={10}>
                <X size={16} color={colors.textMuted} />
              </Pressable>
            )}
          </View>
        </View>
      )}

      {activeTab === 'chats' && (
        <FlatList
          data={filteredDm}
          keyExtractor={(item) => item.id}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.textMuted}
            />
          }
          contentContainerStyle={styles.listContent}
          renderItem={({ item, index }) => {
            const user = item.otherUser
            if (!user) return null
            return (
              <Reanimated.View entering={FadeInRight.delay(index * 20).springify()}>
                <Pressable
                  style={({ pressed }) => [
                    styles.rowCard,
                    { backgroundColor: pressed ? colors.surfaceHover : colors.surface },
                  ]}
                  onPress={() => router.push(`/(main)/dm/${item.id}` as never)}
                >
                  <View style={styles.avatarWrap}>
                    <Avatar
                      uri={user.avatarUrl}
                      name={user.displayName || user.username}
                      size={46}
                      userId={user.id}
                    />
                    <View
                      style={[
                        styles.statusDot,
                        {
                          backgroundColor: statusColors[user.status] ?? statusColors.offline,
                          borderColor: colors.surface,
                        },
                      ]}
                    />
                  </View>
                  <View style={styles.rowInfo}>
                    <Text style={[styles.rowName, { color: colors.text }]} numberOfLines={1}>
                      {user.displayName || user.username}
                    </Text>
                    <Text style={[styles.rowSub, { color: colors.textMuted }]} numberOfLines={1}>
                      @{user.username}
                    </Text>
                  </View>
                  <MessageCircle size={18} color={colors.textMuted} />
                </Pressable>
              </Reanimated.View>
            )
          }}
          ListEmptyComponent={
            <EmptyState
              icon="💬"
              title={t('friends.noChats', '暂无私信')}
              description={t('friends.noChatsHint', '去好友列表开始聊天吧')}
            />
          }
        />
      )}

      {activeTab === 'friends' && (
        <FlatList
          data={filteredFriends}
          keyExtractor={(item) => item.friendshipId}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.textMuted}
            />
          }
          contentContainerStyle={styles.listContent}
          ListHeaderComponent={
            <View>
              <Pressable
                style={[styles.utilityRow, { borderBottomColor: colors.border }]}
                onPress={() => setActiveTab('pending')}
              >
                <View style={styles.utilityLeft}>
                  <Text style={[styles.utilityTitle, { color: colors.text }]}>
                    {t('friends.newFriends', '新的朋友')}
                  </Text>
                  <Text style={[styles.utilityDesc, { color: colors.textMuted }]}>
                    {t('friends.pendingHint', '处理好友申请')}
                  </Text>
                </View>
                <View style={styles.utilityRight}>
                  {pendingReceived.length > 0 && (
                    <View style={styles.tabBadge}>
                      <Text style={styles.tabBadgeText}>{pendingReceived.length}</Text>
                    </View>
                  )}
                  <ChevronRight size={16} color={colors.textMuted} />
                </View>
              </Pressable>
              <Pressable
                style={[styles.utilityRow, { borderBottomColor: colors.border }]}
                onPress={() => setActiveTab('chats')}
              >
                <View style={styles.utilityLeft}>
                  <Text style={[styles.utilityTitle, { color: colors.text }]}>
                    {t('friends.dmChats', '私信会话')}
                  </Text>
                  <Text style={[styles.utilityDesc, { color: colors.textMuted }]}>
                    {t('friends.dmChatsHint', '查看最近聊天')}
                  </Text>
                </View>
                <View style={styles.utilityRight}>
                  <ChevronRight size={16} color={colors.textMuted} />
                </View>
              </Pressable>
              <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>
                {t('friends.allContacts', '我的联系人')}
              </Text>
            </View>
          }
          renderItem={({ item, index }) => (
            <Reanimated.View entering={FadeInRight.delay(index * 20).springify()}>
              <View style={[styles.rowCard, { borderBottomColor: colors.border }]}>
                <View style={styles.avatarWrap}>
                  <Avatar
                    uri={item.user.avatarUrl}
                    name={item.user.displayName || item.user.username}
                    size={46}
                    userId={item.user.id}
                  />
                  <View
                    style={[
                      styles.statusDot,
                      {
                        backgroundColor: statusColors[item.user.status] ?? statusColors.offline,
                        borderColor: colors.surface,
                      },
                    ]}
                  />
                </View>
                <View style={styles.rowInfo}>
                  <Text style={[styles.rowName, { color: colors.text }]} numberOfLines={1}>
                    {item.user.displayName ?? item.user.username}
                  </Text>
                  <Text style={[styles.rowSub, { color: colors.textMuted }]} numberOfLines={1}>
                    @{item.user.username}
                  </Text>
                </View>
                <View style={styles.rowActions}>
                  <Pressable
                    hitSlop={10}
                    style={[styles.iconBtn, { backgroundColor: `${colors.primary}14` }]}
                    onPress={() => startChat.mutate(item.user.id)}
                  >
                    <MessageCircle size={16} color={colors.primary} />
                  </Pressable>
                  {item.source === 'friend' && (
                    <Pressable
                      hitSlop={10}
                      style={[styles.iconBtn, { backgroundColor: '#ef444415' }]}
                      onPress={() => {
                        Alert.alert(
                          t('friends.removeTitle', '删除好友'),
                          t(
                            'friends.removeConfirm',
                            `确定要删除 ${item.user.displayName ?? item.user.username} 吗？`,
                          ),
                          [
                            { text: t('common.cancel', '取消'), style: 'cancel' },
                            {
                              text: t('common.delete', '删除'),
                              style: 'destructive',
                              onPress: () => removeFriend.mutate(item.friendshipId),
                            },
                          ],
                        )
                      }}
                    >
                      <Trash2 size={16} color="#ef4444" />
                    </Pressable>
                  )}
                </View>
              </View>
            </Reanimated.View>
          )}
          ListEmptyComponent={
            <EmptyState
              icon="👋"
              title={t('friends.noFriends', '还没有好友')}
              description={t('friends.noFriendsHint', '切换到"添加"标签添加好友')}
            />
          }
        />
      )}

      {activeTab === 'pending' && (
        <FlatList
          data={[...pendingReceived, ...pendingSent]}
          keyExtractor={(item) => item.friendshipId}
          contentContainerStyle={styles.listContent}
          renderItem={({ item, index }) => {
            const isReceived = pendingReceived.some((r) => r.friendshipId === item.friendshipId)
            if (isReceived) {
              return (
                <Reanimated.View entering={FadeInRight.delay(index * 20).springify()}>
                  <View style={[styles.rowCard, { backgroundColor: colors.surface }]}>
                    <Avatar
                      uri={item.user.avatarUrl}
                      name={item.user.displayName || item.user.username}
                      size={46}
                      userId={item.user.id}
                    />
                    <View style={styles.rowInfo}>
                      <Text style={[styles.rowName, { color: colors.text }]} numberOfLines={1}>
                        {item.user.displayName ?? item.user.username}
                      </Text>
                      <Text style={[styles.rowSub, { color: colors.textMuted }]}>
                        {t('friends.wantsToBeYourFriend', '请求添加你为好友')}
                      </Text>
                    </View>
                    <View style={styles.rowActions}>
                      <Pressable
                        style={[styles.iconBtn, { backgroundColor: '#23a55915' }]}
                        onPress={() => acceptRequest.mutate(item.friendshipId)}
                      >
                        <Check size={16} color="#23a559" />
                      </Pressable>
                      <Pressable
                        style={[styles.iconBtn, { backgroundColor: '#ef444415' }]}
                        onPress={() => rejectRequest.mutate(item.friendshipId)}
                      >
                        <X size={16} color="#ef4444" />
                      </Pressable>
                    </View>
                  </View>
                </Reanimated.View>
              )
            }
            return (
              <Reanimated.View entering={FadeInRight.delay(index * 20).springify()}>
                <View style={[styles.rowCard, { backgroundColor: colors.surface }]}>
                  <Avatar
                    uri={item.user.avatarUrl}
                    name={item.user.displayName || item.user.username}
                    size={46}
                    userId={item.user.id}
                  />
                  <View style={styles.rowInfo}>
                    <Text style={[styles.rowName, { color: colors.text }]} numberOfLines={1}>
                      {item.user.displayName ?? item.user.username}
                    </Text>
                    <Text style={[styles.rowSub, { color: colors.textMuted }]}>
                      {t('friends.requestPending', '等待对方接受')}
                    </Text>
                  </View>
                </View>
              </Reanimated.View>
            )
          }}
          ListEmptyComponent={
            <EmptyState icon="📭" title={t('friends.noPending', '暂无待处理请求')} />
          }
        />
      )}

      {activeTab === 'add' && (
        <View style={[styles.addContainer, { backgroundColor: colors.background }]}>
          <Text style={[styles.addTitle, { color: colors.text }]}>
            {t('friends.addFriend', '添加好友')}
          </Text>
          <Text style={[styles.addDesc, { color: colors.textMuted }]}>
            {t('friends.addFriendDesc', '输入用户名来发送好友请求')}
          </Text>
          <View
            style={[
              styles.addInputRow,
              { backgroundColor: colors.inputBackground, borderColor: colors.border },
            ]}
          >
            <UserPlus size={18} color={colors.textMuted} />
            <TextInput
              style={[styles.addInput, { color: colors.text }]}
              value={addUsername}
              onChangeText={setAddUsername}
              placeholder={t('friends.usernamePlaceholder', '输入用户名')}
              placeholderTextColor={colors.textMuted}
              autoCapitalize="none"
              autoCorrect={false}
            />
            <Pressable
              hitSlop={10}
              style={[
                styles.addBtn,
                { backgroundColor: addUsername.trim() ? colors.primary : `${colors.primary}40` },
              ]}
              disabled={!addUsername.trim() || sendRequest.isPending}
              onPress={() => addUsername.trim() && sendRequest.mutate(addUsername.trim())}
            >
              <Text style={styles.addBtnText}>{t('friends.sendRequest', '发送')}</Text>
            </Pressable>
          </View>
        </View>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  navBar: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
  },
  backBtn: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  navTitleWrap: { flexDirection: 'row', alignItems: 'center' },
  navTitle: { fontSize: fontSize.lg, fontWeight: '800' },
  navSpacer: { width: 32, height: 32 },
  tabWrap: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    paddingHorizontal: spacing.lg,
    gap: spacing.lg,
  },
  tab: {
    minHeight: 42,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderBottomWidth: 2,
  },
  tabText: { fontSize: fontSize.md, fontWeight: '700' },
  tabBadge: {
    backgroundColor: '#ed4245',
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  tabBadgeText: { color: '#fff', fontSize: 10, fontWeight: '700' },
  searchWrap: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  searchBox: {
    minHeight: 42,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radius.md,
    paddingHorizontal: spacing.sm,
    gap: spacing.xs,
  },
  searchInput: { flex: 1, fontSize: fontSize.sm, paddingVertical: 0 },
  listContent: { paddingBottom: 120 },
  utilityRow: {
    minHeight: 64,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    borderBottomWidth: 1,
  },
  utilityLeft: { gap: 3 },
  utilityTitle: { fontSize: fontSize.md, fontWeight: '700' },
  utilityDesc: { fontSize: fontSize.xs },
  utilityRight: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  sectionTitle: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.xs,
    fontSize: fontSize.xs,
    fontWeight: '700',
  },
  rowCard: {
    minHeight: 70,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    gap: spacing.md,
    borderBottomWidth: 1,
  },
  avatarWrap: { position: 'relative' },
  statusDot: {
    position: 'absolute',
    bottom: -1,
    right: -1,
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 2.5,
  },
  rowInfo: { flex: 1, gap: 2 },
  rowName: { fontSize: fontSize.md, fontWeight: '700' },
  rowSub: { fontSize: fontSize.xs },
  rowActions: { flexDirection: 'row', gap: 8 },
  iconBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addContainer: { padding: spacing.lg, gap: spacing.md },
  addTitle: { fontSize: fontSize.lg, fontWeight: '800' },
  addDesc: { fontSize: fontSize.sm },
  addInputRow: {
    minHeight: 50,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: radius.lg,
    paddingLeft: spacing.md,
    gap: spacing.sm,
    overflow: 'hidden',
  },
  addInput: { flex: 1, fontSize: fontSize.md, paddingVertical: 12 },
  addBtn: {
    minWidth: 74,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'stretch',
    paddingHorizontal: spacing.lg,
  },
  addBtnText: { color: '#fff', fontWeight: '700', fontSize: fontSize.sm },
})
