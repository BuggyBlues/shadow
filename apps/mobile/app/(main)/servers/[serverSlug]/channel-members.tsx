import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useLocalSearchParams, useRouter } from 'expo-router'
import {
  Bot,
  Check,
  ChevronRight,
  Crown,
  MessageSquare,
  MinusCircle,
  Plus,
  Search,
  Shield,
  UserPlus,
  X,
} from 'lucide-react-native'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Pressable,
  SectionList,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native'
import { Avatar } from '../../../../src/components/common/avatar'
import { LoadingScreen } from '../../../../src/components/common/loading-screen'
import { StatusBadge } from '../../../../src/components/common/status-badge'
import { fetchApi } from '../../../../src/lib/api'
import { useAuthStore } from '../../../../src/stores/auth.store'
import { fontSize, radius, spacing, useColors } from '../../../../src/theme'

interface ChannelMember {
  id: string
  userId: string
  role: 'owner' | 'admin' | 'member'
  user: {
    id: string
    username: string
    displayName: string | null
    avatarUrl: string | null
    status?: string
    isBot?: boolean
  }
}

interface ServerMember {
  user: {
    id: string
    username: string
    displayName: string | null
    avatarUrl: string | null
    isBot?: boolean
  }
  role: string
}

interface BuddyMember {
  id: string
  ownerId: string
  userId: string
  buddyUser?: {
    id: string
    username: string
    displayName?: string | null
    avatarUrl?: string | null
  } | null
}

type PolicyMode = 'replyAll' | 'mentionOnly' | 'disabled'

