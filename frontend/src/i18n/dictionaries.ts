import en from '@/i18n/en.json'
import ta from '@/i18n/ta.json'

export type SupportedLanguage = 'en' | 'ta'

export type TranslationDictionary = Record<string, string>

export const translationDictionaries: Record<SupportedLanguage, TranslationDictionary> = {
  en,
  ta,
}
