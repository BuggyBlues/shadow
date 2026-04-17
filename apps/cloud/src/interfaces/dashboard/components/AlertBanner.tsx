import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

type AlertVariant = 'info' | 'warning' | 'success' | 'danger'

const variantStyles: Record<
  AlertVariant,
  { banner: string; title: string; icon: string; listIcon: string }
> = {
  info: {
    banner: 'bg-primary/8 border-primary/25',
    title: 'text-primary',
    icon: 'text-primary',
    listIcon: 'text-success',
  },
  warning: {
    banner: 'bg-warning/8 border-warning/25',
    title: 'text-warning',
    icon: 'text-warning',
    listIcon: 'text-warning',
  },
  success: {
    banner: 'bg-success/8 border-success/25',
    title: 'text-success',
    icon: 'text-success',
    listIcon: 'text-success',
  },
  danger: {
    banner: 'bg-danger/8 border-danger/25',
    title: 'text-danger',
    icon: 'text-danger',
    listIcon: 'text-danger',
  },
}

interface AlertBannerProps {
  variant: AlertVariant
  icon: LucideIcon
  title: string
  children?: ReactNode
  className?: string
}

export function AlertBanner({ variant, icon: Icon, title, children, className }: AlertBannerProps) {
  const styles = variantStyles[variant]
  return (
    <div className={cn('rounded-lg border p-4', styles.banner, className)}>
      <h4 className={cn('mb-2 flex items-center gap-2 text-sm font-medium', styles.title)}>
        <Icon size={13} className={styles.icon} />
        {title}
      </h4>
      {children}
    </div>
  )
}

interface AlertBannerListProps {
  variant: AlertVariant
  items: string[]
  bulletIcon: LucideIcon
}

export function AlertBannerList({ variant, items, bulletIcon: BulletIcon }: AlertBannerListProps) {
  const styles = variantStyles[variant]
  return (
    <ul className="space-y-2">
      {items.map((item) => (
        <li key={item} className="flex items-center gap-2 text-sm text-text-secondary">
          <BulletIcon size={13} className={cn('shrink-0', styles.listIcon)} />
          {item}
        </li>
      ))}
    </ul>
  )
}
