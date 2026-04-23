import { Card } from '@shadowob/ui'
import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface DashboardNamespaceCardProps {
  headerLeft: ReactNode
  headerRight?: ReactNode
  rows: ReactNode
  footer?: ReactNode
  className?: string
}

export function DashboardNamespaceCard({
  headerLeft,
  headerRight,
  rows,
  footer,
  className,
}: DashboardNamespaceCardProps) {
  return (
    <Card variant="glass" className={cn(className)}>
      <div className="flex items-center justify-between border-b border-[var(--glass-line)] px-5 py-4">
        <div className="min-w-0">{headerLeft}</div>
        {headerRight ? <div className="shrink-0">{headerRight}</div> : null}
      </div>

      <div className="divide-y divide-[var(--glass-line-soft)]">{rows}</div>

      {footer ? (
        <div className="flex items-center justify-between border-t border-[var(--glass-line)] bg-bg-secondary/30 px-5 py-2.5">
          {footer}
        </div>
      ) : null}
    </Card>
  )
}
