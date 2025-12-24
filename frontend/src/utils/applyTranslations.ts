import { translationDictionaries } from '@/i18n/dictionaries'
import type { Language } from '@/providers/LanguageProvider'

export function applyTranslations(language: Language) {
  const dictionary = translationDictionaries[language]
  if (!dictionary) {
    // Fallback: nothing to apply if dictionary missing
    return
  }

  const elements = document.querySelectorAll<HTMLElement>('[data-i18n-key]')
  elements.forEach((element) => {
    const key = element.dataset.i18nKey
    if (!key) {
      return
    }

    const translated = dictionary[key]
    if (typeof translated === 'string') {
      element.textContent = translated
    }
  })
}
