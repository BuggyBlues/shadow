import AsyncStorage from '@react-native-async-storage/async-storage'
import { getLocales } from 'expo-localization'
import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import en from './locales/en.json'
import ja from './locales/ja.json'
import ko from './locales/ko.json'
import zhCN from './locales/zh-CN.json'
import zhTW from './locales/zh-TW.json'

export const supportedLanguages = [
  { code: 'zh-CN', label: '简体中文', flag: '🇨🇳' },
  { code: 'zh-TW', label: '繁體中文', flag: '🇭🇰' },
  { code: 'en', label: 'English', flag: '🇺🇸' },
  { code: 'ja', label: '日本語', flag: '🇯🇵' },
  { code: 'ko', label: '한국어', flag: '🇰🇷' },
] as const

export type SupportedLanguage = (typeof supportedLanguages)[number]['code']

const LANG_STORAGE_KEY = 'shadow-lang'

function getDeviceLanguage(): string {
  const locales = getLocales()
  if (locales.length > 0) {
    const tag = locales[0]?.languageTag
    if (tag) {
      // Try exact match first
      const codes = supportedLanguages.map((l) => l.code as string)
      if (codes.includes(tag)) return tag
      // Try language portion
      const lang = tag.split('-')[0]
      if (lang === 'zh') {
        // Distinguish simplified vs traditional
        if (tag.includes('Hant') || tag.includes('TW') || tag.includes('HK')) return 'zh-TW'
        return 'zh-CN'
      }
      const match = codes.find((c) => c.startsWith(lang ?? ''))
      if (match) return match
    }
  }
  return 'zh-CN'
}

async function initI18n() {
  const savedLang = await AsyncStorage.getItem(LANG_STORAGE_KEY)
  const lng = savedLang ?? getDeviceLanguage()

  await i18n.use(initReactI18next).init({
    resources: {
      'zh-CN': { translation: zhCN },
      'zh-TW': { translation: zhTW },
      en: { translation: en },
      ja: { translation: ja },
      ko: { translation: ko },
    },
    lng,
    fallbackLng: 'zh-CN',
    interpolation: {
      escapeValue: false,
    },
  })
}

initI18n()

export async function changeLanguage(code: string) {
  await AsyncStorage.setItem(LANG_STORAGE_KEY, code)
  await i18n.changeLanguage(code)
}

export default i18n
