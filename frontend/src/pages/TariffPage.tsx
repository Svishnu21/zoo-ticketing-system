import { Link } from 'react-router-dom'
import { ArrowRight, Trees } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

import { Button } from '@/components/ui/Button'
import { feeStructure, tariffItems, type LocalizedText } from '@/data/content'
import { useLanguage } from '@/providers/LanguageProvider'

type TariffCard = {
  id: string
  title: LocalizedText
  tagline: LocalizedText
  href: string
  icon: LucideIcon
  startingPrice?: number
  theme: {
    background: string
    border: string
    accentClass: string
    iconBackground: string
    taglineClass: string
  }
}

const priceById = Object.fromEntries(tariffItems.map((item) => [item.id, item.price])) as Record<string, number>

const zooTicketCard: TariffCard = {
  id: 'zoo',
  title: {
    en: 'Zoo tickets',
    ta: 'பூங்கா  டிக்கெட்டுகள்',
  },
  tagline: {
    en: 'Explore every habitat with curated passes',
    ta: 'சிறப்பான டிக்கெட்டுகளுடன் அனைத்து வாழிடங்களையும் அனுபவிக்க',
  },
  href: '/tickets/zoo',
  icon: Trees,
  startingPrice: priceById.adultEntry,
  theme: {
    background: 'bg-[#E8F5E9]',
    border: 'border-[#A8D5B6]',
    accentClass: 'text-[#1F5135]',
    iconBackground: 'bg-white/80',
    taglineClass: 'text-[#3F6C53]',
  },
}

const bookingSteps = [
  {
    id: 'pick-experience',
    title: {
      en: 'Choose an experience card',
      ta: 'ஒரு அனுபவ அட்டையைத் தேர்வு செய்யுங்கள்',
    },
    description: {
      en: 'Tap any tile above to view ticket categories and pricing.',
      ta: 'மேலுள்ள அட்டைகளைத் தட்டினால் டிக்கெட் வகைகள் மற்றும் கட்டணங்களை காணலாம்.',
    },
  },
  {
    id: 'set-date',
    title: {
      en: 'Pick your visit date and add tickets',
      ta: 'உங்கள் வருகை தேதியைத் தேர்ந்து டிக்கெட்டுகளைச் சேர்க்கவும்',
    },
    description: {
      en: 'Reserve seats or parking with our quick date scroller.',
      ta: 'விரைவு தேதி ஸ்க்ரோலரைப் பயன்படுத்தி இருக்கைகள் அல்லது நிறுத்த இடத்தை முன்பதிவு செய்யுங்கள்.',
    },
  },
  {
    id: 'confirm-entry',
    title: {
      en: 'Confirm at the counter on your visit day',
      ta: 'வருகை நாளில் கவுண்டரில் உறுதிப்படுத்துங்கள்',
    },
    description: {
      en: 'Show your booking confirmation at the entrance for seamless entry.',
      ta: 'நுழைவாயிலில் உங்கள் முன்பதிவு உறுதிப்பாட்டைக் காண்பித்து எளிதான நுழைவைப் பெறுங்கள்.',
    },
  },
]

