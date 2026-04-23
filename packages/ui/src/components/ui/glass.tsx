import * as React from 'react'
import { cn } from '../../lib/utils'

type GlassVariant = 'panel' | 'surface' | 'card'

const glassStyles: Record<GlassVariant, React.CSSProperties> = {
  panel: {
    background: 'var(--glass-bg)',
    border: '1px solid var(--glass-border)',
    backdropFilter: 'blur(48px)',
    WebkitBackdropFilter: 'blur(48px)',
    boxShadow: 'var(--nf-shadow-card, var(--shadow-soft))',
  },
  surface: {
    background: 'color-mix(in srgb, var(--glass-bg) 72%, transparent)',
    border: '1px solid var(--glass-border)',
    backdropFilter: 'blur(32px)',
    WebkitBackdropFilter: 'blur(32px)',
    boxShadow: 'var(--nf-shadow-soft, var(--shadow-soft))',
  },
  card: {
    background: 'color-mix(in srgb, var(--glass-bg) 72%, transparent)',
    border: '1px solid var(--glass-border)',
    borderTop: '1px solid var(--color-border-dim)',
    backdropFilter: 'blur(48px)',
    WebkitBackdropFilter: 'blur(48px)',
    boxShadow: 'var(--nf-shadow-soft, var(--shadow-soft))',
  },
}

interface GlassProps extends React.HTMLAttributes<HTMLElement> {
  as?: React.ElementType
  variant?: GlassVariant
}

const Glass = React.forwardRef<HTMLElement, GlassProps>(
  ({ as: Comp = 'div', className, style, variant = 'panel', ...props }, ref) => {
    return (
      <Comp
        ref={ref}
        className={cn(
          variant === 'card' ? 'relative isolate overflow-hidden rounded-[32px]' : 'rounded-3xl',
          className,
        )}
        style={{ ...glassStyles[variant], ...style }}
        {...props}
      />
    )
  },
)
Glass.displayName = 'Glass'

type GlassVariantProps = Omit<GlassProps, 'variant'>

export const GlassPanel = React.forwardRef<HTMLElement, GlassVariantProps>((props, ref) => (
  <Glass ref={ref} variant="panel" {...props} />
))
GlassPanel.displayName = 'GlassPanel'

export const GlassSurface = React.forwardRef<HTMLElement, GlassVariantProps>((props, ref) => (
  <Glass ref={ref} variant="surface" {...props} />
))
GlassSurface.displayName = 'GlassSurface'

export const GlassCard = React.forwardRef<HTMLElement, GlassVariantProps>((props, ref) => (
  <Glass ref={ref} variant="card" {...props} />
))
GlassCard.displayName = 'GlassCard'
