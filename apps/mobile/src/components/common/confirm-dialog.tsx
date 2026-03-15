import { Modal, Pressable, StyleSheet, Text, View } from 'react-native'
import { fontSize, radius, spacing, useColors } from '../../theme'

interface ConfirmDialogProps {
  visible: boolean
  title: string
  message: string
  confirmLabel?: string
  cancelLabel?: string
  destructive?: boolean
  onConfirm: () => void
  onCancel: () => void
}

export function ConfirmDialog({
  visible,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  destructive = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const colors = useColors()

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <View style={[styles.overlay, { backgroundColor: colors.overlay }]}>
        <View style={[styles.dialog, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
          <Text style={[styles.message, { color: colors.textSecondary }]}>{message}</Text>
          <View style={styles.actions}>
            <Pressable
              style={[styles.button, { backgroundColor: colors.surface }]}
              onPress={onCancel}
            >
              <Text style={[styles.buttonText, { color: colors.textSecondary }]}>
                {cancelLabel}
              </Text>
            </Pressable>
            <Pressable
              style={[
                styles.button,
                { backgroundColor: destructive ? colors.error : colors.primary },
              ]}
              onPress={onConfirm}
            >
              <Text style={[styles.buttonText, { color: '#fff' }]}>{confirmLabel}</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  dialog: {
    width: '100%',
    maxWidth: 340,
    borderRadius: radius.lg,
    padding: spacing['2xl'],
    borderWidth: 1,
  },
  title: {
    fontSize: fontSize.lg,
    fontWeight: '700',
    marginBottom: spacing.sm,
  },
  message: {
    fontSize: fontSize.md,
    lineHeight: 22,
    marginBottom: spacing['2xl'],
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  button: {
    flex: 1,
    height: 42,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    fontSize: fontSize.md,
    fontWeight: '600',
  },
})
