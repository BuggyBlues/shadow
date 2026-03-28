import { type BarcodeScanningResult, CameraView, useCameraPermissions } from 'expo-camera'
import { useRouter } from 'expo-router'
import { Scan, X } from 'lucide-react-native'
import React, { useCallback, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Alert, Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { fetchApi } from '../../lib/api'
import { useColors } from '../../theme'

interface QRScannerProps {
  visible: boolean
  onClose: () => void
}

export function QRScanner({ visible, onClose }: QRScannerProps) {
  const { t } = useTranslation()
  const router = useRouter()
  const colors = useColors()
  const [permission, requestPermission] = useCameraPermissions()
  const [scanned, setScanned] = useState(false)

  const handleBarCodeScanned = useCallback(
    async (result: BarcodeScanningResult) => {
      if (scanned) return
      setScanned(true)

      const { data } = result

      // Parse shadow:// URI
      const match = data.match(/^shadow:\/\/(user|server|channel)\/([^?]+)(?:\?invite=(.+))?$/)
      if (!match) {
        Alert.alert(t('qr.invalidQRCode'), t('qr.invalidQRCodeDesc'))
        setScanned(false)
        return
      }

      const [, type, entityId, inviteCode] = match

      try {
        if (inviteCode) {
          // Fetch invite info
          const invite: any = await fetchApi(`/api/invites/${inviteCode}`)

          // Show confirmation dialog
          Alert.alert(
            t('qr.acceptInvite'),
            `${t('qr.inviteTo')} ${invite?.server?.name || invite?.channel?.name || invite?.createdBy?.displayName || ''}`,
            [
              { text: t('common.cancel'), style: 'cancel', onPress: () => setScanned(false) },
              {
                text: t('qr.accept'),
                onPress: async () => {
                  const result: any = await fetchApi(`/api/invites/${inviteCode}/accept`, {
                    method: 'POST',
                  })
                  if (result?.success) {
                    onClose()
                    if (result?.type === 'server' && result?.serverId) {
                      router.push(`/server/${result.serverId}`)
                    } else if (result?.type === 'channel' && result?.channelId) {
                      router.push(`/server/${result.serverId}/channel/${result.channelId}`)
                    } else if (result?.type === 'user') {
                      Alert.alert(t('qr.friendRequestSent'), t('qr.friendRequestSentDesc'))
                    }
                  }
                },
              },
            ],
          )
        } else {
          // Direct entity link
          onClose()
          if (type === 'server') {
            router.push(`/server/${entityId}`)
          } else if (type === 'channel') {
            router.push(`/channel/${entityId}`)
          } else if (type === 'user') {
            router.push(`/profile/${entityId}`)
          }
        }
      } catch (error) {
        Alert.alert(t('qr.scanError'), t('qr.scanErrorDesc'))
        setScanned(false)
      }
    },
    [scanned, t, router, onClose],
  )

  if (!permission?.granted) {
    return (
      <Modal visible={visible} transparent animationType="fade">
        <View style={[styles.container, { backgroundColor: colors.background }]}>
          <View style={styles.header}>
            <Text style={[styles.title, { color: colors.text }]}>{t('qr.scanTitle')}</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <X size={24} color={colors.text} />
            </TouchableOpacity>
          </View>
          <View style={styles.permissionContainer}>
            <Scan size={64} color={colors.primary} />
            <Text style={[styles.permissionText, { color: colors.text }]}>
              {t('qr.cameraPermission')}
            </Text>
            <TouchableOpacity
              style={[styles.permissionButton, { backgroundColor: colors.primary }]}
              onPress={requestPermission}
            >
              <Text style={styles.permissionButtonText}>{t('qr.grantPermission')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    )
  }

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.container}>
        <CameraView
          style={styles.camera}
          facing="back"
          barcodeScannerSettings={{
            barcodeTypes: ['qr'],
          }}
          onBarcodeScanned={handleBarCodeScanned}
        >
          <View style={styles.overlay}>
            <View style={styles.header}>
              <Text style={styles.title}>{t('qr.scanTitle')}</Text>
              <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                <X size={24} color="#fff" />
              </TouchableOpacity>
            </View>

            <View style={styles.scanArea}>
              <View style={styles.scanFrame} />
              <Text style={styles.scanText}>{t('qr.alignQRCode')}</Text>
            </View>

            <View style={styles.footer}>
              <Text style={styles.footerText}>{t('qr.scanHint')}</Text>
            </View>
          </View>
        </CameraView>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  camera: {
    flex: 1,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 60,
    paddingBottom: 20,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
  },
  closeButton: {
    padding: 8,
  },
  scanArea: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scanFrame: {
    width: 250,
    height: 250,
    borderWidth: 2,
    borderColor: '#5865F2',
    borderRadius: 16,
    backgroundColor: 'transparent',
  },
  scanText: {
    marginTop: 20,
    fontSize: 16,
    color: '#fff',
    textAlign: 'center',
  },
  footer: {
    paddingHorizontal: 16,
    paddingBottom: 40,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.7)',
    textAlign: 'center',
  },
  permissionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  permissionText: {
    fontSize: 16,
    textAlign: 'center',
    marginTop: 20,
    marginBottom: 24,
  },
  permissionButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  permissionButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
})
