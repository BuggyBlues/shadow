import { Bell } from 'lucide-react-native'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { useUnreadCount } from '../../hooks/use-unread-count'
import { spacing, useColors } from '../../theme'

interface NotificationBellProps {
  onPress?: () => void
}

export function NotificationBell({ onPress }: NotificationBellProps) {
  const colors = useColors()
  const count = useUnreadCount()

  return (
    <Pressable style={styles.container} onPress={onPress}>
      <Bell size={22} color={colors.text} />
      {count > 0 && (
        <View style={[styles.badge, { backgroundColor: colors.error }]}>
          <Text style={styles.badgeText}>{count > 99 ? '99+' : count}</Text>
        </View>
      )}
    </Pressable>
  )
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    padding: spacing.xs,
  },
  badge: {
    position: 'absolute',
    top: 0,
    right: 0,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
  },
})
