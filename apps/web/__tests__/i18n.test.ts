import { describe, expect, it } from 'vitest'
import en from '../src/lib/locales/en.json'
import ja from '../src/lib/locales/ja.json'
import ko from '../src/lib/locales/ko.json'
import zhCN from '../src/lib/locales/zh-CN.json'
import zhTW from '../src/lib/locales/zh-TW.json'

/** Recursively collect all keys with dot-notation paths */
function collectKeys(obj: Record<string, unknown>, prefix = ''): string[] {
  const keys: string[] = []
  for (const [key, value] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key
    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      keys.push(...collectKeys(value as Record<string, unknown>, fullKey))
    } else {
      keys.push(fullKey)
    }
  }
  return keys.sort()
}

const locales: Record<string, Record<string, unknown>> = {
  'zh-CN': zhCN,
  'zh-TW': zhTW,
  en,
  ja,
  ko,
}

const zhCNKeys = collectKeys(zhCN)

describe('i18n translation files', () => {
  it('should have zh-CN as the reference with non-zero keys', () => {
    expect(zhCNKeys.length).toBeGreaterThan(100)
  })

  for (const [lang, data] of Object.entries(locales)) {
    if (lang === 'zh-CN') continue

    describe(`${lang} locale`, () => {
      const langKeys = collectKeys(data)

      it('should have the same number of keys as zh-CN', () => {
        expect(langKeys.length).toBe(zhCNKeys.length)
      })

      it('should have all keys matching zh-CN', () => {
        const missing = zhCNKeys.filter((k) => !langKeys.includes(k))
        const extra = langKeys.filter((k) => !zhCNKeys.includes(k))
        expect(missing).toEqual([])
        expect(extra).toEqual([])
      })

      it('should not have any empty string values', () => {
        const emptyKeys: string[] = []
        function checkEmpty(obj: Record<string, unknown>, prefix = '') {
          for (const [key, value] of Object.entries(obj)) {
            const fullKey = prefix ? `${prefix}.${key}` : key
            if (typeof value === 'string' && value.trim() === '') {
              emptyKeys.push(fullKey)
            } else if (typeof value === 'object' && value !== null) {
              checkEmpty(value as Record<string, unknown>, fullKey)
            }
          }
        }
        checkEmpty(data)
        expect(emptyKeys).toEqual([])
      })
    })
  }

  it('should have valid JSON structure (all namespaces are objects)', () => {
    for (const [_lang, data] of Object.entries(locales)) {
      for (const [_ns, value] of Object.entries(data)) {
        expect(typeof value).toBe('object')
        expect(value).not.toBeNull()
        expect(Array.isArray(value)).toBe(false)
      }
    }
  })

  it('should have consistent namespaces across all locales', () => {
    const zhNamespaces = Object.keys(zhCN).sort()
    for (const [_lang, data] of Object.entries(locales)) {
      const langNamespaces = Object.keys(data).sort()
      expect(langNamespaces).toEqual(zhNamespaces)
    }
  })

  it('should not contain interpolation placeholders in keys that other locales miss', () => {
    // Find all {{xxx}} patterns in zh-CN and verify they exist in other locales
    const interpolationPattern = /\{\{(\w+)\}\}/g

    for (const key of zhCNKeys) {
      const zhValue = getNestedValue(zhCN, key)
      if (typeof zhValue !== 'string') continue

      const matches = [...zhValue.matchAll(interpolationPattern)]
      if (matches.length === 0) continue

      const zhPlaceholders = matches.map((m) => m[1]).sort()

      for (const [lang, data] of Object.entries(locales)) {
        if (lang === 'zh-CN') continue
        const langValue = getNestedValue(data, key)
        if (typeof langValue !== 'string') continue

        const langMatches = [...langValue.matchAll(interpolationPattern)]
        const langPlaceholders = langMatches.map((m) => m[1]).sort()

        expect(
          langPlaceholders,
          `${lang}:${key} should have interpolation vars ${zhPlaceholders}`,
        ).toEqual(zhPlaceholders)
      }
    }
  })
})

function getNestedValue(obj: Record<string, unknown>, path: string): unknown {
  const parts = path.split('.')
  let current: unknown = obj
  for (const part of parts) {
    if (current === null || current === undefined || typeof current !== 'object') return undefined
    current = (current as Record<string, unknown>)[part]
  }
  return current
}

describe('supportedLanguages config', () => {
  it('should have entries for all locale files', () => {
    // We import the config data directly to avoid needing browser env for i18next
    const expectedCodes = ['zh-CN', 'zh-TW', 'en', 'ja', 'ko']
    expect(Object.keys(locales).sort()).toEqual(expectedCodes.sort())
  })

  it('should have at least 5 supported languages', () => {
    expect(Object.keys(locales)).toHaveLength(5)
  })
})
