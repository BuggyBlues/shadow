import { Card } from '@shadowob/ui'
import type { ReactNode, UIEventHandler } from 'react'
import { cn } from '@/lib/utils'

type LogLine = string | { text: string; createdAt?: string }

interface LogsPanelProps {
  headerLeft: ReactNode
  headerRight?: ReactNode
  lines: LogLine[]
  footerLeft?: ReactNode
  footerRight?: ReactNode
  showTimestamps?: boolean
  collapseRepeats?: boolean
  emptyText: string
  bodyRef?: React.RefObject<HTMLDivElement | null>
  bodyOnScroll?: UIEventHandler<HTMLDivElement>
  className?: string
  bodyClassName?: string
}

export function LogsPanel({
  headerLeft,
  headerRight,
  lines,
  emptyText,
  bodyRef,
  bodyOnScroll,
  className,
  bodyClassName,
  footerLeft,
  footerRight,
  showTimestamps = false,
  collapseRepeats = false,
}: LogsPanelProps) {
  const getLineText = (line: LogLine): string => {
    if (typeof line === 'string') return line
    return line.text
  }

  const getLineTimestamp = (line: LogLine): string | null => {
    if (typeof line === 'string') return null
    if (!line.createdAt) return null

    const parsed = new Date(line.createdAt)
    if (Number.isNaN(parsed.getTime())) return null

    return parsed.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
  }

  const renderLines = lines.reduce<
    Array<{
      text: string
      timestamp: string | null
      repeatCount: number
      key: string
    }>
  >((acc, line, index) => {
    const text = getLineText(line) || '\u00a0'
    const timestamp = getLineTimestamp(line)

    if (collapseRepeats && acc.length > 0 && acc.at(-1)?.text === text) {
      acc[acc.length - 1].repeatCount += 1
      if (timestamp) {
        acc[acc.length - 1].timestamp = timestamp
      }
      return acc
    }

    acc.push({
      text,
      timestamp,
      repeatCount: 1,
      key: `log-${index}-${text}-${timestamp ?? 'no-ts'}`,
    })
    return acc
  }, [])

  return (
    <Card
      className={cn(
        'overflow-hidden rounded-xl border border-border-subtle bg-bg-secondary/25',
        className,
      )}
    >
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border-subtle bg-bg-secondary/30 px-4 py-2.5">
        <div className="text-xs text-text-muted">{headerLeft}</div>
        {headerRight ? <div className="shrink-0">{headerRight}</div> : null}
      </div>
      <div
        ref={bodyRef}
        className={cn(
          'min-h-[12rem] max-h-[16rem] overflow-auto p-4 font-mono text-xs text-text-secondary space-y-1 bg-bg-deep/80',
          bodyClassName,
        )}
        onScroll={bodyOnScroll}
      >
        {lines.length === 0 ? (
          <span className="text-text-muted">{emptyText}</span>
        ) : (
          renderLines.map((item) => (
            <div key={item.key} className="leading-relaxed">
              {showTimestamps && item.timestamp ? (
                <span className="text-[0.72rem] text-text-muted mr-2">{item.timestamp}</span>
              ) : null}
              {item.text}
              {item.repeatCount > 1 ? (
                <span className="ml-2 rounded bg-bg-deep px-1.5 py-0.5 text-[0.7rem] text-text-muted">
                  x{item.repeatCount}
                </span>
              ) : null}
            </div>
          ))
        )}
      </div>
      {(footerLeft || footerRight) && (
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border-subtle bg-bg-secondary/30 px-4 py-2.5">
          {footerLeft ? <div className="text-xs text-text-muted">{footerLeft}</div> : null}
          {footerRight ? <div className="flex items-center gap-2">{footerRight}</div> : null}
        </div>
      )}
    </Card>
  )
}
