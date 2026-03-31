import { cn } from '@/lib/utils'

export type BadgeVariant = 'default' | 'success' | 'warning' | 'error' | 'info' | 'outline'
export type BadgeSize = 'sm' | 'md'

interface BadgeProps {
  children: React.ReactNode
  variant?: BadgeVariant
  size?: BadgeSize
  className?: string
  icon?: React.ReactNode
}

const variantClasses: Record<BadgeVariant, string> = {
  default: 'bg-gray-800 text-gray-300 border-gray-700',
  success: 'bg-green-900/50 text-green-400 border-green-800',
  warning: 'bg-yellow-900/50 text-yellow-400 border-yellow-800',
  error: 'bg-red-900/50 text-red-400 border-red-800',
  info: 'bg-blue-900/50 text-blue-400 border-blue-800',
  outline: 'bg-transparent text-gray-400 border-gray-600',
}

const sizeClasses: Record<BadgeSize, string> = {
  sm: 'text-[10px] px-1.5 py-0',
  md: 'text-xs px-2 py-0.5',
}

export function Badge({ children, variant = 'default', size = 'md', className, icon }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 font-medium rounded-full border',
        variantClasses[variant],
        sizeClasses[size],
        className,
      )}
    >
      {icon}
      {children}
    </span>
  )
}
