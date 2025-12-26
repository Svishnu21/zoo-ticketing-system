import { Check } from 'lucide-react'

import { safariContent } from '@/data/content'
import { useLanguage } from '@/providers/LanguageProvider'

export function SafariPage() {
  const { language } = useLanguage()

  return (
    <section className="page-enter bg-soft-bg py-20">
      <div className="container max-w-6xl space-y-10">
        <div className="text-center">
          <h1 className="text-5xl font-bold text-forest-green">{safariContent.title[language]}</h1>
          <p className="mt-2 text-xl text-muted-foreground">{safariContent.subtitle[language]}</p>
        </div>

        <div className="grid items-center gap-12 md:grid-cols-2">
          <div className="overflow-hidden rounded-2xl shadow-lg transition-transform duration-300 ease-smooth hover:scale-105 hover:shadow-2xl">
            <img
              src={safariContent.image}
              alt={safariContent.heading[language]}
              className="w-full rounded-2xl object-cover"
              loading="lazy"
              decoding="async"
            />
          </div>
          <div className="space-y-6">
            <h2 className="text-3xl font-bold text-forest-green">{safariContent.heading[language]}</h2>
            <p className="text-lg leading-relaxed text-muted-foreground">{safariContent.description[language]}</p>
            <ul className="space-y-3">
              {safariContent.bullets.map((bullet) => (
                <li key={bullet.en} className="flex items-start gap-3 text-base text-muted-foreground">
                  <Check className="mt-1 text-vibrant-green" size={18} />
                  <span>{bullet[language]}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  )
}
