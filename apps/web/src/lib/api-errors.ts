import type { TFunction } from 'i18next'
import { ApiError } from './api'

export function getApiErrorMessage(error: unknown, t: TFunction, fallbackKey: string) {
  if (error instanceof ApiError && error.code) {
    const translated = t(`apiErrors.${error.code}`, { ...error.params, defaultValue: '' })
    if (translated) return translated
    return t(fallbackKey)
  }

  if (error instanceof Error) return error.message
  return t(fallbackKey)
}
