import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react'
import { type ReactNode, useState } from 'react'
import { cn } from '@/lib/utils'

export interface Column<T> {
  key: string
  label: string
  sortable?: boolean
  width?: string
  render: (item: T) => ReactNode
  headerClassName?: string
  cellClassName?: string
}

interface DataTableProps<T> {
  columns: Column<T>[]
  data: T[]
  keyExtractor: (item: T) => string
  emptyMessage?: string
  emptyIcon?: ReactNode
  loading?: boolean
  onRowClick?: (item: T) => void
  className?: string
  compact?: boolean
}

type SortDir = 'asc' | 'desc'

export function DataTable<T>({
  columns,
  data,
  keyExtractor,
  emptyMessage = 'No data found',
  emptyIcon,
  loading,
  onRowClick,
  className,
  compact,
}: DataTableProps<T>) {
  const [sortKey, setSortKey] = useState<string | null>(null)
  const [sortDir, setSortDir] = useState<SortDir>('asc')

  const handleSort = (key: string) => {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortKey(key)
      setSortDir('asc')
    }
  }

  const sortedData = sortKey
    ? [...data].sort((a, b) => {
        const col = columns.find((c) => c.key === sortKey)
        if (!col) return 0
        const va = String(col.render(a) ?? '')
        const vb = String(col.render(b) ?? '')
        const cmp = va.localeCompare(vb, undefined, { numeric: true })
        return sortDir === 'asc' ? cmp : -cmp
      })
    : data

  const py = compact ? 'py-2' : 'py-3'

  return (
    <div className={cn('bg-gray-900 border border-gray-800 rounded-lg overflow-hidden', className)}>
      {loading && <div className="p-8 text-center text-gray-500 text-sm">Loading...</div>}
      {!loading && data.length === 0 && (
        <div className="p-12 text-center">
          {emptyIcon && <div className="mb-3 flex justify-center text-gray-700">{emptyIcon}</div>}
          <p className="text-gray-500 text-sm">{emptyMessage}</p>
        </div>
      )}
      {!loading && data.length > 0 && (
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-800 text-left">
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={cn(
                    'px-4 py-2 text-xs font-medium text-gray-500',
                    col.sortable && 'cursor-pointer select-none hover:text-gray-300',
                    col.headerClassName,
                  )}
                  style={col.width ? { width: col.width } : undefined}
                  onClick={col.sortable ? () => handleSort(col.key) : undefined}
                >
                  <span className="flex items-center gap-1">
                    {col.label}
                    {col.sortable && (
                      <span className="text-gray-600">
                        {sortKey === col.key ? (
                          sortDir === 'asc' ? (
                            <ArrowUp size={11} />
                          ) : (
                            <ArrowDown size={11} />
                          )
                        ) : (
                          <ArrowUpDown size={11} />
                        )}
                      </span>
                    )}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sortedData.map((item) => (
              <tr
                key={keyExtractor(item)}
                className={cn(
                  'border-b border-gray-800/50 hover:bg-gray-800/30 transition-colors',
                  onRowClick && 'cursor-pointer',
                )}
                onClick={onRowClick ? () => onRowClick(item) : undefined}
              >
                {columns.map((col) => (
                  <td key={col.key} className={cn('px-4', py, col.cellClassName)}>
                    {col.render(item)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}
