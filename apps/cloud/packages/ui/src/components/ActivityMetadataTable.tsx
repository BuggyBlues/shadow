import { type ActivityEntry } from '@/stores/app'

type TranslateFn = (key: string) => string

type ActivityMetadataRow = {
  label: string
  value: string
}

function getActivityMetadataLabel(t: TranslateFn, label: string): string {
  const translationKey = `activity.meta.${label}`
  const translated = t(translationKey)
  return translated === translationKey ? label : translated
}

export function getActivityMetadataRows(
  activity: ActivityEntry,
  t: TranslateFn,
): ActivityMetadataRow[] {
  const metadata = activity.metadata ?? []
  const seen = new Set<string>()

  return metadata.reduce<ActivityMetadataRow[]>((rows, entry) => {
    const label = getActivityMetadataLabel(t, entry.label)
    if (seen.has(label)) return rows
    seen.add(label)
    rows.push({ label, value: entry.value })
    return rows
  }, [])
}

export function ActivityMetadataTable({
  rows,
  className,
}: {
  rows: ActivityMetadataRow[]
  className?: string
}) {
  if (rows.length === 0) return null

  return (
    <table className={`mt-2 w-full border-collapse text-xs ${className ?? ''}`}>
      <tbody>
        {rows.map((row, index) => (
          <tr
            key={`${row.label}-${row.value}-${index}`}
            className="border-t border-border-subtle first:border-0"
          >
            <td className="w-28 max-w-28 py-1 pr-3 align-top text-text-muted">{row.label}</td>
            <td className="py-1 text-text-primary break-all">{row.value}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}
