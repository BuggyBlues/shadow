import { cn } from '@/lib/utils'

export type StatusType = 'success' | 'warning' | 'error' | 'info' | 'neutral'

interface StatusDotProps {
  status: StatusType
  label?: string
  pulse?: boolean
  size?: 'sm' | 'md'
  className?: string
}

const dotColors: Record<StatusType, string> = {
  success: 'bg-green-400',
  warning: 'bg-yellow-400',
  error: 'bg-red-400',
  info: 'bg-blue-400',
  neutral: 'bg-gray-500',
}

const labelColors: Record<StatusType, string> = {
  success: 'text-green-400',
  warning: 'text-yellow-400',
  error: 'text-red-400',
  info: 'text-blue-400',
  neutral: 'text-gray-400',
}

export function StatusDot({ status, label, pulse, size = 'sm', className }: StatusDotProps) {
  const dotSize = size === 'sm' ? 'h-2 w-2' : 'h-2.5 w-2.5'

  return (
    <span className={cn('inline-flex items-center gap-1.5', className)}>
      <span className="relative flex">
        <span className={cn('rounded-full', dotSize, dotColors[status])} />
        {pulse && (
          <span
            className={cn(
              'absolute inset-0 rounded-full animate-ping opacity-40',
              dotColors[status],
            )}
          />
        )}
      </span>
      {label && <span className={cn('text-xs font-medium', labelColors[status])}>{label}</span>}
    </span>
  )
}
