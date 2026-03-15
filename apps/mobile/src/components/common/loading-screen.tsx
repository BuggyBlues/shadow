import { ActivityIndicator, StyleSheet, Text, View } from 'react-native'
import { fontSize, useColors } from '../../theme'

interface LoadingScreenProps {
  message?: string
}

export function LoadingScreen({ message }: LoadingScreenProps) {
  const colors = useColors()

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ActivityIndicator size="large" color={colors.primary} />
      {message && <Text style={[styles.text, { color: colors.textSecondary }]}>{message}</Text>}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  text: {
    marginTop: 12,
    fontSize: fontSize.md,
  },
})
