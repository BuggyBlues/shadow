import { Package } from 'lucide-react'
import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface EmptyStateProps {
  icon?: ReactNode
  title: string
  description?: string
  action?: ReactNode
  className?: string
}

export function EmptyState({ icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div
      className={cn('flex flex-col items-center justify-center py-16 px-6 text-center', className)}
    >
      <div className="mb-4 text-gray-600">{icon ?? <Package size={40} />}</div>
      <h3 className="text-base font-medium text-gray-300 mb-1">{title}</h3>
      {description && <p className="text-sm text-gray-500 max-w-md mb-4">{description}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  )
}
