import { Globe } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { type SupportedLanguage, supportedLanguages } from '../../lib/i18n'

interface LanguageSwitcherProps {
  /** Compact mode shows only the globe icon + flag (for nav bars) */
  compact?: boolean
}

export function LanguageSwitcher({ compact = false }: LanguageSwitcherProps) {
  const { i18n } = useTranslation()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  const currentLang =
    supportedLanguages.find((l) => l.code === i18n.language) ?? supportedLanguages[0]

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && e.target instanceof Node && !ref.current.contains(e.target)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    if (open) {
      document.addEventListener('keydown', handleKeyDown)
      return () => document.removeEventListener('keydown', handleKeyDown)
    }
  }, [open])

  const handleChange = (code: SupportedLanguage) => {
    i18n.changeLanguage(code)
    setOpen(false)
  }

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={`flex items-center gap-1.5 rounded-full transition-all hover:bg-gray-100 ${
          compact ? 'p-2' : 'px-3 py-2 border border-gray-200 bg-white/70 backdrop-blur-sm'
        }`}
        aria-label="Switch language"
        aria-expanded={open}
        aria-haspopup="listbox"
      >
        <Globe className="w-4 h-4 text-gray-600" />
        <span className="text-sm">{currentLang.flag}</span>
        {!compact && <span className="text-sm font-medium text-gray-700">{currentLang.label}</span>}
      </button>

      {open && (
        <div
          role="listbox"
          aria-label="Language"
          className="absolute right-0 top-full mt-2 bg-white rounded-xl shadow-lg border border-gray-100 py-1 min-w-[160px] z-50"
        >
          {supportedLanguages.map((lang) => (
            <button
              type="button"
              key={lang.code}
              role="option"
              aria-selected={lang.code === i18n.language}
              onClick={() => handleChange(lang.code)}
              className={`w-full text-left px-4 py-2.5 text-sm flex items-center gap-3 hover:bg-gray-50 transition ${
                lang.code === i18n.language
                  ? 'text-cyan-600 font-bold bg-cyan-50/50'
                  : 'text-gray-700 font-medium'
              }`}
            >
              <span className="text-base">{lang.flag}</span>
              <span>{lang.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
