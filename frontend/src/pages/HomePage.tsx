import { Link } from 'react-router-dom'

import { Button } from '@/components/ui/Button'
import { HeroSlider } from '@/components/hero/HeroSlider'
import { welcomeContent } from '@/data/content'
import { useLanguage } from '@/providers/LanguageProvider'
import mammalsImage from '@/assets/images/animals.jpg'
import aquariumImage from '@/assets/images/aquarium.jpg'
import birdsImage from '@/assets/images/birds.jpg'
import butterflyImage from '@/assets/images/butterfly park.jpeg'
import visitIllustration from '@/assets/images/visit us.jpg'

export function HomePage() {
  const { language } = useLanguage()

  const highlightCards = [
    {
      id: 'mammals',
      tag: {
        en: 'Mammals',
        ta: 'பாலூட்டிகள்',
      },
      title: {
        en: 'Mammals',
        ta: 'பாலூட்டிகள்',
      },
      description: {
        en: 'Discover diverse mammal residents.',
        ta: 'பல்வகை பாலூட்டிகளை அறிந்துகொள்ளுங்கள்.',
      },
      image: mammalsImage,
      to: '/zoo?focus=mammals',
    },
    {
      id: 'butterfly',
      tag: {
        en: 'Reptile World',
        ta: 'உரிமிருகங்கள் உலகம்',
      },
      title: {
        en: 'Reptiles',
        ta: 'உரிமிருகங்கள்',
      },
      description: {
        en: 'Discover the fascinating world of reptiles.',
        ta: 'மிகவும் சுவாரஸ்யமான உரிமிருகங்களின் உலகத்தை கண்டறியுங்கள்.',
      },
      image: butterflyImage,
      to: '/zoo?focus=butterfly',
    },
    {
      id: 'birds',
      tag: {
        en: 'Birds',
        ta: 'பறவைகள்',
      },
      title: {
        en: 'Birds',
        ta: 'பறவைகள்',
      },
      description: {
        en: 'Meet colourful birds from across the region.',
        ta: 'பல மாவட்டங்களில் இருந்து வந்த வண்ணமயமான பறவைகளைச் சந்தியுங்கள்.',
      },
      image: birdsImage,
      to: '/zoo?focus=birds',
    },
    {
      id: 'aquarium',
      tag: {
        en: 'Aquarium',
        ta: 'அழகிய நீரவியல்',
      },
      title: {
        en: 'Aquarium',
        ta: 'நீரியல் உலகம்',
      },
      description: {
        en: 'Dive into serene underwater habitats.',
        ta: 'அமைதியான நீரியல் வாழ்விடங்களை அனுபவிக்கவும்.',
      },
      image: aquariumImage,
      to: '/zoo?focus=aquarium',
    },
  ] as const

  return (
    <div className="space-y-14">
      <section className="relative isolate w-full">
        <HeroSlider />
      </section>

      {/* Gap filler bar removed per request */}

      <section className="page-enter bg-soft-bg py-12">
        <div className="container">
          <div className="mx-auto flex w-[92%] max-w-5xl flex-col items-center rounded-[10px] border-t-[5px] border-t-forest-green bg-white p-8 text-center shadow-[0_4px_12px_rgba(0,0,0,0.05)] sm:p-10 md:w-full md:p-12 lg:p-16">
            <h2 className="text-center text-4xl font-bold text-forest-green md:text-5xl">
              <span>{welcomeContent.heading.en}</span>
              <span className="mt-2 block text-3xl font-semibold text-forest-green/90 md:text-4xl">
                {welcomeContent.heading.ta}
              </span>
            </h2>
            <div className="mt-6 space-y-4 text-lg leading-relaxed text-muted-foreground">
              {welcomeContent.paragraphs.map((paragraph) => (
                <p key={paragraph.en}>{paragraph[language]}</p>
              ))}
            </div>
            <div className="mt-10 flex flex-col items-center gap-4 md:flex-row md:justify-center">
              <Button asChild variant="hero" size="lg">
                <Link to="/rules" className="min-w-[220px]">
                  Park Rules | பூங்கா விதிகள்
                </Link>
              </Button>
              <p className="text-sm text-muted-foreground">
                {language === 'en'
                  ? 'Tap to review the full list of visitor guidelines before your adventure.'
                  : 'உங்கள் பயணத்திற்கு முன் பார்வையாளருக்கான முழு வழிகாட்டுதல்களை காண தொடுங்கள்.'}
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="relative overflow-hidden py-12">
        <div className="absolute inset-0 -z-10 bg-gradient-to-b from-forest-green/10 via-transparent to-forest-green/10" />
        <div className="container space-y-10">
          <div className="mx-auto max-w-3xl text-center">
            <h2 className="text-3xl font-black tracking-tight text-forest-green md:text-5xl mx-auto">
              <span className="bg-gradient-to-r from-forest-green via-vibrant-green to-forest-green bg-clip-text text-transparent">
                Meet wild Animals
              </span>
              <span className="mt-2 block text-2xl font-semibold text-forest-green/90 md:text-3xl">
                வன விலங்குகள் சந்தியுங்கள்
              </span>
            </h2>
            <p className="mt-4 text-xl font-medium text-muted-foreground/90 text-center w-full mx-auto">
              {language === 'en'
                ? 'Discover the diverse species at our park'
                : 'எங்கள் பூங்காவில் வாழும் பன்முக உயிரினங்களை அறிந்துகொள்ளுங்கள்'}
            </p>
          </div>

          <div className="grid max-w-6xl gap-7 md:grid-cols-2 lg:grid-cols-4 xl:gap-8 mx-auto">
            {highlightCards.map((card) => (
              <Link
                key={card.id}
                to={card.to}
                className="group relative block overflow-hidden rounded-3xl bg-soft-bg shadow-lg transition duration-300 ease-smooth hover:-translate-y-1 hover:shadow-2xl"
              >
                <figure className="relative h-72 w-full overflow-hidden">
                  <img
                    src={card.image}
                    alt={`${card.title.en} | ${card.title.ta}`}
                    className="h-full w-full transform rounded-2xl object-cover transition duration-500 ease-smooth group-hover:scale-110"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                  <figcaption className="absolute bottom-0 left-0 w-full space-y-4 p-6">
                    <div className="inline-flex flex-col items-start rounded-full bg-accent-yellow px-4 py-1 text-black drop-shadow">
                      <span className="text-[11px] font-bold uppercase tracking-[0.3em]">{card.tag.en}</span>
                      <span className="text-xs font-semibold">{card.tag.ta}</span>
                    </div>
                    <h3 className="text-3xl font-black leading-tight text-white drop-shadow-xl md:text-4xl">
                      <span>{card.title.en}</span>
                      <span className="mt-1 block text-2xl font-semibold text-white/90 md:text-3xl">
                        {card.title.ta}
                      </span>
                    </h3>
                    <p className="text-sm font-medium text-white/80 md:text-base">
                      {card.description[language]}
                    </p>
                  </figcaption>
                </figure>
              </Link>
            ))}
          </div>

          <div className="text-center">
            <Link
              to="/animal-info"
              className="inline-block rounded-2xl bg-vibrant-green px-10 py-3 text-lg font-semibold text-white shadow-lg transition-colors duration-300 ease-smooth hover:bg-forest-green"
            >
              {language === 'en' ? 'View All Species' : 'அனைத்து உயிரினங்களையும் காண'}
            </Link>
          </div>
        </div>
      </section>

      <section className="bg-soft-bg py-12">
        <div className="container">
          <div className="grid max-w-6xl w-[92%] md:w-full mx-auto grid-cols-1 items-center gap-8 rounded-3xl bg-white/95 p-6 shadow-lg md:grid-cols-2 md:p-10">
            <div className="overflow-hidden rounded-3xl shadow-lg">
              <img
                src={visitIllustration}
                alt={language === 'en' ? 'Friendly park illustration' : 'அன்பான பூங்கா விளக்கப்படம்'}
                className="h-full w-full rounded-2xl object-cover"
                loading="lazy"
              />
            </div>
            <div className="flex flex-col justify-center">
              <h2 className="text-3xl font-black tracking-tight text-forest-green md:text-5xl">
                <span>Preparing for Your Visit</span>
                <span className="mt-2 block text-2xl font-semibold text-forest-green/90 md:text-3xl">
                  உங்கள் வருகைக்கான தயாரிப்பு
                </span>
              </h2>
              <ul className="mt-6 space-y-3 text-lg font-medium leading-relaxed text-muted-foreground/95">
                <li>
                  {language === 'en'
                    ? 'Please wear comfortable, natural-colored clothing. Avoid bright colors.'
                    : 'ஆறுதலான இயல்பான நிற உடைகளை அணியுங்கள். பிரகாசமான நிறங்களை தவிர்க்கவும்.'}
                </li>
                <li>
                  {language === 'en'
                    ? 'Comfortable walking shoes are highly recommended.'
                    : 'நடப்பதற்கான ஆறுதலான செருப்புகளை அணிவது நல்லது.'}
                </li>
                <li>
                  {language === 'en'
                    ? 'This is a plastic-free zone. Single-use plastics are not permitted.'
                    : 'இது பிளாஸ்டிக் இல்லா பகுதி. ஒருமுறை பயன்படும் பிளாஸ்டிக் பொருட்கள் அனுமதிக்கப்படாது.'}
                </li>
                <li>
                  {language === 'en'
                    ? 'Keep food securely packed in a backpack to avoid snatching by free-ranging monkeys.'
                    : 'சுதந்திரமாகச் சுற்றும் குரங்குகள் பறிப்பதைத் தவிர்க்க உணவுகளைப் பாதுகாப்பாகப் பையில் வைத்திருங்கள்.'}
                </li>
                <li>
                  {language === 'en'
                    ? 'Help us stay clean: Please use dustbins or carry your waste back.'
                    : 'உங்கள் குப்பையை குப்பைத்தொட்டியில் போடுங்கள் அல்லது உங்களுடன் எடுத்துச் சென்று சுத்தமாக வைத்திருங்கள்.'}
                </li>
                <li>
                  {language === 'en'
                    ? 'A battery-operated vehicle is available for accessibility.'
                    : 'அணுகலுக்காக மின்சார வாகன வசதி உள்ளது.'}
                </li>
              </ul>
              <p className="mt-8 rounded-3xl bg-gradient-to-r from-forest-green/10 via-vibrant-green/10 to-forest-green/10 p-5 text-lg font-semibold text-forest-green">
                {language === 'en'
                  ? 'We wish you an enriching and educative experience at the park!'
                  : 'பூங்காவில் ஒரு அறிவூட்டும், அனுபவமிக்க பயணத்தை நீங்கள் மேற்கொள்வதற்கு நாங்கள் வாழ்த்துகிறோம்!'}
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
