import { Link, useRouter } from 'expo-router'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native'
import { fetchApi } from '../../src/lib/api'
import { showToast } from '../../src/lib/toast'
import { useAuthStore } from '../../src/stores/auth.store'
import { fontSize, radius, spacing, useColors } from '../../src/theme'

export default function LoginScreen() {
  const { t } = useTranslation()
  const colors = useColors()
  const router = useRouter()
  const setAuth = useAuthStore((s) => s.setAuth)

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) return
    setLoading(true)
    try {
      const data = await fetchApi<{
        user: {
          id: string
          email: string
          username: string
          displayName: string | null
          avatarUrl: string | null
        }
        accessToken: string
        refreshToken: string
      }>('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email: email.trim(), password }),
      })
      setAuth(data.user, data.accessToken, data.refreshToken)
      router.replace('/(main)')
    } catch (err) {
      showToast((err as Error).message || t('auth.loginFailed'), 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.background }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.header}>
          <Text style={[styles.brand, { color: colors.primary }]}>🐱</Text>
          <Text style={[styles.title, { color: colors.text }]}>{t('auth.loginTitle')}</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            {t('auth.loginSubtitle')}
          </Text>
        </View>

        <View style={styles.form}>
          <Text style={[styles.label, { color: colors.textSecondary }]}>
            {t('auth.emailLabel')}
          </Text>
          <TextInput
            style={[
              styles.input,
              {
                backgroundColor: colors.inputBackground,
                color: colors.text,
                borderColor: colors.border,
              },
            ]}
            value={email}
            onChangeText={setEmail}
            placeholder="your@email.com"
            placeholderTextColor={colors.textMuted}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
          />

          <Text style={[styles.label, { color: colors.textSecondary }]}>
            {t('auth.passwordLabel')}
          </Text>
          <TextInput
            style={[
              styles.input,
              {
                backgroundColor: colors.inputBackground,
                color: colors.text,
                borderColor: colors.border,
              },
            ]}
            value={password}
            onChangeText={setPassword}
            placeholder={t('auth.passwordPlaceholder')}
            placeholderTextColor={colors.textMuted}
            secureTextEntry
          />

          <Pressable
            style={[styles.button, { backgroundColor: colors.primary, opacity: loading ? 0.6 : 1 }]}
            onPress={handleLogin}
            disabled={loading}
          >
            <Text style={styles.buttonText}>
              {loading ? t('auth.loginLoading') : t('auth.loginSubmit')}
            </Text>
          </Pressable>
        </View>

        <View style={styles.footer}>
          <Text style={{ color: colors.textSecondary }}>{t('auth.noAccount')} </Text>
          <Link href="/(auth)/register" style={{ color: colors.primary, fontWeight: '600' }}>
            {t('auth.registerLink')}
          </Link>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: spacing['3xl'],
  },
  header: {
    alignItems: 'center',
    marginBottom: spacing['3xl'],
  },
  brand: {
    fontSize: 48,
    marginBottom: spacing.md,
  },
  title: {
    fontSize: fontSize['2xl'],
    fontWeight: '800',
    marginBottom: spacing.xs,
  },
  subtitle: {
    fontSize: fontSize.md,
  },
  form: {
    gap: spacing.sm,
  },
  label: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    marginTop: spacing.sm,
  },
  input: {
    height: 48,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.lg,
    fontSize: fontSize.md,
    borderWidth: 1,
  },
  button: {
    height: 48,
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.lg,
  },
  buttonText: {
    color: '#fff',
    fontSize: fontSize.lg,
    fontWeight: '700',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: spacing['2xl'],
  },
})
