import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native'
import { SettingsHeader } from '../../../src/components/common/settings-header'
import { fetchApi } from '../../../src/lib/api'
import { useAuthStore } from '../../../src/stores/auth.store'
import { fontSize, radius, spacing, useColors } from '../../../src/theme'

export default function AccountSettingsScreen() {
  const { t } = useTranslation()
  const colors = useColors()
  const { user, setUser } = useAuthStore()

  // Change password state
  const [inviteCode, setInviteCode] = useState('')
  const [inviteLoading, setInviteLoading] = useState(false)
  const [inviteError, setInviteError] = useState<string | null>(null)
  const [inviteSuccess, setInviteSuccess] = useState(false)
  const [showPasswordForm, setShowPasswordForm] = useState(false)
  const [passwordForm, setPasswordForm] = useState({
    oldPassword: '',
    newPassword: '',
    confirmPassword: '',
  })
  const [passwordError, setPasswordError] = useState<string | null>(null)
  const [passwordLoading, setPasswordLoading] = useState(false)
  const [passwordSuccess, setPasswordSuccess] = useState(false)

  const handleChangePassword = async () => {
    setPasswordError(null)
    setPasswordSuccess(false)

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordError(t('settings.passwordMismatch'))
      return
    }

    if (passwordForm.newPassword.length < 8) {
      setPasswordError(t('settings.passwordTooShort'))
      return
    }

    setPasswordLoading(true)
    try {
      await fetchApi('/api/auth/password', {
        method: 'PUT',
        body: JSON.stringify({
          oldPassword: passwordForm.oldPassword,
          newPassword: passwordForm.newPassword,
          confirmPassword: passwordForm.confirmPassword,
        }),
      })
      setPasswordSuccess(true)
      setPasswordForm({ oldPassword: '', newPassword: '', confirmPassword: '' })
      setTimeout(() => {
        setShowPasswordForm(false)
        setPasswordSuccess(false)
      }, 2000)
    } catch (err) {
      const msg = err instanceof Error ? err.message : t('settings.passwordChangeFailed')
      setPasswordError(msg)
    } finally {
      setPasswordLoading(false)
    }
  }

  const handleRedeemInvite = async () => {
    if (!inviteCode.trim() || !user) return
    setInviteLoading(true)
    setInviteError(null)
    setInviteSuccess(false)
    try {
      const membership = await fetchApi<NonNullable<typeof user>['membership']>(
        '/api/membership/redeem-invite',
        {
          method: 'POST',
          body: JSON.stringify({ code: inviteCode.trim() }),
        },
      )
      if (membership) setUser({ ...user, membership })
      setInviteCode('')
      setInviteSuccess(true)
    } catch (err) {
      setInviteError(err instanceof Error ? err.message : t('settings.membershipRedeemFailed'))
    } finally {
      setInviteLoading(false)
    }
  }

  if (!user) return null

  const membership = user.membership
  const tierKey = membership?.status ?? 'visitor'
  const tierLabel = t(`settings.membershipTiers.${tierKey}`, membership?.tier?.label ?? tierKey)
  const capabilityLabels =
    membership?.capabilities.map((capability) => {
      const capabilityKey = capability.replace(/[:.]/g, '_')
      return t(`settings.membershipCapabilityLabels.${capabilityKey}`, capability)
    }) ?? []

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <SettingsHeader title={t('settings.tabAccount')} />
      <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.content}>
        <Text style={[styles.groupTitle, { color: colors.textMuted }]}>
          {t('settings.tabAccount').toUpperCase()}
        </Text>
        <View style={[styles.card, { backgroundColor: colors.surface }]}>
          <View style={[styles.row, { borderBottomColor: colors.border }]}>
            <Text style={[styles.label, { color: colors.textMuted }]}>
              {t('settings.emailLabel')}
            </Text>
            <Text style={{ color: colors.text, fontSize: fontSize.sm }}>{user.email}</Text>
          </View>
          <View style={[styles.row, { borderBottomColor: colors.border }]}>
            <Text style={[styles.label, { color: colors.textMuted }]}>
              {t('settings.usernameLabel')}
            </Text>
            <Text style={{ color: colors.text, fontSize: fontSize.sm }}>@{user.username}</Text>
          </View>
          <View style={[styles.row, { borderBottomColor: colors.border }]}>
            <Text style={[styles.label, { color: colors.textMuted }]}>
              {t('settings.membershipStatusLabel')}
            </Text>
            <Text style={{ color: membership?.isMember ? colors.success : colors.textMuted }}>
              {`${tierLabel} · ${t('settings.membershipLevelLabel', { level: membership?.level ?? 0 })}`}
            </Text>
          </View>
          <View style={[styles.row, { borderBottomColor: colors.border }]}>
            <Text style={[styles.label, { color: colors.textMuted }]}>
              {t('settings.membershipCapabilitiesLabel')}
            </Text>
            <Text
              style={{
                color: colors.textMuted,
                fontSize: fontSize.xs,
                flex: 1,
                textAlign: 'right',
              }}
            >
              {capabilityLabels.length
                ? capabilityLabels.join(', ')
                : t('settings.membershipNoCapabilities')}
            </Text>
          </View>
          <View style={[styles.row, { borderBottomWidth: 0 }]}>
            <Text style={[styles.label, { color: colors.textMuted }]}>
              {t('settings.userIdLabel')}
            </Text>
            <Text style={{ color: colors.textMuted, fontSize: 10, fontFamily: 'monospace' }}>
              {user.id}
            </Text>
          </View>
        </View>

        {!membership?.isMember ? (
          <View style={[styles.card, { backgroundColor: colors.surface }]}>
            <Text style={[styles.label, { color: colors.text, marginBottom: spacing.sm }]}>
              {t('settings.membershipRedeemTitle')}
            </Text>
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: colors.background,
                  borderColor: colors.border,
                  color: colors.text,
                },
              ]}
              value={inviteCode}
              onChangeText={setInviteCode}
              placeholder={t('settings.membershipRedeemPlaceholder')}
              placeholderTextColor={colors.textMuted}
              autoCapitalize="characters"
              editable={!inviteLoading}
            />
            {inviteError ? (
              <Text style={{ color: colors.error, fontSize: fontSize.xs }}>{inviteError}</Text>
            ) : inviteSuccess ? (
              <Text style={{ color: colors.success, fontSize: fontSize.xs }}>
                {t('settings.membershipRedeemedSuccess')}
              </Text>
            ) : (
              <Text style={{ color: colors.textMuted, fontSize: fontSize.xs }}>
                {t('settings.membershipVisitorHint')}
              </Text>
            )}
            <TouchableOpacity
              style={[
                styles.actionButton,
                {
                  backgroundColor: colors.primary,
                  opacity: inviteLoading || !inviteCode.trim() ? 0.6 : 1,
                },
              ]}
              onPress={handleRedeemInvite}
              disabled={inviteLoading || !inviteCode.trim()}
            >
              <Text style={styles.actionButtonText}>{t('settings.membershipRedeemAction')}</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        {/* Change Password Section */}
        <Text style={[styles.groupTitle, { color: colors.textMuted }]}>
          {t('settings.security').toUpperCase()}
        </Text>
        <View style={[styles.card, { backgroundColor: colors.surface }]}>
          {!showPasswordForm ? (
            <TouchableOpacity
              style={[styles.row, { borderBottomWidth: 0 }]}
              onPress={() => setShowPasswordForm(true)}
            >
              <Text style={[styles.label, { color: colors.textMuted }]}>
                {t('settings.changePassword')}
              </Text>
              <Text style={{ color: colors.primary, fontSize: fontSize.sm }}>
                {t('settings.tapToChange')}
              </Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.passwordForm}>
              <Text style={[styles.label, { color: colors.text, marginBottom: spacing.sm }]}>
                {t('settings.changePasswordTitle')}
              </Text>

              {passwordSuccess && (
                <View
                  style={[
                    styles.messageBox,
                    { backgroundColor: `${colors.success}20`, borderColor: colors.success },
                  ]}
                >
                  <Text style={{ color: colors.success, fontSize: fontSize.sm }}>
                    {t('settings.passwordChangedSuccess')}
                  </Text>
                </View>
              )}

              {passwordError && (
                <View
                  style={[
                    styles.messageBox,
                    { backgroundColor: `${colors.error}20`, borderColor: colors.error },
                  ]}
                >
                  <Text style={{ color: colors.error, fontSize: fontSize.sm }}>
                    {passwordError}
                  </Text>
                </View>
              )}

              <TextInput
                style={[
                  styles.input,
                  { backgroundColor: colors.background, borderColor: colors.border },
                ]}
                placeholder={t('settings.oldPasswordPlaceholder')}
                placeholderTextColor={colors.textMuted}
                secureTextEntry
                value={passwordForm.oldPassword}
                onChangeText={(text) => setPasswordForm({ ...passwordForm, oldPassword: text })}
                editable={!passwordLoading}
              />

              <TextInput
                style={[
                  styles.input,
                  { backgroundColor: colors.background, borderColor: colors.border },
                ]}
                placeholder={t('settings.newPasswordPlaceholder')}
                placeholderTextColor={colors.textMuted}
                secureTextEntry
                value={passwordForm.newPassword}
                onChangeText={(text) => setPasswordForm({ ...passwordForm, newPassword: text })}
                editable={!passwordLoading}
              />

              <TextInput
                style={[
                  styles.input,
                  { backgroundColor: colors.background, borderColor: colors.border },
                ]}
                placeholder={t('settings.confirmPasswordPlaceholder')}
                placeholderTextColor={colors.textMuted}
                secureTextEntry
                value={passwordForm.confirmPassword}
                onChangeText={(text) => setPasswordForm({ ...passwordForm, confirmPassword: text })}
                editable={!passwordLoading}
              />

              <View style={styles.buttonRow}>
                <TouchableOpacity
                  style={[styles.button, styles.cancelButton, { borderColor: colors.border }]}
                  onPress={() => {
                    setShowPasswordForm(false)
                    setPasswordForm({ oldPassword: '', newPassword: '', confirmPassword: '' })
                    setPasswordError(null)
                  }}
                  disabled={passwordLoading}
                >
                  <Text style={{ color: colors.textMuted }}>{t('common.cancel')}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.button, styles.submitButton, { backgroundColor: colors.primary }]}
                  onPress={handleChangePassword}
                  disabled={passwordLoading}
                >
                  <Text style={{ color: '#fff', fontWeight: 'bold' }}>
                    {passwordLoading ? t('settings.changingPassword') : t('settings.submit')}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingBottom: spacing.xl * 2 },
  groupTitle: {
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
    paddingBottom: spacing.sm,
  },
  card: { marginHorizontal: spacing.md, borderRadius: radius.xl, overflow: 'hidden' },
  row: {
    paddingHorizontal: spacing.lg,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  label: {
    fontSize: fontSize.xs,
    fontWeight: '700',
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  passwordForm: {
    padding: spacing.lg,
  },
  input: {
    borderWidth: 1,
    borderRadius: radius.md,
    padding: 12,
    marginBottom: spacing.sm,
    fontSize: fontSize.sm,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  button: {
    paddingHorizontal: spacing.lg,
    paddingVertical: 10,
    borderRadius: radius.md,
  },
  actionButton: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.md,
    paddingVertical: 12,
    marginTop: spacing.sm,
  },
  actionButtonText: {
    color: '#fff',
    fontSize: fontSize.sm,
    fontWeight: '700',
  },
  cancelButton: {
    borderWidth: 1,
  },
  submitButton: {},
  messageBox: {
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing.sm,
    marginBottom: spacing.sm,
  },
})
