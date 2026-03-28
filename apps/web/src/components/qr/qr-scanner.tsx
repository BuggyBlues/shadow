import { useMutation } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { Scan, Upload, X } from 'lucide-react'
import { useCallback, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { fetchApi } from '../../lib/api'

interface QRScannerProps {
  onClose: () => void
}

interface ScanResult {
  type: 'server' | 'channel' | 'user'
  code: string
  server?: {
    id: string
    name: string
    iconUrl: string | null
    bannerUrl: string | null
  }
  channel?: {
    id: string
    name: string
  }
  createdBy?: {
    id: string
    username: string
    displayName: string
    avatarUrl: string | null
  }
}

export function QRScanner({ onClose }: QRScannerProps) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [scanResult, setScanResult] = useState<ScanResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isDragging, setIsDragging] = useState(false)

  const acceptMutation = useMutation({
    mutationFn: (code: string) =>
      fetchApi<{
        success: boolean
        type: string
        serverId?: string
        channelId?: string
        userId?: string
      }>(`/api/invites/${code}/accept`, { method: 'POST' }),
    onSuccess: (data) => {
      onClose()
      if (data.type === 'server' && data.serverId) {
        navigate({ to: '/servers/$serverId', params: { serverId: data.serverId } })
      } else if (data.type === 'channel' && data.channelId) {
        navigate({
          to: '/servers/$serverId/channels/$channelId',
          params: { serverId: data.serverId!, channelId: data.channelId },
        })
      } else if (data.type === 'user' && data.userId) {
        navigate({ to: '/friends' })
      }
    },
    onError: (err: unknown) => {
      const status = (err as { status?: number })?.status
      if (status === 409) {
        setError(t('qr.alreadyMember'))
      } else {
        setError(t('qr.acceptFailed'))
      }
    },
  })

  const handleFileUpload = useCallback(
    async (file: File) => {
      setError(null)
      setScanResult(null)

      if (!file.type.startsWith('image/')) {
        setError(t('qr.invalidImage'))
        return
      }

      try {
        const imageBitmap = await createImageBitmap(file)
        const canvas = document.createElement('canvas')
        canvas.width = imageBitmap.width
        canvas.height = imageBitmap.height
        const ctx = canvas.getContext('2d')
        if (!ctx) {
          setError(t('qr.decodeFailed'))
          return
        }
        ctx.drawImage(imageBitmap, 0, 0)
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)

        const jsQR = (await import('jsqr')).default
        const code = jsQR(imageData.data, imageData.width, imageData.height)

        if (!code) {
          setError(t('qr.noQRFound'))
          return
        }

        const match = code.data.match(
          /^shadow:\/\/(user|server|channel)\/([^?]+)(?:\?invite=(.+))?$/,
        )
        if (!match) {
          setError(t('qr.invalidQRCode'))
          return
        }

        const [, type, entityId, inviteCode] = match

        if (inviteCode) {
          const invite = await fetchApi<ScanResult>(`/api/invites/${inviteCode}`)
          setScanResult(invite)
        } else {
          if (type === 'server') {
            navigate({ to: '/servers/$serverId', params: { serverId: entityId } })
            onClose()
          } else if (type === 'channel') {
            navigate({
              to: '/servers/$serverId/channels/$channelId',
              params: { serverId: entityId, channelId: entityId },
            })
            onClose()
          } else if (type === 'user') {
            setScanResult({
              type: 'user',
              code: inviteCode || entityId,
              createdBy: {
                id: entityId,
                username: '',
                displayName: t('qr.unknownUser'),
                avatarUrl: null,
              },
            })
          }
        }
      } catch {
        setError(t('qr.decodeFailed'))
      }
    },
    [navigate, onClose, t],
  )

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setIsDragging(false)
      const file = e.dataTransfer.files[0]
      if (file) handleFileUpload(file)
    },
    [handleFileUpload],
  )

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback(() => setIsDragging(false), [])

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (file) handleFileUpload(file)
    },
    [handleFileUpload],
  )

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
      <div className="relative w-full max-w-md bg-bg-primary rounded-lg shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-bg-modifier-accent">
          <div className="flex items-center gap-2">
            <Scan className="w-5 h-5 text-[#5865F2]" />
            <h2 className="text-lg font-semibold text-text-primary">{t('qr.scanTitle')}</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-text-muted hover:text-text-primary transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6">
          {!scanResult ? (
            <>
              <div
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                className={`relative border-2 border-dashed rounded-lg p-8 text-center transition ${
                  isDragging
                    ? 'border-[#5865F2] bg-[#5865F2]/10'
                    : 'border-bg-modifier-accent hover:border-text-muted'
                }`}
              >
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileInput}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
                <Upload className="w-12 h-12 mx-auto mb-4 text-text-muted" />
                <p className="text-text-secondary mb-2">{t('qr.dragDropImage')}</p>
                <p className="text-text-muted text-sm">{t('qr.orClickToUpload')}</p>
              </div>
              {error && (
                <div className="mt-4 p-3 bg-[#f23f43]/10 border border-[#f23f43]/30 rounded-lg">
                  <p className="text-[#f23f43] text-sm">{error}</p>
                </div>
              )}
            </>
          ) : (
            <div className="text-center">
              <div className="mb-6">
                {scanResult.type === 'server' && scanResult.server && (
                  <>
                    {scanResult.server.bannerUrl && (
                      <div
                        className="w-full h-24 rounded-lg mb-3 bg-cover bg-center"
                        style={{ backgroundImage: `url(${scanResult.server.bannerUrl})` }}
                      />
                    )}
                    <div className="w-16 h-16 mx-auto rounded-2xl bg-[#5865F2]/20 flex items-center justify-center text-2xl font-bold text-[#5865F2] mb-3 overflow-hidden">
                      {scanResult.server.iconUrl ? (
                        <img
                          src={scanResult.server.iconUrl}
                          alt={scanResult.server.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        scanResult.server.name.charAt(0).toUpperCase()
                      )}
                    </div>
                    <h3 className="text-lg font-bold text-text-primary">
                      {scanResult.server.name}
                    </h3>
                    <p className="text-text-secondary text-sm">{t('qr.serverInvite')}</p>
                  </>
                )}
                {scanResult.type === 'user' && scanResult.createdBy && (
                  <>
                    <div className="w-16 h-16 mx-auto rounded-full bg-[#5865F2]/20 flex items-center justify-center text-2xl font-bold text-[#5865F2] mb-3 overflow-hidden">
                      {scanResult.createdBy.avatarUrl ? (
                        <img
                          src={scanResult.createdBy.avatarUrl}
                          alt={scanResult.createdBy.displayName}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        scanResult.createdBy.displayName.charAt(0).toUpperCase()
                      )}
                    </div>
                    <h3 className="text-lg font-bold text-text-primary">
                      {scanResult.createdBy.displayName}
                    </h3>
                    <p className="text-text-secondary text-sm">@{scanResult.createdBy.username}</p>
                    <p className="text-text-muted text-sm mt-2">{t('qr.userInvite')}</p>
                  </>
                )}
              </div>
              <button
                type="button"
                onClick={() => acceptMutation.mutate(scanResult.code)}
                disabled={acceptMutation.isPending}
                className="w-full px-4 py-3 bg-[#5865F2] hover:bg-[#4752C4] text-white rounded-lg transition font-bold disabled:opacity-50"
              >
                {acceptMutation.isPending ? t('common.loading') : t('qr.acceptInvite')}
              </button>
              <button
                type="button"
                onClick={() => setScanResult(null)}
                className="w-full mt-2 px-4 py-2 text-text-muted hover:text-text-primary transition"
              >
                {t('common.cancel')}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