export default function ChannelMembersScreen() {
  const { serverSlug, channelId, autoInvite } = useLocalSearchParams<{
    serverSlug: string
    channelId: string
    autoInvite?: string
  }>()
  const { t } = useTranslation()
  const colors = useColors()
  const router = useRouter()
  const queryClient = useQueryClient()
  const currentUser = useAuthStore((s) => s.user)

  const [policySheet, setPolicySheet] = useState<ChannelMember | null>(null)
  const [showInviteSheet, setShowInviteSheet] = useState(autoInvite === '1')
  const [inviteSearch, setInviteSearch] = useState('')
  const [addedUserIds, setAddedUserIds] = useState<Set<string>>(new Set())

  // Channel info
  const { data: channel } = useQuery({
    queryKey: ['channel', channelId],
    queryFn: () =>
      fetchApi<{ id: string; name: string; serverId: string }>(`/api/channels/${channelId}`),
    enabled: !!channelId,
  })

  // Channel members (the actual page data)
  const { data: members = [], isLoading } = useQuery({
    queryKey: ['channel-members', channelId],
    queryFn: () => fetchApi<ChannelMember[]>(`/api/channels/${channelId}/members`),
    enabled: !!channelId,
  })

  // Server members for invite
  const { data: serverMembers = [] } = useQuery({
    queryKey: ['server-members-for-invite', channel?.serverId],
    queryFn: () => fetchApi<ServerMember[]>(`/api/servers/${channel!.serverId}/members`),
    enabled: !!channel?.serverId && showInviteSheet,
  })

  // User's buddy buddies for invite
  const { data: myBuddies = [] } = useQuery({
    queryKey: ['my-buddies-for-invite'],
    queryFn: () => fetchApi<BuddyMember[]>('/api/buddies'),
    enabled: showInviteSheet,
  })

  // Server info for permissions
  const { data: server } = useQuery({
    queryKey: ['server', serverSlug],
    queryFn: () => fetchApi<{ id: string; name: string }>(`/api/servers/${serverSlug}`),
    enabled: !!serverSlug,
  })

  // Invite: server members not in channel
  const invitableServerMembers = useMemo(() => {
    const channelUserIds = new Set(members.map((m) => m.userId))
    const q = inviteSearch.toLowerCase()
    return serverMembers
      .filter((m) => !channelUserIds.has(m.user.id) && !m.user.isBot)
      .filter((m) => {
        if (!q) return true
        const name = (m.user.displayName || m.user.username).toLowerCase()
        return name.includes(q) || m.user.username.toLowerCase().includes(q)
      })
  }, [serverMembers, members, inviteSearch])

  // Invite: user's buddies not in channel (also check if on server)
  const serverBuddyUserIds = useMemo(
    () => new Set(serverMembers.filter((m) => m.user.isBot).map((m) => m.user.id)),
    [serverMembers],
  )
  const channelBuddyUserIds = useMemo(
    () => new Set(members.filter((m) => m.user.isBot).map((m) => m.userId)),
    [members],
  )

  // Server bots not in this channel
  const serverBuddiesNotInChannel = useMemo(() => {
    const q = inviteSearch.toLowerCase()
    return serverMembers
      .filter((m) => m.user.isBot && !channelBuddyUserIds.has(m.user.id))
      .filter((m) => {
        if (!q) return true
        const name = (m.user.displayName || m.user.username).toLowerCase()
        return name.includes(q)
      })
  }, [serverMembers, channelBuddyUserIds, inviteSearch])

  // User's buddies not on this server
  const myBuddiesNotOnServer = useMemo(() => {
    const q = inviteSearch.toLowerCase()
    return myBuddies
      .filter((a) => a.buddyUser && !serverBuddyUserIds.has(a.buddyUser.id))
      .filter((a) => {
        if (!q) return true
        const name = (a.buddyUser?.displayName || a.buddyUser?.username || '').toLowerCase()
        return name.includes(q)
      })
  }, [myBuddies, serverBuddyUserIds, inviteSearch])

  // Invite member to channel
  const inviteMember = useMutation({
    mutationFn: (userId: string) =>
      fetchApi(`/api/channels/${channelId}/members`, {
        method: 'POST',
        body: JSON.stringify({ userId }),
      }),
    onSuccess: (_data, userId) => {
      setAddedUserIds((prev) => new Set(prev).add(userId))
      queryClient.invalidateQueries({ queryKey: ['channel-members', channelId] })
    },
  })

  // Add buddy to server then to channel
  const addBuddyToServer = useMutation({
    mutationFn: async (buddy: BuddyMember) => {
      await fetchApi(`/api/servers/${channel!.serverId}/buddies`, {
        method: 'POST',
        body: JSON.stringify({ buddyIds: [buddy.id] }),
      })
      if (buddy.buddyUser?.id) {
        await fetchApi(`/api/channels/${channelId}/members`, {
          method: 'POST',
          body: JSON.stringify({ userId: buddy.buddyUser.id }),
        })
      }
    },
    onSuccess: (_data, buddy) => {
      if (buddy.buddyUser?.id) {
        setAddedUserIds((prev) => new Set(prev).add(buddy.buddyUser!.id))
      }
      queryClient.invalidateQueries({ queryKey: ['channel-members', channelId] })
      queryClient.invalidateQueries({ queryKey: ['server-members-for-invite'] })
    },
  })

  // Remove member from channel
  const removeMember = useMutation({
    mutationFn: (userId: string) =>
      fetchApi(`/api/channels/${channelId}/members/${userId}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['channel-members', channelId] })
    },
  })

  // Buddy policy
  const { data: buddyMembers = [] } = useQuery({
    queryKey: ['channel-buddy-buddies'],
    queryFn: () => fetchApi<BuddyMember[]>('/api/buddies'),
  })

  const selectedBuddy = policySheet?.user.isBot
    ? buddyMembers.find((a) => a.buddyUser?.id === policySheet.user.id)
    : null

  const { data: currentPolicy } = useQuery({
    queryKey: ['buddy-policy', channelId, selectedBuddy?.id],
    queryFn: () =>
      fetchApi<{ mentionOnly: boolean; reply: boolean; config: Record<string, unknown> }>(
        `/api/channels/${channelId}/buddies/${selectedBuddy!.id}/policy`,
      ),
    enabled: !!channelId && !!selectedBuddy,
  })

  const currentMode: PolicyMode = (() => {
    if (!currentPolicy) return 'replyAll'
    if (!currentPolicy.reply) return 'disabled'
    if (currentPolicy.mentionOnly) return 'mentionOnly'
    return 'replyAll'
  })()

  const updatePolicy = useMutation({
    mutationFn: ({ mode }: { mode: string }) =>
      fetchApi(`/api/channels/${channelId}/buddies/${selectedBuddy!.id}/policy`, {
        method: 'PUT',
        body: JSON.stringify({ mode }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['buddy-policy', channelId, selectedBuddy?.id] })
      setPolicySheet(null)
    },
  })

  const canManagePolicy = (member: ChannelMember) => {
    if (!member.user.isBot) return false
    const buddy = buddyMembers.find((a) => a.buddyUser?.id === member.user.id)
    if (!buddy) return false
    return buddy.ownerId === currentUser?.id || server?.id != null
  }

  if (isLoading) return <LoadingScreen />

  const online = members.filter(
    (m) => m.user.status === 'online' || m.user.status === 'idle' || m.user.status === 'dnd',
  )
  const offline = members.filter((m) => !m.user.status || m.user.status === 'offline')

  const sections = [
    { title: t('members.online', '在线'), count: online.length, data: online },
    { title: t('members.offline', '离线'), count: offline.length, data: offline },
  ].filter((s) => s.data.length > 0)

  const roleBadge = (role: string) => {
    if (role === 'owner') return <Crown size={12} color="#eab308" style={{ marginLeft: 4 }} />
    if (role === 'admin') return <Shield size={12} color="#3b82f6" style={{ marginLeft: 4 }} />
    return null
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <SectionList
        sections={sections}
        keyExtractor={(item) => item.userId}
        ListHeaderComponent={
          <>
            {/* Add member card */}
            <Pressable
              onPress={() => {
                setShowInviteSheet(true)
                setInviteSearch('')
              }}
              style={({ pressed }) => [
                styles.inviteCard,
                {
                  backgroundColor: pressed
                    ? (colors.surfaceHover ?? colors.border)
                    : colors.surface,
                },
              ]}
            >
              <View style={[styles.inviteIcon, { backgroundColor: colors.primary }]}>
                <UserPlus size={18} color="#fff" />
              </View>
              <Text style={[styles.inviteLabel, { color: colors.text }]}>
                {t('members.addToChannel', '添加成员到频道')}
              </Text>
              <ChevronRight size={18} color={colors.textMuted} />
            </Pressable>
          </>
        }
        renderSectionHeader={({ section }) => (
          <Text
            style={[
              styles.sectionHeader,
              { color: colors.textMuted, backgroundColor: colors.background },
            ]}
          >
            {section.title} — {section.count}
          </Text>
        )}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <Pressable
            style={({ pressed }) => [
              styles.memberRow,
              {
                backgroundColor: pressed ? (colors.surfaceHover ?? colors.border) : colors.surface,
              },
            ]}
            onPress={() => router.push(`/(main)/profile/${item.user.id}` as never)}
            onLongPress={() => {
              if (canManagePolicy(item)) setPolicySheet(item)
            }}
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
              <View style={styles.nameRow}>
                <Text
                  style={[styles.name, { color: item.user.isBot ? colors.primary : colors.text }]}
                  numberOfLines={1}
                >
                  {item.user.displayName || item.user.username}
                </Text>
                {roleBadge(item.role)}
                {item.user.isBot && (
                  <View style={[styles.botBadge, { backgroundColor: `${colors.primary}20` }]}>
                    <Bot size={10} color={colors.primary} />
                    <Text style={[styles.botBadgeText, { color: colors.primary }]}>Buddy</Text>
                  </View>
                )}
              </View>
              <Text style={{ color: colors.textMuted, fontSize: fontSize.xs }} numberOfLines={1}>
                {item.user.username}
              </Text>
            </View>
            {/* Remove button for non-self members */}
            {item.userId !== currentUser?.id && (
              <Pressable
                onPress={() => removeMember.mutate(item.userId)}
                hitSlop={8}
                style={({ pressed }) => ({ opacity: pressed ? 0.5 : 1 })}
              >
                <MinusCircle size={18} color={colors.textMuted} />
              </Pressable>
            )}
          </Pressable>
        )}
      />

      {/* Invite Sheet */}
      <Modal
        visible={showInviteSheet}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowInviteSheet(false)}
      >
        <View style={[styles.invitePanel, { backgroundColor: colors.background }]}>
          {/* Header */}
          <View
            style={[
              styles.inviteHeader,
              { backgroundColor: colors.surface, borderBottomColor: colors.border },
            ]}
          >
            <Text style={[styles.inviteTitle, { color: colors.text }]}>
              {t('members.addToChannel', '添加成员到频道')}
            </Text>
            <Pressable
              onPress={() => setShowInviteSheet(false)}
              hitSlop={8}
              style={({ pressed }) => ({ opacity: pressed ? 0.5 : 1 })}
            >
              <X size={22} color={colors.textMuted} />
            </Pressable>
          </View>

          {/* Search */}
          <View style={[styles.inviteSearchRow, { backgroundColor: colors.inputBackground }]}>
            <Search size={16} color={colors.textMuted} />
            <TextInput
              style={[styles.inviteSearchInput, { color: colors.text }]}
              value={inviteSearch}
              onChangeText={setInviteSearch}
              placeholder={t('common.search', '搜索...')}
              placeholderTextColor={colors.textMuted}
              autoFocus
            />
            {inviteSearch.length > 0 && (
              <Pressable onPress={() => setInviteSearch('')} hitSlop={8}>
                <X size={14} color={colors.textMuted} />
              </Pressable>
            )}
          </View>

          <FlatList
            data={[]}
            renderItem={() => null}
            ListHeaderComponent={
              <>
                {/* Server members not in channel */}
                {invitableServerMembers.length > 0 && (
                  <>
                    <Text style={[styles.inviteSectionTitle, { color: colors.textMuted }]}>
                      {t('members.serverMembers', '服务器成员')}
                    </Text>
                    {invitableServerMembers.map((m) => {
                      const isPending =
                        inviteMember.isPending && inviteMember.variables === m.user.id
                      const isAdded = addedUserIds.has(m.user.id)
                      return (
                        <View
                          key={m.user.id}
                          style={[styles.inviteMemberRow, { borderBottomColor: colors.border }]}
                        >
                          <Avatar
                            uri={m.user.avatarUrl}
                            name={m.user.displayName || m.user.username}
                            size={36}
                            userId={m.user.id}
                          />
                          <Text
                            style={[styles.inviteMemberName, { color: colors.text }]}
                            numberOfLines={1}
                          >
                            {m.user.displayName || m.user.username}
                          </Text>
                          {isAdded ? (
                            <View style={[styles.inviteBtn, { backgroundColor: '#23a55920' }]}>
                              <Check size={14} color="#23a559" />
                            </View>
                          ) : (
                            <Pressable
                              style={[
                                styles.inviteBtn,
                                { backgroundColor: colors.primary, opacity: isPending ? 0.6 : 1 },
                              ]}
                              onPress={() => inviteMember.mutate(m.user.id)}
                              disabled={isPending}
                            >
                              {isPending ? (
                                <ActivityIndicator size="small" color="#fff" />
                              ) : (
                                <>
                                  <Plus size={14} color="#fff" />
                                  <Text style={styles.inviteBtnText}>
                                    {t('common.invite', '邀请')}
                                  </Text>
                                </>
                              )}
                            </Pressable>
                          )}
                        </View>
                      )
                    })}
                  </>
                )}

                {/* Server bots not in channel */}
                {serverBuddiesNotInChannel.length > 0 && (
                  <>
                    <Text style={[styles.inviteSectionTitle, { color: colors.textMuted }]}>
                      {t('members.serverBuddies', '服务器 Buddy')}
                    </Text>
                    {serverBuddiesNotInChannel.map((m) => {
                      const isPending =
                        inviteMember.isPending && inviteMember.variables === m.user.id
                      const isAdded = addedUserIds.has(m.user.id)
                      return (
                        <View
                          key={m.user.id}
                          style={[styles.inviteMemberRow, { borderBottomColor: colors.border }]}
                        >
                          <Avatar
                            uri={m.user.avatarUrl}
                            name={m.user.displayName || m.user.username}
                            size={36}
                            userId={m.user.id}
                          />
                          <View style={{ flex: 1 }}>
                            <Text
                              style={[styles.inviteMemberName, { color: colors.primary }]}
                              numberOfLines={1}
                            >
                              {m.user.displayName || m.user.username}
                            </Text>
                          </View>
                          {isAdded ? (
                            <View style={[styles.inviteBtn, { backgroundColor: '#23a55920' }]}>
                              <Check size={14} color="#23a559" />
                            </View>
                          ) : (
                            <Pressable
                              style={[
                                styles.inviteBtn,
                                { backgroundColor: colors.primary, opacity: isPending ? 0.6 : 1 },
                              ]}
                              onPress={() => inviteMember.mutate(m.user.id)}
                              disabled={isPending}
                            >
                              {isPending ? (
                                <ActivityIndicator size="small" color="#fff" />
                              ) : (
                                <>
                                  <Plus size={14} color="#fff" />
                                  <Text style={styles.inviteBtnText}>
                                    {t('common.add', '添加')}
                                  </Text>
                                </>
                              )}
                            </Pressable>
                          )}
                        </View>
                      )
                    })}
                  </>
                )}

                {/* User's own buddies not on server */}
                {myBuddiesNotOnServer.length > 0 && (
                  <>
                    <Text style={[styles.inviteSectionTitle, { color: colors.textMuted }]}>
                      {t('members.myBuddies', '我的 Buddy')}
                    </Text>
                    {myBuddiesNotOnServer.map((a) => {
                      const isPending =
                        addBuddyToServer.isPending && addBuddyToServer.variables?.id === a.id
                      const isAdded = a.buddyUser?.id ? addedUserIds.has(a.buddyUser.id) : false
                      return (
                        <View
                          key={a.id}
                          style={[styles.inviteMemberRow, { borderBottomColor: colors.border }]}
                        >
                          <Avatar
                            uri={a.buddyUser?.avatarUrl ?? null}
                            name={a.buddyUser?.displayName || a.buddyUser?.username || '?'}
                            size={36}
                            userId={a.buddyUser?.id}
                          />
                          <View style={{ flex: 1 }}>
                            <Text
                              style={[styles.inviteMemberName, { color: colors.primary }]}
                              numberOfLines={1}
                            >
                              {a.buddyUser?.displayName || a.buddyUser?.username || '?'}
                            </Text>
                            <Text style={{ color: colors.textMuted, fontSize: fontSize.xs }}>
                              {t('members.notOnServer', '未加入服务器')}
                            </Text>
                          </View>
                          {isAdded ? (
                            <View style={[styles.inviteBtn, { backgroundColor: '#23a55920' }]}>
                              <Check size={14} color="#23a559" />
                            </View>
                          ) : (
                            <Pressable
                              style={[
                                styles.inviteBtn,
                                { backgroundColor: colors.primary, opacity: isPending ? 0.6 : 1 },
                              ]}
                              onPress={() => addBuddyToServer.mutate(a)}
                              disabled={isPending}
                            >
                              {isPending ? (
                                <ActivityIndicator size="small" color="#fff" />
                              ) : (
                                <>
                                  <Plus size={14} color="#fff" />
                                  <Text style={styles.inviteBtnText}>
                                    {t('common.add', '添加')}
                                  </Text>
                                </>
                              )}
                            </Pressable>
                          )}
                        </View>
                      )
                    })}
                  </>
                )}

                {/* Empty state */}
                {invitableServerMembers.length === 0 &&
                  serverBuddiesNotInChannel.length === 0 &&
                  myBuddiesNotOnServer.length === 0 && (
                    <Text
                      style={{
                        color: colors.textMuted,
                        fontSize: fontSize.sm,
                        textAlign: 'center',
                        paddingTop: spacing['3xl'],
                      }}
                    >
                      {t('members.noInvitable', '没有可邀请的成员')}
                    </Text>
                  )}
              </>
            }
          />
        </View>
      </Modal>

      {/* Buddy Reply Policy Sheet */}
      <Modal
        visible={!!policySheet}
        transparent
        animationType="slide"
        onRequestClose={() => setPolicySheet(null)}
      >
        <Pressable style={styles.sheetOverlay} onPress={() => setPolicySheet(null)}>
          <Pressable
            style={[styles.sheetContent, { backgroundColor: colors.surface }]}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={[styles.sheetHandle, { backgroundColor: colors.textMuted }]} />
            <Text style={[styles.sheetTitle, { color: colors.text }]}>
              <MessageSquare size={16} color={colors.primary} />{' '}
              {t('member.replyPolicy', '回复策略')}
            </Text>
            <Text style={[styles.sheetSubtitle, { color: colors.textMuted }]}>
              {policySheet?.user.displayName || policySheet?.user.username}
            </Text>

            <Pressable
              style={[styles.policyOption, { borderBottomColor: colors.border }]}
              onPress={() => updatePolicy.mutate({ mode: 'replyAll' })}
            >
              <View style={styles.policyOptionContent}>
                <Text style={[styles.policyLabel, { color: colors.text }]}>
                  {t('member.policyReplyAll', '回复所有消息')}
                </Text>
                <Text style={[styles.policyDesc, { color: colors.textMuted }]}>
                  {t('member.policyReplyAllDesc', 'Buddy 会回复频道中的所有消息')}
                </Text>
              </View>
              {currentMode === 'replyAll' && <Check size={18} color="#23a559" />}
            </Pressable>

            <Pressable
              style={[styles.policyOption, { borderBottomColor: colors.border }]}
              onPress={() => updatePolicy.mutate({ mode: 'mentionOnly' })}
            >
              <View style={styles.policyOptionContent}>
                <Text style={[styles.policyLabel, { color: colors.text }]}>
                  {t('member.policyMentionOnly', '仅回复 @提及')}
                </Text>
                <Text style={[styles.policyDesc, { color: colors.textMuted }]}>
                  {t('member.policyMentionOnlyDesc', '仅在被 @ 时回复')}
                </Text>
              </View>
              {currentMode === 'mentionOnly' && <Check size={18} color="#23a559" />}
            </Pressable>

            <Pressable
              style={[styles.policyOption, { borderBottomColor: colors.border }]}
              onPress={() => updatePolicy.mutate({ mode: 'disabled' })}
            >
              <View style={styles.policyOptionContent}>
                <Text style={[styles.policyLabel, { color: colors.error }]}>
                  {t('member.policyDisabled', '静默（不回复）')}
                </Text>
                <Text style={[styles.policyDesc, { color: colors.textMuted }]}>
                  {t('member.policyDisabledDesc', 'Buddy 将不会在此频道回复任何消息')}
                </Text>
              </View>
              {currentMode === 'disabled' && <Check size={18} color={colors.error} />}
            </Pressable>

            <Pressable
              style={[styles.sheetCancel, { backgroundColor: colors.background }]}
              onPress={() => setPolicySheet(null)}
            >
              <Text style={[styles.sheetCancelText, { color: colors.text }]}>
                {t('common.cancel', '取消')}
              </Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  inviteCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderRadius: radius.lg,
    marginHorizontal: spacing.md,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  inviteIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inviteLabel: {
    flex: 1,
    fontSize: fontSize.md,
    fontWeight: '600',
  },
  list: { paddingBottom: spacing.xl },
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
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  name: {
    fontSize: fontSize.md,
    fontWeight: '600',
    flexShrink: 1,
  },
  botBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    marginLeft: 6,
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: radius.sm,
  },
  botBadgeText: {
    fontSize: 10,
    fontWeight: '600',
  },
  // Invite panel
  invitePanel: { flex: 1 },
  inviteHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  inviteTitle: {
    fontSize: fontSize.lg,
    fontWeight: '700',
  },
  inviteSearchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: spacing.md,
    marginVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    height: 40,
    borderRadius: radius.lg,
    gap: spacing.sm,
  },
  inviteSearchInput: {
    flex: 1,
    fontSize: fontSize.md,
    height: 40,
  },
  inviteSectionTitle: {
    fontSize: fontSize.xs,
    fontWeight: '700',
    textTransform: 'uppercase',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  inviteMemberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  inviteMemberName: {
    flex: 1,
    fontSize: fontSize.md,
    fontWeight: '500',
  },
  inviteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
  },
  inviteBtnText: {
    color: '#fff',
    fontSize: fontSize.sm,
    fontWeight: '600',
  },
  // Policy sheet
  sheetOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  sheetContent: {
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing['3xl'],
  },
  sheetHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: spacing.sm,
    marginBottom: spacing.md,
  },
  sheetTitle: {
    fontSize: fontSize.lg,
    fontWeight: '700',
    marginBottom: spacing.xs,
  },
  sheetSubtitle: {
    fontSize: fontSize.sm,
    marginBottom: spacing.md,
  },
  policyOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: spacing.md,
  },
  policyOptionContent: {
    flex: 1,
  },
  policyLabel: {
    fontSize: fontSize.md,
    fontWeight: '600',
  },
  policyDesc: {
    fontSize: fontSize.xs,
    marginTop: 2,
  },
  sheetCancel: {
    marginTop: spacing.md,
    paddingVertical: spacing.md,
    borderRadius: radius.lg,
    alignItems: 'center',
  },
  sheetCancelText: {
    fontSize: fontSize.md,
    fontWeight: '600',
  },
})
