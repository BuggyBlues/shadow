import { useMutation, useQuery } from '@tanstack/react-query'
import * as FileSystem from 'expo-file-system'
import * as MediaLibrary from 'expo-media-library'
import * as Sharing from 'expo-sharing'
import { Download, QrCode, RefreshCw, Share2, X } from 'lucide-react-native'
import React, { useCallback, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native'
import QRCode from 'react-native-qrcode-svg'
import { fetchApi } from '../../lib/api'
import { useColors } from '../../theme'
import { Avatar } from '../common/avatar'

interface QRPosterProps {
  visible: boolean
  onClose: () => void
  type: 'user' | 'buddy' | 'server' | 'channel'
  entityId: string
  entityName: string
  entityAvatar?: string | null
  entityBanner?: string | null
  entityDescription?: string | null
}

interface InviteInfo {
  code: string
  expiresAt: string | null
}

export function QRPoster({
  visible,
  onClose,
  type,
  entityId,
  entityName,
  entityAvatar,
  entityBanner,
  entityDescription,
}: QRPosterProps) {
  const { t } = useTranslation()
  const colors = useColors()
  const [hasPermission, setHasPermission] = useState(false)
  const qrRef = useRef<any>(null)

  // Request media library permission
  useEffect(() => {
    MediaLibrary.requestPermissionsAsync().then(({ status }) => {
      setHasPermission(status === 'granted')
    })
  }, [])

  // Fetch or create invite code
  const { data: invite, refetch: refetchInvite } = useQuery<InviteInfo>({
    queryKey: ['invite', type, entityId],
    queryFn: async () => {
      if (type === 'user') {
        const codes = await fetchApi<Array<{ code: string }>>('/api/invites')
        if (codes.length > 0) return { code: codes[0].code, expiresAt: null }
        const newCode = await fetchApi<{ code: string }>('/api/invites', {
          method: 'POST',
          body: JSON.stringify({ count: 1 }),
        })
        return { code: newCode.code, expiresAt: null }
      } else if (type === 'server') {
        const newCode = await fetchApi<{ code: string; expiresAt: string | null }>(
          `/api/invites/servers/${entityId}`,
          { method: 'POST', body: JSON.stringify({}) },
        )
        return newCode
      } else if (type === 'channel') {
        const newCode = await fetchApi<{ code: string; expiresAt: string | null }>(
          `/api/invites/channels/${entityId}`,
          { method: 'POST', body: JSON.stringify({}) },
        )
        return newCode
      }
      return { code: '', expiresAt: null }
    },
    enabled: visible,
  })

  // Reset invite mutation
  const resetMutation = useMutation({
    mutationFn: async () => {
      if (type === 'user') {
        await fetchApi('/api/invites/reset', { method: 'POST' })
      } else if (type === 'server') {
        await fetchApi(`/api/invites/servers/${entityId}/reset`, { method: 'POST' })
      } else if (type === 'channel') {
        await fetchApi(`/api/invites/channels/${entityId}/reset`, { method: 'POST' })
      }
    },
    onSuccess: () => refetchInvite(),
  })

  // Generate QR data
  const qrData = invite?.code
    ? `shadow://${type}/${entityId}?invite=${invite.code}`
    : `shadow://${type}/${entityId}`

  const handleDownload = useCallback(async () => {
    if (!hasPermission) {
      Alert.alert(t('qr.permissionDenied'), t('qr.mediaLibraryPermission'))
      return
    }

    try {
      // Get QR code as base64
      if (qrRef.current) {
        qrRef.current.toDataURL(async (base64: string) => {
          const fileUri = FileSystem.cacheDirectory + `qr-poster-${entityId}.png`
          await FileSystem.writeAsStringAsync(fileUri, base64, {
            encoding: FileSystem.EncodingType.Base64,
          })
          await MediaLibrary.saveToLibraryAsync(fileUri)
          Alert.alert(t('qr.saved'), t('qr.savedToGallery'))
        })
      }
    } catch (error) {
      Alert.alert(t('qr.saveError'), t('qr.saveErrorDesc'))
    }
  }, [hasPermission, entityId, t])

  const handleShare = useCallback(async () => {
    try {
      if (qrRef.current) {
        qrRef.current.toDataURL(async (base64: string) => {
          const fileUri = FileSystem.cacheDirectory + `qr-poster-${entityId}.png`
          await FileSystem.writeAsStringAsync(fileUri, base64, {
            encoding: FileSystem.EncodingType.Base64,
          })
          await Sharing.shareAsync(fileUri, {
            mimeType: 'image/png',
            dialogTitle: t('qr.shareTitle'),
          })
        })
      }
    } catch (error) {
      Alert.alert(t('qr.shareError'), t('qr.shareErrorDesc'))
    }
  }, [entityId, t])

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <QrCode size={24} color={colors.primary} />
            <Text style={[styles.title, { color: colors.text }]}>{t('qr.posterTitle')}</Text>
          </View>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <X size={24} color={colors.text} />
          </TouchableOpacity>
        </View>

        {/* Poster Content */}
        <View style={styles.content}>
          {invite?.code ? (
            <View style={[styles.posterCard, { backgroundColor: colors.card }]}>
              {/* Banner for server */}
              {type === 'server' && entityBanner && (
                <Image source={{ uri: entityBanner }} style={styles.banner} />
              )}

              {/* Avatar */}
              <View style={styles.avatarContainer}>
                <Avatar uri={entityAvatar} name={entityName} size={80} />
              </View>

              {/* Name */}
              <Text style={[styles.entityName, { color: colors.text }]}>{entityName}</Text>

              {/* Description */}
              {entityDescription && (
                <Text style={[styles.description, { color: colors.textSecondary }]}>
                  {entityDescription}
                </Text>
              )}

              {/* QR Code */}
              <View style={styles.qrContainer}>
                <QRCode
                  value={qrData}
                  size={200}
                  getRef={(ref) => (qrRef.current = ref)}
                  backgroundColor="white"
                  color="black"
                />
              </View>

              {/* Shadow Logo */}
              <Text style={[styles.logo, { color: colors.primary }]}>SHADOW</Text>
              <Text style={[styles.hint, { color: colors.textMuted }]}>
                {t('qr.scanToConnect')}
              </Text>

              {/* Expiration */}
              {invite?.expiresAt && (
                <Text style={[styles.expiresAt, { color: colors.textMuted }]}>
                  {t('qr.expiresAt')}: {new Date(invite.expiresAt).toLocaleString()}
                </Text>
              )}
            </View>
          ) : (
            <ActivityIndicator size="large" color={colors.primary} />
          )}
        </View>

        {/* Actions */}
        <View style={styles.actions}>
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: colors.card }]}
            onPress={handleDownload}
          >
            <Download size={24} color={colors.text} />
            <Text style={[styles.actionText, { color: colors.text }]}>{t('qr.download')}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: colors.card }]}
            onPress={handleShare}
          >
            <Share2 size={24} color={colors.text} />
            <Text style={[styles.actionText, { color: colors.text }]}>{t('qr.share')}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: colors.card }]}
            onPress={() => resetMutation.mutate()}
            disabled={resetMutation.isPending}
          >
            <RefreshCw
              size={24}
              color={colors.text}
              style={resetMutation.isPending ? { opacity: 0.5 } : undefined}
            />
            <Text style={[styles.actionText, { color: colors.text }]}>{t('qr.reset')}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 60,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
  },
  closeButton: {
    padding: 8,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  posterCard: {
    width: '100%',
    maxWidth: 360,
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
  },
  banner: {
    width: '100%',
    height: 100,
    borderRadius: 8,
    marginBottom: 16,
  },
  avatarContainer: {
    marginBottom: 12,
  },
  entityName: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 8,
  },
  description: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 16,
  },
  qrContainer: {
    padding: 16,
    backgroundColor: 'white',
    borderRadius: 12,
    marginBottom: 16,
  },
  logo: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4,
  },
  hint: {
    fontSize: 12,
    marginBottom: 8,
  },
  expiresAt: {
    fontSize: 12,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 16,
    paddingBottom: 40,
    paddingTop: 20,
  },
  actionButton: {
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    minWidth: 80,
  },
  actionText: {
    fontSize: 12,
    marginTop: 8,
  },
})
