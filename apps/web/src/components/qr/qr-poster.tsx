import { useMutation, useQuery } from '@tanstack/react-query'
import { Download, QrCode, RefreshCw, Share2, X } from 'lucide-react'
import QRCode from 'qrcode'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { fetchApi } from '../../lib/api'

interface QRPosterProps {
  type: 'user' | 'buddy' | 'server' | 'channel'
  entityId: string
  entityName: string
  entityAvatar?: string | null
  entityBanner?: string | null
  entityDescription?: string | null
  onClose: () => void
}

interface InviteInfo {
  code: string
  expiresAt: string | null
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = src
  })
}

export function QRPoster({
  type,
  entityId,
  entityName,
  entityAvatar,
  entityBanner,
  entityDescription,
  onClose,
}: QRPosterProps) {
  const { t } = useTranslation()
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [posterUrl, setPosterUrl] = useState<string>('')

  const { data: invite, refetch: refetchInvite } = useQuery<InviteInfo>({
    queryKey: ['invite', type, entityId],
    queryFn: async () => {
      if (type === 'user') {
        const codes = await fetchApi<Array<{ code: string }>>('/api/invites')
        if (codes.length > 0) return { code: codes[0].code, expiresAt: null }
        const newCode = await fetchApi<{ code: string }>('/api/invites', { method: 'POST' })
        return { code: newCode.code, expiresAt: null }
      } else if (type === 'server') {
        const newCode = await fetchApi<{ code: string; expiresAt: string | null }>(
          `/api/invites/servers/${entityId}`,
          {
            method: 'POST',
            body: JSON.stringify({}),
          },
        )
        return newCode
      } else if (type === 'channel') {
        const newCode = await fetchApi<{ code: string; expiresAt: string | null }>(
          `/api/invites/channels/${entityId}`,
          {
            method: 'POST',
            body: JSON.stringify({}),
          },
        )
        return newCode
      }
      return { code: '', expiresAt: null }
    },
  })

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

  const generatePoster = useCallback(async () => {
    if (!invite?.code || !canvasRef.current) return

    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const width = 1080
    const height = 1920
    canvas.width = width
    canvas.height = height

    ctx.fillStyle = '#FFFFFF'
    ctx.fillRect(0, 0, width, height)

    let contentStartY = 200
    if (type === 'server' && entityBanner) {
      try {
        const bannerImg = await loadImage(entityBanner)
        const bannerHeight = 400
        ctx.drawImage(bannerImg, 0, 0, width, bannerHeight)
        contentStartY = bannerHeight + 100
      } catch {
        // Banner failed to load
      }
    }

    const avatarSize = 200
    const avatarX = (width - avatarSize) / 2
    const avatarY = contentStartY

    ctx.beginPath()
    ctx.arc(avatarX + avatarSize / 2, avatarY + avatarSize / 2, avatarSize / 2, 0, Math.PI * 2)
    ctx.fillStyle = '#5865F2'
    ctx.fill()

    if (entityAvatar) {
      try {
        const avatarImg = await loadImage(entityAvatar)
        ctx.save()
        ctx.beginPath()
        ctx.arc(
          avatarX + avatarSize / 2,
          avatarY + avatarSize / 2,
          avatarSize / 2 - 4,
          0,
          Math.PI * 2,
        )
        ctx.clip()
        ctx.drawImage(avatarImg, avatarX + 4, avatarY + 4, avatarSize - 8, avatarSize - 8)
        ctx.restore()
      } catch {
        ctx.fillStyle = '#FFFFFF'
        ctx.font = 'bold 80px sans-serif'
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText(
          entityName.charAt(0).toUpperCase(),
          avatarX + avatarSize / 2,
          avatarY + avatarSize / 2,
        )
      }
    } else {
      ctx.fillStyle = '#FFFFFF'
      ctx.font = 'bold 80px sans-serif'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(
        entityName.charAt(0).toUpperCase(),
        avatarX + avatarSize / 2,
        avatarY + avatarSize / 2,
      )
    }

    ctx.fillStyle = '#1A1A1A'
    ctx.font = 'bold 56px sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText(entityName, width / 2, avatarY + avatarSize + 80)

    if (entityDescription) {
      ctx.fillStyle = '#666666'
      ctx.font = '32px sans-serif'
      const maxWidth = 800
      const words = entityDescription.split('')
      let line = ''
      let lineY = avatarY + avatarSize + 160

      for (let i = 0; i < words.length && lineY < avatarY + avatarSize + 280; i++) {
        const testLine = line + words[i]
        const metrics = ctx.measureText(testLine)
        if (metrics.width > maxWidth && i > 0) {
          ctx.fillText(line, width / 2, lineY)
          line = words[i]
          lineY += 48
        } else {
          line = testLine
        }
      }
      ctx.fillText(line, width / 2, lineY)
    }

    const qrData = `shadow://${type}/${entityId}?invite=${invite.code}`
    const qrCanvas = document.createElement('canvas')
    await QRCode.toCanvas(qrCanvas, qrData, {
      width: 400,
      margin: 2,
      color: { dark: '#1A1A1A', light: '#FFFFFF' },
    })

    const qrX = (width - 400) / 2
    const qrY = avatarY + avatarSize + 320
    ctx.drawImage(qrCanvas, qrX, qrY)

    ctx.fillStyle = '#5865F2'
    ctx.font = 'bold 48px sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText('SHADOW', width / 2, height - 120)

    ctx.fillStyle = '#999999'
    ctx.font = '28px sans-serif'
    ctx.fillText('Scan to connect', width / 2, height - 60)

    setPosterUrl(canvas.toDataURL('image/png'))
  }, [invite, type, entityId, entityName, entityAvatar, entityBanner, entityDescription])

  useEffect(() => {
    if (invite?.code) {
      generatePoster()
    }
  }, [invite, generatePoster])

  const handleDownload = useCallback(() => {
    if (!posterUrl) return
    const link = document.createElement('a')
    link.download = `shadow-${type}-${entityId}.png`
    link.href = posterUrl
    link.click()
  }, [posterUrl, type, entityId])

  const handleShare = useCallback(async () => {
    if (!posterUrl || !invite?.code) return
    try {
      const response = await fetch(posterUrl)
      const blob = await response.blob()
      const file = new File([blob], `shadow-${type}-${entityId}.png`, { type: 'image/png' })

      if (navigator.share && navigator.canShare({ files: [file] })) {
        await navigator.share({
          title: `Join ${entityName} on Shadow`,
          text: `Scan this QR code to join ${entityName} on Shadow!`,
          files: [file],
        })
      } else {
        const link = `shadow://${type}/${entityId}?invite=${invite.code}`
        await navigator.clipboard.writeText(link)
        alert(t('qr.linkCopied'))
      }
    } catch {
      // Share cancelled or failed
    }
  }, [posterUrl, invite, type, entityId, entityName, t])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
      <div className="relative w-full max-w-md bg-bg-primary rounded-lg shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-bg-modifier-accent">
          <div className="flex items-center gap-2">
            <QrCode className="w-5 h-5 text-[#5865F2]" />
            <h2 className="text-lg font-semibold text-text-primary">{t('qr.posterTitle')}</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-text-muted hover:text-text-primary transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-auto p-6">
          {posterUrl ? (
            <div className="space-y-4">
              <div className="relative rounded-lg overflow-hidden shadow-lg">
                <img src={posterUrl} alt="QR Poster" className="w-full h-auto" />
              </div>

              {invite?.expiresAt && (
                <p className="text-center text-sm text-text-muted">
                  {t('qr.expiresAt')}: {new Date(invite.expiresAt).toLocaleString()}
                </p>
              )}

              <div className="grid grid-cols-3 gap-3">
                <button
                  type="button"
                  onClick={handleDownload}
                  className="flex flex-col items-center gap-2 p-3 bg-bg-secondary hover:bg-bg-modifier-hover rounded-lg transition"
                >
                  <Download className="w-5 h-5 text-text-primary" />
                  <span className="text-xs text-text-secondary">{t('qr.download')}</span>
                </button>
                <button
                  type="button"
                  onClick={handleShare}
                  className="flex flex-col items-center gap-2 p-3 bg-bg-secondary hover:bg-bg-modifier-hover rounded-lg transition"
                >
                  <Share2 className="w-5 h-5 text-text-primary" />
                  <span className="text-xs text-text-secondary">{t('qr.share')}</span>
                </button>
                <button
                  type="button"
                  onClick={() => resetMutation.mutate()}
                  disabled={resetMutation.isPending}
                  className="flex flex-col items-center gap-2 p-3 bg-bg-secondary hover:bg-bg-modifier-hover rounded-lg transition disabled:opacity-50"
                >
                  <RefreshCw
                    className={`w-5 h-5 text-text-primary ${resetMutation.isPending ? 'animate-spin' : ''}`}
                  />
                  <span className="text-xs text-text-secondary">{t('qr.reset')}</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#5865F2]" />
            </div>
          )}
        </div>

        <canvas ref={canvasRef} className="hidden" />
      </div>
    </div>
  )
}
