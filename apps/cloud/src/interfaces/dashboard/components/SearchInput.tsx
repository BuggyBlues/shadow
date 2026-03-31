import { Search, X } from 'lucide-react'
import { useRef } from 'react'
import { cn } from '@/lib/utils'

interface SearchInputProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
  size?: 'sm' | 'md' | 'lg'
  autoFocus?: boolean
}

export function SearchInput({
  value,
  onChange,
  placeholder = 'Search...',
  className,
  size = 'md',
  autoFocus,
}: SearchInputProps) {
  const inputRef = useRef<HTMLInputElement>(null)

  const sizeClasses = {
    sm: 'h-8 text-xs pl-8 pr-7',
    md: 'h-9 text-sm pl-9 pr-8',
    lg: 'h-11 text-base pl-10 pr-9',
  }

  const iconSize = { sm: 13, md: 15, lg: 17 }

  return (
    <div className={cn('relative', className)}>
      <Search
        size={iconSize[size]}
        className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none"
      />
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoFocus={autoFocus}
        className={cn(
          'w-full bg-gray-900 border border-gray-700 rounded-lg text-gray-200 placeholder-gray-600',
          'focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30 transition-colors',
          sizeClasses[size],
        )}
      />
      {value && (
        <button
          type="button"
          onClick={() => {
            onChange('')
            inputRef.current?.focus()
          }}
          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors"
        >
          <X size={iconSize[size] - 2} />
        </button>
      )}
    </div>
  )
}
