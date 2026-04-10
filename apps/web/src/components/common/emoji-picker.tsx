import data from '@emoji-mart/data'
import Picker from '@emoji-mart/react'
import { useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'

interface EmojiPickerProps {
  onSelect: (emoji: string) => void
  onClose: () => void
  position?: 'top' | 'bottom'
}

const i18nMapping: Record<string, string> = {
  'zh-CN': 'zh',
  'zh-TW': 'zh',
  en: 'en',
  ja: 'ja',
  ko: 'ko',
}

export function EmojiPicker({ onSelect, onClose, position = 'top' }: EmojiPickerProps) {
  const { i18n } = useTranslation()
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        onClose()
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [onClose])

  const locale = i18nMapping[i18n.language] ?? 'en'

  return (
    <div
      ref={containerRef}
      className={`absolute z-50 ${position === 'top' ? 'bottom-[calc(100%+8px)]' : 'top-[calc(100%+8px)]'} right-0 bg-white/95 dark:bg-[#1A1D24]/95 backdrop-blur-2xl rounded-[16px] border border-black/5 dark:border-white/10 shadow-[0_12px_48px_rgba(0,0,0,0.12)] dark:shadow-[0_12px_48px_rgba(0,0,0,0.5)] overflow-hidden animate-in fade-in zoom-in-95 duration-100 origin-bottom-right`}
    >
      <Picker
        data={data}
        onEmojiSelect={(emoji: { native: string }) => {
          onSelect(emoji.native)
          onClose()
        }}
        locale={locale}
        theme="dark"
        previewPosition="none"
        skinTonePosition="search"
        set="native"
      />
    </div>
  )
}
