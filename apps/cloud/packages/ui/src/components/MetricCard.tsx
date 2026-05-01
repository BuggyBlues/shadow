import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface MetricCardWrapperProps {
  children: ReactNode
  className?: string
  onClick?: () => void
}

interface MetricCardContentProps {
  label: string
  value: string | number
  icon?: ReactNode
  className?: string
  valueClassName?: string
  iconClassName?: string
}

export function MetricCardWrapper({ children, className, onClick }: MetricCardWrapperProps) {
  return (
    <div
      className={cn(
        'min-w-0 rounded-xl border border-border-subtle bg-bg-secondary/35 px-4 py-3',
        className,
      )}
      onClick={onClick}
    >
      {children}
    </div>
  )
}

export function MetricCardContent({
  label,
  value,
  icon,
  className,
  valueClassName,
  iconClassName,
}: MetricCardContentProps) {
  return (
    <>
      <div className="mb-2 flex items-start justify-between gap-3">
        <div className={cn('flex min-w-0 flex-wrap items-center gap-2 text-xs', className)}>
          {icon && (
            <span className={cn('inline-flex shrink-0 items-center justify-center', iconClassName)}>
              {icon}
            </span>
          )}
          <span className="min-w-0 break-words text-[0.72rem] font-medium uppercase tracking-[0.08em] text-text-muted">
            {label}
          </span>
        </div>
      </div>
      <p
        className={cn(
          'break-words text-[clamp(1.25rem,2vw,1.75rem)] font-bold leading-tight tracking-tight',
          valueClassName,
        )}
      >
        {value}
      </p>
    </>
  )
}
