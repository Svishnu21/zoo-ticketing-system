import { createContext, type ReactNode, useContext, useEffect, useMemo, useState } from 'react'

import { translationDictionaries, type TranslationDictionary } from '@/i18n/dictionaries'

export type Language = 'en' | 'ta'

interface LanguageContextValue {
  language: Language
  setLanguage: (lang: Language) => void
  toggleLanguage: () => void
  translations: Record<string, string>
  translate: (key: string) => string
}

const LanguageContext = createContext<LanguageContextValue | undefined>(undefined)
const STORAGE_KEY = 'kurumbapatti-language'
const dictionaries: Record<Language, TranslationDictionary> = translationDictionaries

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguage] = useState<Language>('en')

  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY) as Language | null
    if (stored === 'en' || stored === 'ta') {
      setLanguage(stored)
    }
  }, [])

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, language)
  }, [language])

  const value = useMemo<LanguageContextValue>(() => {
    const translations = dictionaries[language]
    const translate = (key: string) => translations[key] ?? key

    return {
      language,
      setLanguage,
      toggleLanguage: () => setLanguage((prev) => (prev === 'en' ? 'ta' : 'en')),
      translations,
      translate,
    }
  }, [language])

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useLanguage() {
  const context = useContext(LanguageContext)
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider')
  }
  return context
}
