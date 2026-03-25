import { useMutation, useQuery } from '@tanstack/react-query'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { Clock, Cpu, Eye, Laptop, Monitor, Users } from 'lucide-react-native'
import { useTranslation } from 'react-i18next'
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { LoadingScreen } from '../../../src/components/common/loading-screen'
import { fetchApi } from '../../../src/lib/api'
import { showToast } from '../../../src/lib/toast'
import { fontSize, radius, spacing, useColors } from '../../../src/theme'

interface Listing {
  id: string
  ownerId: string
  buddyId: string | null
  title: string
  description: string | null
  skills: string[]
  guidelines: string | null
  deviceTier: 'high_end' | 'mid_range' | 'budget'
  osType: 'macos' | 'windows' | 'linux'
  deviceInfo: Record<string, string>
  softwareTools: string[]
  hourlyRate: number
  dailyRate: number
  monthlyRate: number
  premiumMarkup: number
  depositAmount: number
  listingStatus: string
  isListed: boolean
  viewCount: number
  rentalCount: number
  tags: string[]
  totalOnlineSeconds: number
  createdAt: string
  updatedAt: string
}

const DEVICE_TIER_INFO: Record<string, { labelKey: string; color: string }> = {
  high_end: { labelKey: 'marketplace.deviceHighEnd', color: '#F59E0B' },
  mid_range: { labelKey: 'marketplace.deviceMidRange', color: '#06B6D4' },
  budget: { labelKey: 'marketplace.deviceLowEnd', color: '#9CA3AF' },
  low_end: { labelKey: 'marketplace.deviceLowEnd', color: '#9CA3AF' },
}

const OS_INFO: Record<string, { label: string; icon: typeof Monitor }> = {
  macos: { label: 'macOS', icon: Laptop },
  windows: { label: 'Windows', icon: Monitor },
  linux: { label: 'Linux', icon: Monitor },
}

