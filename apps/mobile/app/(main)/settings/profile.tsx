import { Save } from 'lucide-react-native'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native'
import { Avatar } from '../../../src/components/common/avatar'
import { AvatarEditor } from '../../../src/components/common/avatar-editor'
import { LanguageSwitcher } from '../../../src/components/common/language-switcher'
import { fetchApi } from '../../../src/lib/api'
import { useAuthStore } from '../../../src/stores/auth.store'
import { fontSize, radius, spacing, useColors } from '../../../src/theme'

export default function ProfileSettingsScreen() {
  const { t } = useTranslation()
  const colors = useColors()
  const { user, setUser } = useAuthStore()
  const [displayName, setDisplayName] = useState(user?.displayName ?? '')
  const [avatarUrl, setAvatarUrl] = useState(user?.avatarUrl ?? '')
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')

  const handleSave = async () => {
    setSaving(true)
    setMessage('')
    try {
      const result = await fetchApi<{
        id: string
        email: string
        username: string
        displayName: string | null
        avatarUrl: string | null
      }>('/api/auth/me', {
        method: 'PATCH',
        body: JSON.stringify({
          displayName: displayName || undefined,
          avatarUrl: avatarUrl || undefined,
        }),
      })
      setUser({ ...user!, ...result })
      setMessage(t('common.saveSuccess'))
    } catch (err) {
      setMessage(err instanceof Error ? err.message : t('common.saveFailed'))
    } finally {
      setSaving(false)
    }
  }

  if (!user) return null

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.content}
    >
      {/* Avatar */}
      <View style={[styles.card, { backgroundColor: colors.surface }]}>
        <Text style={[styles.label, { color: colors.textSecondary }]}>
          {t('settings.avatarLabel')}
        </Text>
        <View style={styles.avatarRow}>
          <Avatar
            uri={avatarUrl || user.avatarUrl}
            name={user.displayName || user.username}
            size={72}
            userId={user.id}
          />
        </View>
        <AvatarEditor
          value={avatarUrl || user.avatarUrl}
          userId={user.id}
          onChange={setAvatarUrl}
        />
      </View>

      {/* Display name */}
      <View style={[styles.card, { backgroundColor: colors.surface }]}>
        <Text style={[styles.label, { color: colors.textSecondary }]}>
          {t('settings.displayNameLabel')}
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
          value={displayName}
          onChangeText={setDisplayName}
          placeholder={user.username}
          placeholderTextColor={colors.textMuted}
        />
      </View>

      {/* Language */}
      <View style={[styles.card, { backgroundColor: colors.surface }]}>
        <Text style={[styles.label, { color: colors.textSecondary }]}>
          {t('settings.languageLabel')}
        </Text>
        <LanguageSwitcher />
      </View>

      {/* Save */}
      <Pressable
        style={[styles.saveBtn, { backgroundColor: colors.primary, opacity: saving ? 0.6 : 1 }]}
        onPress={handleSave}
        disabled={saving}
      >
        <Save size={16} color="#fff" />
        <Text style={styles.saveBtnText}>
          {saving ? t('common.saving') : t('common.saveChanges')}
        </Text>
      </Pressable>
      {message ? (
        <Text
          style={{
            color:
              message.includes('成功') || message.includes('success') || message.includes('Success')
                ? '#23a559'
                : '#f23f43',
            fontSize: fontSize.sm,
            marginTop: spacing.sm,
            textAlign: 'center',
          }}
        >
          {message}
        </Text>
      ) : null}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: spacing.md, gap: spacing.md, paddingBottom: spacing.xl * 2 },
  card: { padding: spacing.lg, borderRadius: radius.xl },
  avatarRow: { alignItems: 'center', marginBottom: spacing.md },
  label: {
    fontSize: fontSize.xs,
    fontWeight: '700',
    textTransform: 'uppercase',
    marginBottom: spacing.sm,
  },
  input: {
    height: 44,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.md,
    fontSize: fontSize.md,
    borderWidth: 1,
  },
  saveBtn: {
    flexDirection: 'row',
    height: 48,
    borderRadius: radius.xl,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    marginHorizontal: spacing.md,
  },
  saveBtnText: { color: '#fff', fontSize: fontSize.md, fontWeight: '700' },
})
