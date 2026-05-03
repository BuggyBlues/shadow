import type { TFunction } from 'i18next'
import { ApiError } from './api'

export function getApiErrorMessage(error: unknown, t: TFunction, fallbackKey: string) {
  if (error instanceof ApiError && error.code) {
    const translated = t(`apiErrors.${error.code}`, { defaultValue: '' })
    if (translated) return translated
  }

  if (error instanceof Error) return error.message
  return t(fallbackKey)
}
