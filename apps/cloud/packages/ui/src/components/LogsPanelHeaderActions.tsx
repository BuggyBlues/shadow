import { Button, type ButtonProps, Checkbox } from '@shadowob/ui'
import { type ReactNode } from 'react'
import { ToolbarActionButton } from '@/components/ToolbarActionButton'

export interface LogsPanelHeaderActionItem {
  id?: string
  type?: 'toolbar' | 'button'
  icon?: ReactNode
  label: ReactNode
  onClick: () => void
  variant?: ButtonProps['variant']
  size?: ButtonProps['size']
  disabled?: boolean
}

interface LogsPanelHeaderActionsProps {
  showTimestamps?: boolean
  onShowTimestampsChange?: (checked: boolean) => void
  showTimestampsLabel?: string
  hideTimestampsLabel?: string
  showTimestampsToggle?: boolean
  actions?: LogsPanelHeaderActionItem[]
  suffix?: ReactNode
}

export function LogsPanelHeaderActions({
  showTimestamps,
  onShowTimestampsChange,
  showTimestampsLabel,
  hideTimestampsLabel,
  showTimestampsToggle = true,
  actions,
  suffix,
}: LogsPanelHeaderActionsProps) {
  return (
    <div className="flex flex-wrap items-center justify-end gap-2 text-xs text-text-muted">
      {showTimestampsToggle && onShowTimestampsChange ? (
        <label className="flex items-center gap-2">
          <Checkbox
            checked={Boolean(showTimestamps)}
            onCheckedChange={(checked) => onShowTimestampsChange(checked === true)}
          />
          <span>{Boolean(showTimestamps) ? hideTimestampsLabel : showTimestampsLabel}</span>
        </label>
      ) : null}

      {actions
        ? actions.map((action) => {
            if (action.type === 'button') {
              return (
                <Button
                  key={action.id ?? `log-header-action-${action.label}`}
                  type="button"
                  variant={action.variant ?? 'ghost'}
                  size={action.size ?? 'sm'}
                  onClick={action.onClick}
                  disabled={action.disabled}
                  className="h-8"
                >
                  {action.icon}
                  {action.label}
                </Button>
              )
            }

            return (
              <ToolbarActionButton
                key={action.id ?? `log-header-action-${action.label}`}
                type="button"
                onClick={action.onClick}
                variant={action.variant ?? 'ghost'}
                icon={action.icon}
                label={action.label}
                disabled={action.disabled}
                className="h-8"
              />
            )
          })
        : null}

      {suffix ? suffix : null}
    </div>
  )
}
