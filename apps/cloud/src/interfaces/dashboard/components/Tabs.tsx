import { cn } from '@/lib/utils'

export interface TabItem {
  id: string
  label: string
  count?: number
  icon?: React.ReactNode
}

interface TabsProps {
  items: TabItem[]
  active: string
  onChange: (id: string) => void
  className?: string
  variant?: 'default' | 'pills'
}

export function Tabs({ items, active, onChange, className, variant = 'default' }: TabsProps) {
  if (variant === 'pills') {
    return (
      <div className={cn('flex items-center gap-2 flex-wrap', className)}>
        {items.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => onChange(item.id)}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm transition-colors',
              active === item.id
                ? 'bg-blue-600 text-white'
                : 'bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-white',
            )}
          >
            {item.icon}
            {item.label}
            {item.count !== undefined && (
              <span
                className={cn(
                  'text-xs px-1.5 rounded-full',
                  active === item.id ? 'bg-blue-500/50' : 'bg-gray-700',
                )}
              >
                {item.count}
              </span>
            )}
          </button>
        ))}
      </div>
    )
  }

  return (
    <div className={cn('flex items-center border-b border-gray-800', className)}>
      {items.map((item) => (
        <button
          key={item.id}
          type="button"
          onClick={() => onChange(item.id)}
          className={cn(
            'flex items-center gap-1.5 px-4 py-2.5 text-sm transition-colors relative',
            active === item.id ? 'text-white' : 'text-gray-500 hover:text-gray-300',
          )}
        >
          {item.icon}
          {item.label}
          {item.count !== undefined && (
            <span className="text-xs text-gray-500 bg-gray-800 px-1.5 rounded-full">
              {item.count}
            </span>
          )}
          {active === item.id && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-500" />
          )}
        </button>
      ))}
    </div>
  )
}