function formatOnlineTime(seconds: number): string {
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`
  return `${Math.floor(seconds / 86400)}d`
}

export default function BuddyDetailScreen() {
  const { listingId } = useLocalSearchParams<{ listingId: string }>()
  const { t } = useTranslation()
  const colors = useColors()
  const router = useRouter()

  const { data: listing, isLoading } = useQuery({
    queryKey: ['buddy-listing', listingId],
    queryFn: () => fetchApi<Listing>(`/api/marketplace/listings/${listingId}`),
    enabled: !!listingId,
  })

  const rentMutation = useMutation({
    mutationFn: () =>
      fetchApi('/api/marketplace/contracts', {
        method: 'POST',
        body: JSON.stringify({ listingId, agreedToTerms: true }),
      }),
    onSuccess: () => {
      showToast(t('buddies.rentSuccess'), 'success')
      router.back()
    },
    onError: (err: Error) => showToast(err.message, 'error'),
  })

  if (isLoading || !listing) return <LoadingScreen />

  const tierInfo = DEVICE_TIER_INFO[listing.deviceTier] ?? DEVICE_TIER_INFO.mid_range!
  const osInfo = OS_INFO[listing.osType]
  const OsIcon = osInfo?.icon ?? Monitor
  const isAvailable = listing.listingStatus === 'active' && listing.isListed

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.content}
    >
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.surface }]}>
        <View style={[styles.headerIcon, { backgroundColor: `${tierInfo.color}20` }]}>
          <Cpu size={36} color={tierInfo.color} />
        </View>
        <Text style={[styles.name, { color: colors.text }]}>{listing.title}</Text>
        {listing.description && (
          <Text style={[styles.desc, { color: colors.textSecondary }]}>{listing.description}</Text>
        )}

        {/* Badges row */}
        <View style={styles.badgesRow}>
          <View style={[styles.badge, { backgroundColor: tierInfo.color }]}>
            <Text style={styles.badgeText}>{t(tierInfo.labelKey)}</Text>
          </View>
          <View style={[styles.badge, { backgroundColor: colors.primary }]}>
            <OsIcon size={10} color="#fff" />
            <Text style={styles.badgeText}>{osInfo?.label ?? listing.osType}</Text>
          </View>
        </View>

        {/* Stats row */}
        <View style={styles.statsRow}>
          <View style={styles.stat}>
            <Eye size={14} color={colors.textMuted} />
            <Text style={[styles.statValue, { color: colors.text }]}>{listing.viewCount}</Text>
          </View>
          <View style={styles.stat}>
            <Users size={14} color={colors.textMuted} />
            <Text style={[styles.statValue, { color: colors.text }]}>{listing.rentalCount}</Text>
          </View>
          {listing.totalOnlineSeconds > 0 && (
            <View style={styles.stat}>
              <Clock size={14} color={colors.textMuted} />
              <Text style={[styles.statValue, { color: colors.text }]}>
                {formatOnlineTime(listing.totalOnlineSeconds)}
              </Text>
            </View>
          )}
        </View>
      </View>

      {/* Pricing card */}
      <View style={[styles.detailCard, { backgroundColor: colors.surface }]}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          {t('buddies.pricing', 'Pricing')}
        </Text>
        <View style={styles.priceGrid}>
          <View style={[styles.priceCell, { backgroundColor: `${colors.warning}10` }]}>
            <Text style={[styles.priceCellValue, { color: colors.warning }]}>
              {listing.hourlyRate}
            </Text>
            <Text style={[styles.priceCellUnit, { color: colors.textMuted }]}>
              /{t('buddies.perHour', 'hr')}
            </Text>
          </View>
          <View style={[styles.priceCell, { backgroundColor: `${colors.info}10` }]}>
            <Text style={[styles.priceCellValue, { color: colors.info }]}>{listing.dailyRate}</Text>
            <Text style={[styles.priceCellUnit, { color: colors.textMuted }]}>
              /{t('buddies.perDay', 'day')}
            </Text>
          </View>
          <View style={[styles.priceCell, { backgroundColor: `${colors.primary}10` }]}>
            <Text style={[styles.priceCellValue, { color: colors.primary }]}>
              {listing.monthlyRate}
            </Text>
            <Text style={[styles.priceCellUnit, { color: colors.textMuted }]}>
              /{t('buddies.perMonth', 'mo')}
            </Text>
          </View>
        </View>
        {listing.depositAmount > 0 && (
          <Text style={[styles.depositNote, { color: colors.textMuted }]}>
            {t('buddies.deposit', 'Deposit')}: {listing.depositAmount}
          </Text>
        )}
      </View>

      {/* Details */}
      <View style={[styles.detailCard, { backgroundColor: colors.surface }]}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          {t('buddies.deviceLabel')}
        </Text>
        {Object.entries(listing.deviceInfo).map(([key, value]) => (
          <View key={key} style={styles.detailRow}>
            <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>{key}</Text>
            <Text style={[styles.detailValue, { color: colors.text }]}>{value}</Text>
          </View>
        ))}
      </View>

      {/* Software tools */}
      {listing.softwareTools.length > 0 && (
        <View style={[styles.detailCard, { backgroundColor: colors.surface }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            {t('buddies.softwareTools', 'Software')}
          </Text>
          <View style={styles.skillsWrap}>
            {listing.softwareTools.map((tool) => (
              <View key={tool} style={[styles.skillTag, { backgroundColor: `${colors.info}15` }]}>
                <Text style={{ color: colors.info, fontSize: fontSize.xs, fontWeight: '600' }}>
                  {tool}
                </Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* Skills */}
      {listing.skills.length > 0 && (
        <View style={[styles.detailCard, { backgroundColor: colors.surface }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            {t('buddies.skillsLabel')}
          </Text>
          <View style={styles.skillsWrap}>
            {listing.skills.map((skill) => (
              <View
                key={skill}
                style={[styles.skillTag, { backgroundColor: `${colors.primary}15` }]}
              >
                <Text style={{ color: colors.primary, fontSize: fontSize.xs, fontWeight: '600' }}>
                  {skill}
                </Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* Rent button */}
      <Pressable
        style={[
          styles.rentBtn,
          { backgroundColor: colors.primary, opacity: rentMutation.isPending ? 0.6 : 1 },
        ]}
        onPress={() => rentMutation.mutate()}
        disabled={rentMutation.isPending || !isAvailable}
      >
        <Text style={styles.rentBtnText}>
          {!isAvailable
            ? t('buddies.unavailable')
            : rentMutation.isPending
              ? t('common.loading')
              : t('buddies.rent')}
        </Text>
      </Pressable>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: spacing.lg, gap: spacing.md },
  header: {
    padding: spacing.xl,
    borderRadius: radius.xl,
    alignItems: 'center',
  },
  headerIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  name: { fontSize: fontSize.xl, fontWeight: '800', marginTop: spacing.md },
  desc: { fontSize: fontSize.sm, marginTop: spacing.sm, textAlign: 'center', lineHeight: 20 },
  badgesRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.full,
  },
  badgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
  },
  statsRow: {
    flexDirection: 'row',
    gap: spacing.lg,
    marginTop: spacing.md,
  },
  stat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statValue: {
    fontSize: fontSize.sm,
    fontWeight: '600',
  },
  detailCard: { padding: spacing.lg, borderRadius: radius.xl },
  sectionTitle: { fontSize: fontSize.md, fontWeight: '700', marginBottom: spacing.sm },
  priceGrid: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  priceCell: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderRadius: radius.lg,
  },
  priceCellValue: {
    fontSize: fontSize.xl,
    fontWeight: '800',
  },
  priceCellUnit: {
    fontSize: fontSize.xs,
    fontWeight: '600',
    marginTop: 2,
  },
  depositNote: {
    fontSize: fontSize.xs,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  detailLabel: { fontSize: fontSize.sm, fontWeight: '600', textTransform: 'capitalize' },
  detailValue: { fontSize: fontSize.sm },
  skillsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  skillTag: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 99 },
  rentBtn: {
    height: 52,
    borderRadius: radius.xl,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.md,
  },
  rentBtnText: { color: '#fff', fontSize: fontSize.lg, fontWeight: '800' },
})
