/* ─────────────────────────────────────────────────────────────────────────────
 *  Shadow OS — Quick Dial  (Radial Command Menu)
 *
 *  Right-click on canvas blank → a radial ring of glassmorphism icons,
 *  each representing a quick action (add entity, search, theme toggle, etc.)
 *
 *  Design: 6 options evenly spaced on a 80px radius circle.
 *  Glassmorphism pill per option, entrance animation: scale 0→1 + fade.
 * ───────────────────────────────────────────────────────────────────────────── */

import { cn } from '@shadowob/ui'
import { Copy, Palette, Plus, Search, Settings2, Zap } from 'lucide-react'
import { useCallback, useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { useWidgetEngine } from '../../../lib/widget-engine'

interface QuickDialProps {
  onAddWidget: () => void
}

export function QuickDial({ onAddWidget }: QuickDialProps) {
  const { t } = useTranslation()
  const { quickDialOpen, quickDialPosition, closeQuickDial, selectedWidgetId, cloneWidget } =
    useWidgetEngine()
  const ringRef = useRef<HTMLDivElement>(null)

  const actions = [
    {
      icon: Plus,
      label: t('widget.quickDialAdd', '添加'),
      color: 'text-primary',
      bg: 'bg-primary/10',
      action: () => {
        closeQuickDial()
        onAddWidget()
      },
    },
    {
      icon: Search,
      label: t('widget.quickDialSearch', '搜索'),
      color: 'text-accent',
      bg: 'bg-accent/10',
      action: () => closeQuickDial(),
    },
    {
      icon: Copy,
      label: t('widget.quickDialClone', '克隆'),
      color: 'text-info',
      bg: 'bg-info/10',
      action: () => {
        if (selectedWidgetId) cloneWidget(selectedWidgetId)
        closeQuickDial()
      },
    },
    {
      icon: Zap,
      label: t('widget.quickDialAI', 'AI'),
      color: 'text-warning',
      bg: 'bg-warning/10',
      action: () => closeQuickDial(),
    },
    {
      icon: Palette,
      label: t('widget.quickDialTheme', '主题'),
      color: 'text-success',
      bg: 'bg-success/10',
      action: () => closeQuickDial(),
    },
    {
      icon: Settings2,
      label: t('widget.quickDialSettings', '设置'),
      color: 'text-text-muted',
      bg: 'bg-white/[0.04]',
      action: () => closeQuickDial(),
    },
  ]

  // Close on click outside
  useEffect(() => {
    if (!quickDialOpen) return
    const handler = (e: MouseEvent) => {
      if (ringRef.current && !ringRef.current.contains(e.target as Node)) {
        closeQuickDial()
      }
    }
    window.addEventListener('pointerdown', handler)
    return () => window.removeEventListener('pointerdown', handler)
  }, [quickDialOpen, closeQuickDial])

  // Close on Escape
  useEffect(() => {
    if (!quickDialOpen) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeQuickDial()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [quickDialOpen, closeQuickDial])

  if (!quickDialOpen) return null

  const radius = 80
  const count = actions.length

  return (
    <div
      ref={ringRef}
      className="fixed z-[9999]"
      style={{
        left: quickDialPosition.x,
        top: quickDialPosition.y,
      }}
    >
      {/* Center dot */}
      <div className="absolute -translate-x-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-primary/40 shadow-[0_0_12px_rgba(0,243,255,0.4)]" />

      {/* Radial items */}
      {actions.map((item, i) => {
        const angle = (2 * Math.PI * i) / count - Math.PI / 2
        const x = Math.cos(angle) * radius
        const y = Math.sin(angle) * radius

        return (
          <button
            key={item.label}
            type="button"
            onClick={item.action}
            className={cn(
              'absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center gap-1',
              'transition-all duration-200 hover:scale-110 active:scale-95',
              'animate-in zoom-in-50 fade-in duration-200',
            )}
            style={{
              left: x,
              top: y,
              animationDelay: `${i * 30}ms`,
              animationFillMode: 'both',
            }}
          >
            <div
              className={cn(
                'w-10 h-10 rounded-2xl backdrop-blur-2xl border border-white/[0.08] flex items-center justify-center',
                'shadow-lg hover:shadow-xl transition-shadow',
                item.bg,
              )}
            >
              <item.icon size={16} className={item.color} />
            </div>
            <span className="text-[8px] font-bold text-text-muted/60 whitespace-nowrap">
              {item.label}
            </span>
          </button>
        )
      })}
    </div>
  )
}
