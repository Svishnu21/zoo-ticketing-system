import { useEffect } from 'react'

import { useLanguage } from '@/providers/LanguageProvider'
import { cn } from '@/utils/cn'
import { applyTranslations } from '@/utils/applyTranslations'

export function LanguageToggle() {
  const { language, setLanguage } = useLanguage()

  useEffect(() => {
    applyTranslations(language)
  }, [language])

  return (
  <div className="inline-flex overflow-hidden rounded-full border border-border bg-white/80 shadow-md backdrop-blur">
      {(
        [
          { code: 'en', label: 'EN' },
          { code: 'ta', label: 'தமிழ்' },
        ] as const
      ).map(({ code, label }) => (
        <button
          key={code}
          type="button"
          onClick={() => setLanguage(code)}
          className={cn(
            'px-3 py-1 text-xs font-semibold uppercase transition-colors duration-300 ease-smooth',
            language === code
              ? 'bg-vibrant-green text-white'
              : 'text-foreground/70 hover:bg-soft-bg',
          )}
        >
          {label}
        </button>
      ))}
    </div>
  )
}
