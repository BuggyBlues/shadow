import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface StatCardProps {
  label: string
  value: string | number
  icon?: ReactNode
  trend?: { value: string; positive: boolean }
  color?: 'default' | 'green' | 'yellow' | 'red' | 'blue' | 'purple'
  className?: string
  onClick?: () => void
}

const colorMap = {
  default: { icon: 'text-gray-400', value: 'text-white' },
  green: { icon: 'text-green-400', value: 'text-green-400' },
  yellow: { icon: 'text-yellow-400', value: 'text-yellow-400' },
  red: { icon: 'text-red-400', value: 'text-red-400' },
  blue: { icon: 'text-blue-400', value: 'text-blue-400' },
  purple: { icon: 'text-purple-400', value: 'text-purple-400' },
}

export function StatCard({
  label,
  value,
  icon,
  trend,
  color = 'default',
  className,
  onClick,
}: StatCardProps) {
  const colors = colorMap[color]

  return (
    <div
      className={cn(
        'bg-gray-900 border border-gray-800 rounded-lg p-4 transition-colors',
        onClick && 'cursor-pointer hover:border-gray-700',
        className,
      )}
      onClick={onClick}
    >
      <div className="flex items-center justify-between mb-2">
        <div className={cn('flex items-center gap-2 text-xs', colors.icon)}>
          {icon}
          <span className="text-gray-500">{label}</span>
        </div>
        {trend && (
          <span
            className={cn(
              'text-xs px-1.5 py-0.5 rounded',
              trend.positive ? 'text-green-400 bg-green-900/30' : 'text-red-400 bg-red-900/30',
            )}
          >
            {trend.value}
          </span>
        )}
      </div>
      <p className={cn('text-2xl font-semibold', colors.value)}>{value}</p>
    </div>
  )
}
