import type React from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { fontSize, radius, spacing, useColors } from '../../theme'

interface EmptyStateProps {
  icon?: React.ReactNode
  title: string
  description?: string
  actionLabel?: string
  onAction?: () => void
}

export function EmptyState({ icon, title, description, actionLabel, onAction }: EmptyStateProps) {
  const colors = useColors()

  return (
    <View style={styles.container}>
      {icon && (
        <View style={styles.icon}>
          {typeof icon === 'string' ? (
            <Text style={{ fontSize: fontSize['2xl'] }}>{icon}</Text>
          ) : (
            icon
          )}
        </View>
      )}
      <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
      {description && (
        <Text style={[styles.description, { color: colors.textSecondary }]}>{description}</Text>
      )}
      {actionLabel && onAction && (
        <Pressable style={[styles.action, { backgroundColor: colors.primary }]} onPress={onAction}>
          <Text style={styles.actionText}>{actionLabel}</Text>
        </Pressable>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing['3xl'],
  },
  icon: {
    marginBottom: spacing.lg,
  },
  title: {
    fontSize: fontSize.lg,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  description: {
    fontSize: fontSize.md,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: spacing.xl,
  },
  action: {
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
  },
  actionText: {
    color: '#fff',
    fontSize: fontSize.md,
    fontWeight: '600',
  },
})