export function TariffPage() {
  const { language } = useLanguage()
  const card = zooTicketCard
  const Icon = card.icon

  return (
    <section className="page-enter bg-soft-bg py-20">
      <div className="container space-y-16">
        <div className="text-center">
          <h1 className="text-5xl font-bold text-forest-green">{language === 'en' ? 'Plan Your Visit' : 'உங்கள் வருகையைத் திட்டமிடுங்கள்'}</h1>
          <p className="mt-2 text-xl text-muted-foreground">{language === 'en' ? 'கட்டணங்கள்' : 'Plan Your Visit'}</p>
        </div>

        <div className="grid gap-8 lg:grid-cols-2">
          <Link
            to={card.href}
            className={`group flex h-full flex-col rounded-3xl border ${card.theme.border} ${card.theme.background} p-8 shadow-lg transition duration-300 ease-out focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-forest-green/20 hover:-translate-y-1 hover:scale-[1.02] hover:shadow-2xl`}
          >
            <div className="flex flex-1 flex-col text-center sm:text-left">
              <span className={`mx-auto flex h-16 w-16 items-center justify-center rounded-2xl ${card.theme.iconBackground} ${card.theme.accentClass} transition-transform duration-300 group-hover:scale-110 sm:mx-0`}>
                <Icon size={32} aria-hidden="true" />
              </span>

              <h2 className={`mt-6 text-3xl font-semibold ${card.theme.accentClass}`}>
                {card.title[language]}
              </h2>
              <p className={`mt-3 text-base leading-7 ${card.theme.taglineClass}`}>
                {card.tagline[language]}
              </p>

              <div className="mt-auto flex w-full flex-col items-center gap-3 pt-4 sm:items-start">
                {typeof card.startingPrice === 'number' && !Number.isNaN(card.startingPrice) && (
                  <span className="text-sm font-semibold text-forest-green/80">
                    {language === 'en' ? 'From' : 'தொடக்கம்'} ₹ {card.startingPrice}
                  </span>
                )}

                <span
                  className={`inline-flex items-center gap-2 rounded-full px-5 py-2 text-sm font-semibold transition duration-200 bg-[#FFD54F] text-[#0b3520] shadow-sm hover:brightness-95`}
                >
                  {language === 'en' ? 'Book now' : 'இப்போது முன்பதிவு'}
                  <ArrowRight size={16} aria-hidden="true" />
                </span>
              </div>
            </div>
          </Link>

          <div className="flex flex-col rounded-3xl border border-forest-green/15 bg-white p-8 shadow-xl">
            <h2 className="text-3xl font-semibold text-forest-green">
              {language === 'en' ? 'How to Book' : 'எப்படி முன்பதிவு செய்வது'}
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              {language === 'en'
                ? 'Follow these fast steps for a smooth onsite validation after checkout.'
                : 'முன்பதிவுக்குப் பின் கவுண்டரில் தளர்வான சரிபார்ப்புக்கு இந்த விரைவு படிகளைப் பின்பற்றுங்கள்.'}
            </p>

            <div className="mt-6 space-y-4">
              {bookingSteps.map((step, index) => (
                <div
                  key={step.id}
                  className="flex items-start gap-4 rounded-2xl border border-forest-green/10 bg-[#F6FBF8] p-4 transition hover:border-forest-green/30"
                >
                  <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#E8F5E9] text-base font-semibold text-forest-green">
                    {index + 1}
                  </span>
                  <div>
                    <p className="font-semibold text-forest-green">
                      {language === 'en' ? step.title.en : step.title.ta}
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {step.description[language]}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            <Button asChild className="mt-6 w-full sm:w-auto">
              <Link to="/tickets/zoo">
                {language === 'en' ? 'Start with Zoo tickets' : 'ஜூ டிக்கெட்டுடன் தொடங்குங்கள்'}
                <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
              </Link>
            </Button>
          </div>
        </div>

        <div className="space-y-6">
          <div className="text-center lg:text-left">
            <p className="text-sm font-semibold uppercase tracking-[0.35em] text-forest-green/60">
              {language === 'en' ? 'Fee Details' : 'கட்டண விவரங்கள்'}
            </p>
            <h2 className="mt-2 text-3xl font-bold text-forest-green">
              {language === 'en' ? 'Fee Structure' : 'கட்டண விவரம்'}
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              {language === 'en'
                ? 'Updated ticket categories, add-ons, and concessions for quick reference.'
                : 'விரைவான குறிப்புக்காக புதுப்பிக்கப்பட்ட டிக்கெட் வகைகள், சேர்த்திகள் மற்றும் சலுகைகள்.'}
            </p>
          </div>

          <div className="rounded-3xl border border-forest-green/15 bg-white/95 p-8 shadow-xl backdrop-blur-sm">
            <div className="w-full overflow-x-auto pb-4">
              <div className="min-w-[720px] overflow-hidden rounded-2xl border border-forest-green/10">
                <table className="w-full divide-y divide-forest-green/10 text-left">
                  <thead className="bg-forest-green text-white">
                    <tr>
                      <th className="px-6 py-4 text-sm font-semibold uppercase tracking-wide">S.No</th>
                      <th className="px-6 py-4 text-sm font-semibold uppercase tracking-wide">
                        {language === 'en' ? 'Description' : 'விவரம்'}
                      </th>
                      <th className="px-6 py-4 text-right text-sm font-semibold uppercase tracking-wide">
                        {language === 'en' ? 'Revised Fee' : 'திருத்திய கட்டணம்'}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {feeStructure.map((row, index) => (
                      <tr
                        key={row.id}
                        className={index % 2 === 0 ? 'bg-white' : 'bg-[#F5FBF7]'}
                      >
                        <td className="px-6 py-4 text-sm font-semibold text-forest-green">{row.serial}</td>
                        <td className="px-6 py-4 text-sm text-muted-foreground">{row.description[language]}</td>
                        <td className="px-6 py-4 text-right text-sm font-semibold text-foreground">₹ {row.fee}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
