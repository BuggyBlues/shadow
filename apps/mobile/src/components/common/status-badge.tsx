import { StyleSheet, Text, View } from 'react-native'
import { fontSize, spacing, useColors } from '../../theme'

interface StatusBadgeProps {
  status: 'online' | 'idle' | 'dnd' | 'offline' | string
  size?: number
  showLabel?: boolean
}

const STATUS_LABELS: Record<string, string> = {
  online: 'Online',
  idle: 'Idle',
  dnd: 'DND',
  offline: 'Offline',
}

export function StatusBadge({ status, size = 10, showLabel = false }: StatusBadgeProps) {
  const colors = useColors()

  const statusColorMap: Record<string, string> = {
    online: colors.statusOnline,
    idle: colors.statusIdle,
    dnd: colors.statusDnd,
    offline: colors.statusOffline,
  }

  const color = statusColorMap[status] ?? colors.statusOffline

  return (
    <View style={styles.container}>
      <View
        style={[
          styles.dot,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            backgroundColor: color,
          },
        ]}
      />
      {showLabel && (
        <Text style={[styles.label, { color: colors.textSecondary }]}>
          {STATUS_LABELS[status] ?? status}
        </Text>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  dot: {},
  label: {
    fontSize: fontSize.xs,
  },
})
