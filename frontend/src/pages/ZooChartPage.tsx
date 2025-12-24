import chartImage from '@/assets/images/frame.jpg'

import { useLanguage } from '@/providers/LanguageProvider'

export function ZooChartPage() {
  const { language } = useLanguage()

  return (
    <section className="page-enter bg-soft-bg py-20">
      <div className="container max-w-5xl space-y-10">
        <header className="space-y-4 text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.4em] text-forest-green/70">
            {language === 'en' ? "Zoo's Chart" : 'பூங்கா அமைப்பு வரைபடம்'}
          </p>
          <h1 className="text-4xl font-bold text-forest-green md:text-5xl">
            {language === 'en' ? 'Organisation Structure' : 'அமைப்பு அமைப்பு'}
          </h1>
          <p className="text-lg text-muted-foreground">
            {language === 'en'
              ? 'An overview of reporting lines and functional teams that keep the park operational.'
              : 'பூங்கா செயல்பாடுகளை முன்னெடுக்கும் பொறுப்பு மற்றும் பணிக்குழுக்களின் சுருக்கம்.'}
          </p>
        </header>

        <div className="rounded-3xl border border-forest-green/15 bg-white p-6 shadow-forest-lg">
          <img
            src={chartImage}
            alt={language === 'en' ? 'Kurumbapatti Zoo organisational chart' : 'குரும்பட்டி பூங்கா அமைப்பு வரைபடம்'}
            className="w-full rounded-2xl object-cover"
            loading="lazy"
          />
        </div>

        <p className="text-base text-muted-foreground">
          {language === 'en'
            ? 'For detailed departmental contacts, please write to curator@kurumbapattizoo.com. The chart is updated whenever responsibilities shift during special projects or seasonal events.'
            : 'துறை வாரியான தொடர்புகளுக்காக curator@kurumbapattizoo.com க்கு எழுதுங்கள். சிறப்பு திட்டங்கள் அல்லது பருவ நிகழ்வுகள் காரணமாக பொறுப்புகள் மாறும் போதெல்லாம் இந்த வரைபடம் புதுப்பிக்கப்படுகிறது.'}
        </p>
      </div>
    </section>
  )
}
