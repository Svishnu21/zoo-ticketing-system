import { AlertTriangle, MapPin } from 'lucide-react'

import { visitorInfo } from '@/data/content'
import { useLanguage } from '@/providers/LanguageProvider'

export function InformationPage() {
  const { language } = useLanguage()

  return (
    <section className="page-enter bg-soft-bg py-20">
      <div className="container space-y-10">
        <div className="text-center">
          <h1 className="text-5xl font-bold text-forest-green">{visitorInfo.title[language]}</h1>
          <p className="mt-2 text-xl text-muted-foreground">{visitorInfo.subtitle[language]}</p>
        </div>

        <div className="grid gap-8 md:grid-cols-2">
          <article className="rounded-3xl border border-forest-green/20 bg-white p-8 shadow-lg">
            <h2 className="text-2xl font-bold text-forest-green">{visitorInfo.timings.heading[language]}</h2>
            <p className="mt-4 text-base text-muted-foreground">{visitorInfo.timings.description[language]}</p>
            <div className="mt-6 rounded-2xl border-2 border-destructive bg-destructive/10 p-6 text-center">
              <p className="text-lg font-bold text-destructive">
                <AlertTriangle className="mr-2 inline" size={20} />
                {visitorInfo.timings.alert[language]}
              </p>
            </div>
          </article>

          <article className="rounded-3xl border border-forest-green/20 bg-white p-8 shadow-lg">
            <h2 className="text-2xl font-bold text-forest-green">{visitorInfo.reach.heading[language]}</h2>
            <div className="mt-6 flex items-start gap-3 text-muted-foreground">
              <MapPin className="mt-1 text-forest-green" size={22} />
              <p className="whitespace-pre-line text-base">{visitorInfo.reach.address[language]}</p>
            </div>
          </article>
        </div>
      </div>
    </section>
  )
}
