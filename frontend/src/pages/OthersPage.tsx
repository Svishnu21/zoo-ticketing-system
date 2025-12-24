import { Link } from 'react-router-dom'
import { Image, Newspaper, ScrollText, Map } from 'lucide-react'

import { useLanguage } from '@/providers/LanguageProvider'

const otherLinks = [
  {
    id: 'gallery',
    icon: Image,
    title: { en: 'Gallery', ta: 'படத்தொகுப்பு' },
    description: {
      en: 'Walk through vivid photo memories captured inside the park.',
      ta: 'பூங்காவின் நிறமிகு நினைவுகளைப் படங்களாக அனுபவிக்கவும்.',
    },
    to: '/gallery',
  },
  {
    id: 'publications',
    icon: Newspaper,
    title: { en: 'Publications', ta: 'வெளியீடுகள்' },
    description: {
      en: 'Download brochures, reports, and educational handouts.',
      ta: 'விளம்பரக் குறிப்புகள், அறிக்கைகள், கல்வி குறிப்புகளைப் பதிவிறக்குங்கள்.',
    },
    to: '/about/publications',
  },
  {
    id: 'tenders',
    icon: ScrollText,
    title: { en: 'Tenders', ta: 'டெண்டர்கள்' },
    description: {
      en: 'Track open tenders and procurement announcements.',
      ta: 'திறந்த டெண்டர்கள் மற்றும் கொள்முதல் அறிவிப்புகளைப் பார்வையிடுங்கள்.',
    },
    to: '/tenders',
  },
  {
    id: 'chart',
    icon: Map,
    title: { en: "Zoo's Chart", ta: 'பூங்கா அமைப்பு' },
    description: {
      en: 'Understand our organisational structure and reporting lines.',
      ta: 'எங்கள் அமைப்பு முறை மற்றும் பொறுப்புக் கோட்டுகளை அறிக.',
    },
    to: '/others/zoo-chart',
  },
]

export function OthersPage() {
  const { language } = useLanguage()

  return (
    <section className="page-enter bg-soft-bg py-20">
      <div className="container space-y-10">
        <header className="text-center space-y-4">
          <p className="text-xs font-semibold uppercase tracking-[0.4em] text-forest-green/70">
            {language === 'en' ? 'More Resources' : 'மேலும் தகவல்கள்'}
          </p>
          <h1 className="text-4xl font-bold text-forest-green md:text-5xl">
            {language === 'en' ? 'Others' : 'மற்றவை'}
          </h1>
          <p className="text-lg text-muted-foreground">
            {language === 'en'
              ? 'Quick access to galleries, publications, tenders, and organisational details.'
              : 'படத்தொகுப்பு, வெளியீடுகள், டெண்டர்கள் மற்றும் அமைப்பு விவரங்களை இங்கே காணலாம்.'}
          </p>
        </header>

        <div className="grid gap-8 md:grid-cols-2">
          {otherLinks.map((item) => (
            <Link
              key={item.id}
              to={item.to}
              className="group flex flex-col gap-4 rounded-3xl border border-forest-green/15 bg-white p-8 shadow-forest-lg transition hover:-translate-y-1 hover:shadow-forest-xl"
            >
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-forest text-white shadow-forest-md">
                <item.icon size={26} aria-hidden="true" />
              </div>
              <div className="space-y-2">
                <h2 className="text-2xl font-bold text-forest-green">{item.title[language]}</h2>
                <p className="text-base text-muted-foreground">{item.description[language]}</p>
              </div>
              <span className="text-sm font-semibold text-forest-green/80">
                {language === 'en' ? 'Open resource →' : 'வழிமுறையைத் திறக்க →'}
              </span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  )
}
