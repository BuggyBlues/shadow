import { Link } from 'expo-router'
import { StyleSheet, Text, View } from 'react-native'
import { fontSize, spacing, useColors } from '../src/theme'

export default function NotFoundScreen() {
  const colors = useColors()

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Text style={[styles.title, { color: colors.text }]}>404</Text>
      <Text style={[styles.subtitle, { color: colors.textSecondary }]}>Page not found</Text>
      <Link href="/" style={[styles.link, { color: colors.primary }]}>
        Go home
      </Link>
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
  title: {
    fontSize: fontSize['4xl'],
    fontWeight: '800',
    marginBottom: spacing.sm,
  },
  subtitle: {
    fontSize: fontSize.lg,
    marginBottom: spacing.xl,
  },
  link: {
    fontSize: fontSize.md,
    fontWeight: '600',
  },
})
