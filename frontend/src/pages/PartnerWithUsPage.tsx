import { Link } from 'react-router-dom'
import { Handshake, Leaf } from 'lucide-react'

import { Button } from '@/components/ui/Button'
import { useLanguage } from '@/providers/LanguageProvider'

const partnerContent = {
  title: {
    en: 'Partner With Kurumbapatti Zoological Park',
    ta: 'குரும்பப்பட்டி உயிரியல் பூங்காவுடன் இணைவீர்',
  },
  subtitle: {
    en: 'Co-create conservation, education, and community impact initiatives.',
    ta: 'பாதுகாப்பு, கல்வி மற்றும் சமூக தாக்க முயற்சிகளை இணைந்து உருவாக்குங்கள்.',
  },
  intro: {
    en: 'From CSR collaborations to curated adoption drives, our team offers bespoke partnership models that keep Salem\'s seasonal tropical forests thriving.',
    ta: 'CSR ஒத்துழைப்புகளிலிருந்து தேர்ந்தெடுத்த தத்தெடுப்பு முயற்சிகள் வரை, சேலத்தின் காலமாற்ற வெப்பமண்டலக் காடுகள் செழிக்க எங்கள் குழு தனிப்பட்ட கூட்டணிகளை வழங்குகிறது.',
  },
  cards: [
    {
      id: 'csr',
      title: {
        en: 'CSR Activity & Impact',
        ta: 'CSR செயல்பாடு மற்றும் தாக்கம்',
      },
      body: {
        en: 'Support habitat upgrades, veterinary equipment, solar lighting, or student outreach programmes through customised CSR proposals.',
        ta: 'வாழிட மேம்பாடுகள், கால்நடை மருத்துவ உபகரணங்கள், சோலார் விளக்குகள் அல்லது மாணவர் விழிப்புணர்வு திட்டங்களுக்கு விருப்பத்திற்கேற்ப CSR முன்மொழிவுகள் மூலம் ஒத்துழையுங்கள்.',
      },
      link: '/partner-with-us/csr-activity',
      cta: {
        en: 'View CSR Activity',
        ta: 'CSR செயல்பாட்டைப் பார்க்க',
      },
    },
    {
      id: 'adoption',
      title: {
        en: 'Wild Animal Adoption Programme',
        ta: 'வன விலங்கு தத்தெடுப்பு திட்டம்',
      },
      body: {
        en: 'Choose a wild animal, sponsor its care, and receive curated acknowledgements that celebrate your commitment.',
        ta: 'ஒரு வன விலங்கைக் கொண்டு, அதன் பராமரிப்பிற்கு ஆதரவு அளித்து, உங்கள் ஒத்துழைப்பை கொண்டாடும் சிறப்பு பாராட்டுகளைப் பெறுங்கள்.',
      },
      link: '/adoption',
      cta: {
        en: 'Adopt a Wild Animal',
        ta: 'வன விலங்கு தத்தெடுக்க',
      },
    },
  ],
}

export function PartnerWithUsPage() {
  const { language } = useLanguage()

  return (
    <section className="page-enter bg-soft-bg py-20">
      <div className="container space-y-10">
        <header className="mx-auto max-w-3xl text-center space-y-4">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-gradient-forest text-white shadow-forest-md">
            <Handshake size={28} />
          </div>
          <p className="text-xs font-semibold uppercase tracking-[0.4em] text-forest-green/70">
            {language === 'en' ? 'Collaborate' : 'கூட்டாண்மை'}
          </p>
          <h1 className="text-4xl font-bold text-forest-green md:text-5xl">{partnerContent.title[language]}</h1>
          <p className="text-xl text-muted-foreground">{partnerContent.subtitle[language]}</p>
          <p className="text-base text-muted-foreground">{partnerContent.intro[language]}</p>
        </header>

        <div className="grid gap-8 md:grid-cols-2">
          {partnerContent.cards.map((card) => (
            <article
              key={card.id}
              className="flex flex-col gap-6 rounded-3xl border border-forest-green/15 bg-white p-8 shadow-forest-lg"
            >
              <Leaf className="text-forest-green" size={36} aria-hidden="true" />
              <div className="space-y-3">
                <h2 className="text-2xl font-bold text-forest-green">{card.title[language]}</h2>
                <p className="text-base text-muted-foreground">{card.body[language]}</p>
              </div>
              <Button asChild variant="hero" className="mt-auto w-full">
                <Link to={card.link}>{card.cta[language]}</Link>
              </Button>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}
