import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'expo-router'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native'
import { fetchApi } from '../../src/lib/api'
import { showToast } from '../../src/lib/toast'
import { fontSize, radius, spacing, useColors } from '../../src/theme'

export default function CreateServerScreen() {
  const { t } = useTranslation()
  const colors = useColors()
  const router = useRouter()
  const queryClient = useQueryClient()

  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [isPublic, setIsPublic] = useState(true)

  const createMutation = useMutation({
    mutationFn: () =>
      fetchApi<{ id: string; slug: string | null }>('/api/servers', {
        method: 'POST',
        body: JSON.stringify({ name, description: description || undefined, isPublic }),
      }),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['servers'] })
      router.replace(`/(main)/servers/${data.slug ?? data.id}`)
    },
    onError: (err: Error) => showToast(err.message, 'error'),
  })

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.background }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={[styles.title, { color: colors.text }]}>{t('server.createTitle')}</Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          {t('server.createSubtitle')}
        </Text>

        <Text style={[styles.label, { color: colors.textSecondary }]}>{t('server.nameLabel')}</Text>
        <TextInput
          style={[
            styles.input,
            {
              backgroundColor: colors.inputBackground,
              color: colors.text,
              borderColor: colors.border,
            },
          ]}
          value={name}
          onChangeText={setName}
          placeholder={t('server.namePlaceholder')}
          placeholderTextColor={colors.textMuted}
          autoFocus
        />

        <Text style={[styles.label, { color: colors.textSecondary }]}>
          {t('server.descriptionLabel')}
        </Text>
        <TextInput
          style={[
            styles.input,
            styles.textArea,
            {
              backgroundColor: colors.inputBackground,
              color: colors.text,
              borderColor: colors.border,
            },
          ]}
          value={description}
          onChangeText={setDescription}
          placeholder={t('server.descriptionPlaceholder')}
          placeholderTextColor={colors.textMuted}
          multiline
          numberOfLines={3}
        />

        <View style={styles.switchRow}>
          <View style={{ flex: 1 }}>
            <Text style={{ color: colors.text, fontWeight: '600' }}>
              {t('server.publicServer')}
            </Text>
            <Text style={{ color: colors.textMuted, fontSize: fontSize.xs }}>
              {t('server.publicServerDesc')}
            </Text>
          </View>
          <Switch
            value={isPublic}
            onValueChange={setIsPublic}
            trackColor={{ true: colors.primary }}
          />
        </View>

        <Pressable
          style={[
            styles.createBtn,
            {
              backgroundColor: colors.primary,
              opacity: !name.trim() || createMutation.isPending ? 0.6 : 1,
            },
          ]}
          onPress={() => createMutation.mutate()}
          disabled={!name.trim() || createMutation.isPending}
        >
          <Text style={styles.createBtnText}>
            {createMutation.isPending ? t('common.loading') : t('server.create')}
          </Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  content: { padding: spacing.xl },
  title: { fontSize: fontSize['2xl'], fontWeight: '800', marginBottom: spacing.xs },
  subtitle: { fontSize: fontSize.md, marginBottom: spacing.xl },
  label: {
    fontSize: fontSize.xs,
    fontWeight: '700',
    textTransform: 'uppercase',
    marginBottom: spacing.sm,
    marginTop: spacing.lg,
  },
  input: {
    height: 48,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.lg,
    fontSize: fontSize.md,
    borderWidth: 1,
  },
  textArea: { height: 100, paddingTop: spacing.md, textAlignVertical: 'top' },
  switchRow: { flexDirection: 'row', alignItems: 'center', marginTop: spacing.xl, gap: spacing.md },
  createBtn: {
    height: 48,
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing['2xl'],
  },
  createBtnText: { color: '#fff', fontSize: fontSize.lg, fontWeight: '700' },
})
