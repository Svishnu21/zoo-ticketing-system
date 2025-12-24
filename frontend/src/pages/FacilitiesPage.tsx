import { facilities } from '@/data/content'
import { useLanguage } from '@/providers/LanguageProvider'

export function FacilitiesPage() {
  const { language } = useLanguage()

  return (
    <section className="page-enter bg-soft-bg py-20">
      <div className="container max-w-6xl space-y-12">
        <div className="text-center">
          <h1 className="text-5xl font-bold text-forest-green">{language === 'en' ? 'Park Facilities' : 'பூங்கா வசதிகள்'}</h1>
          <p className="mt-2 text-xl text-muted-foreground">{language === 'en' ? 'வசதிகள்' : 'Park Facilities'}</p>
        </div>

        <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
          {facilities.map((facility) => (
            <article
              key={facility.title.en}
              className="group flex h-full flex-col overflow-hidden rounded-3xl border border-forest-green/20 bg-white text-center shadow-lg transition-transform duration-300 ease-smooth hover:-translate-y-1 hover:scale-105 hover:shadow-2xl"
            >
              <div className="aspect-[4/3] w-full overflow-hidden bg-soft-bg">
                <img
                  src={facility.image}
                  alt={facility.title[language]}
                  className="h-full w-full object-cover transition-transform duration-500 ease-smooth group-hover:scale-105"
                  loading="lazy"
                />
              </div>
              <div className="flex flex-1 flex-col justify-between px-6 pb-6 pt-5">
                <h3 className="text-xl font-semibold text-forest-green">{facility.title[language]}</h3>
                <p className="mt-3 text-sm text-muted-foreground leading-relaxed">{facility.description[language]}</p>
              </div>
            </article>
          ))}
        </div>

        {/* Park Safari Tour removed to keep Facilities UI balanced */}
      </div>
    </section>
  )
}
