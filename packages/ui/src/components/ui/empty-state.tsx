import { FileQuestion } from 'lucide-react'
import type * as React from 'react'
import { cn } from '../../lib/utils'

export function EmptyState({
  title,
  description,
  icon: Icon,
  action,
  className = '',
}: {
  title: string
  description?: string
  icon?: React.ElementType
  action?: React.ReactNode
  className?: string
}) {
  const IconComponent = Icon || FileQuestion

  return (
    <div className={cn('flex flex-col items-center justify-center py-12 text-center', className)}>
      <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-lg border border-border-subtle bg-bg-secondary/70 text-text-muted">
        <IconComponent size={24} strokeWidth={1.8} aria-hidden="true" />
      </div>
      <h3 className="text-lg font-semibold text-text-primary mb-2">{title}</h3>
      {description && (
        <p className="text-sm text-text-muted max-w-sm mx-auto mb-6 leading-relaxed">
          {description}
        </p>
      )}
      {action}
    </div>
  )
}
