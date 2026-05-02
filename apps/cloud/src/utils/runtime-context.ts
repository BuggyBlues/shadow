export interface DeploymentRuntimeContext {
  locale?: string
  timezone?: string
}

export function normalizeRuntimeLocale(locale?: string | null): string | undefined {
  const raw = locale?.trim()
  if (!raw) return undefined

  try {
    return new Intl.Locale(raw).toString()
  } catch {
    return undefined
  }
}

export function normalizeRuntimeTimezone(timezone?: string | null): string | undefined {
  const raw = timezone?.trim()
  if (!raw) return undefined

  try {
    return new Intl.DateTimeFormat('en-US', { timeZone: raw }).resolvedOptions().timeZone
  } catch {
    return undefined
  }
}

export function normalizeDeploymentRuntimeContext(
  context?: DeploymentRuntimeContext | null,
): DeploymentRuntimeContext {
  const locale = normalizeRuntimeLocale(context?.locale)
  const timezone = normalizeRuntimeTimezone(context?.timezone)
  return {
    ...(locale ? { locale } : {}),
    ...(timezone ? { timezone } : {}),
  }
}

export function isDeploymentRuntimeContextEmpty(
  context?: DeploymentRuntimeContext | null,
): boolean {
  const normalized = normalizeDeploymentRuntimeContext(context)
  return !normalized.locale && !normalized.timezone
}

export function runtimeTimeFormatForLocale(locale?: string): 'auto' | '24' {
  const normalized = normalizeRuntimeLocale(locale)
  if (!normalized) return 'auto'

  const language = normalized.split('-')[0]?.toLowerCase()
  return language === 'zh' || language === 'ja' || language === 'ko' ? '24' : 'auto'
}

function localeLabel(locale: string): string {
  const normalized = normalizeRuntimeLocale(locale) ?? locale
  const language = normalized.split('-')[0]?.toLowerCase()
  if (normalized.toLowerCase() === 'zh-cn') return 'Simplified Chinese'
  if (normalized.toLowerCase() === 'zh-tw') return 'Traditional Chinese'
  if (language === 'zh') return 'Chinese'
  if (language === 'en') return 'English'
  if (language === 'ja') return 'Japanese'
  if (language === 'ko') return 'Korean'
  return normalized
}

export function buildRuntimeContextPromptSection(
  context?: DeploymentRuntimeContext | null,
): string {
  const normalized = normalizeDeploymentRuntimeContext(context)
  const lines: string[] = []

  if (normalized.locale) {
    lines.push(
      `- Default user locale: ${normalized.locale} (${localeLabel(normalized.locale)}). Respond in this locale and language unless the user explicitly asks otherwise.`,
    )
  }

  if (normalized.timezone) {
    lines.push(
      `- User timezone: ${normalized.timezone}. Interpret relative dates, local times, cron schedules, and heartbeat timing in this timezone unless the user specifies another timezone.`,
    )
  }

  if (lines.length === 0) return ''

  return ['Runtime locale context', '', ...lines].join('\n')
}

export function runtimeContextEnv(
  context?: DeploymentRuntimeContext | null,
): Record<string, string> {
  const normalized = normalizeDeploymentRuntimeContext(context)
  return normalized.timezone ? { TZ: normalized.timezone } : {}
}
