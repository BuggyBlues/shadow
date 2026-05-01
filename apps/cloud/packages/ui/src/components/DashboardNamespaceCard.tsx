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
    <Card
      variant="glassPanel"
      className={cn('rounded-xl border border-border-subtle bg-bg-secondary/20', className)}
    >
      <div className="flex flex-col gap-3 border-b border-[var(--glass-line)] px-4 py-3 md:flex-row md:items-center md:justify-between">
        <div className="min-w-0">{headerLeft}</div>
        {headerRight ? (
          <div className="w-full min-w-0 md:w-auto md:shrink-0">{headerRight}</div>
        ) : null}
      </div>

      <div className="divide-y divide-[var(--glass-line-soft)]">{rows}</div>

      {footer ? (
        <div className="flex flex-col gap-2 border-t border-[var(--glass-line)] bg-bg-secondary/35 px-4 py-2.5 md:flex-row md:items-center md:justify-between">
          {footer}
        </div>
      ) : null}
    </Card>
  )
}
