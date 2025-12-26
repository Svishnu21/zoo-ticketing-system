import butterflyOne from '@/assets/images/butterfly park.webp'
import butterflyTwo from '@/assets/images/birds.webp'
import ourAnimalsBanner from '@/assets/images/animals.webp'
import { animals } from '@/data/content'
import { useLanguage } from '@/providers/LanguageProvider'

const galleryCardClasses =
  'group relative h-64 cursor-pointer overflow-hidden rounded-3xl border border-forest-green/15 bg-white shadow-lg transition-transform duration-300 ease-smooth hover:-translate-y-1 hover:shadow-2xl'

const galleryPlaceholderClasses =
  'flex h-64 flex-col items-center justify-center rounded-3xl border-2 border-dashed border-forest-green/30 bg-white/80 p-8 text-center text-forest-green'

const buildGallery = (items: typeof animals, category: 'Mammals' | 'Birds' | 'Reptiles', size: number) => {
  const selection = items.filter((animal) => animal.category === category).slice(0, size)
  return Array.from({ length: size }, (_, index) => selection[index] ?? null)
}

export function ZooPage() {
  const { language } = useLanguage()

  const mammals = buildGallery(animals, 'Mammals', 6)
  const aquatic = buildGallery(animals, 'Reptiles', 4)
  const birds = buildGallery(animals, 'Birds', 4)
  const butterflies = [
    {
      src: butterflyOne,
      alt: {
        en: 'Butterfly resting on a leaf',
        ta: 'இலை மீது அமர்ந்துள்ள வண்ணத்துப்பூச்சி',
      },
    },
    {
      src: butterflyTwo,
      alt: {
        en: 'Butterfly with vibrant wings',
        ta: 'வண்ணமயமான சிறகுகளுடன் வண்ணத்துப்பூச்சி',
      },
    },
  ] as const

  return (
    <section className="page-enter bg-soft-bg pb-20">
      <div className="relative -mx-4 h-64 overflow-hidden rounded-b-[48px] bg-forest-green/30 sm:-mx-0 sm:h-72">
        <img
          src={ourAnimalsBanner}
          alt={language === 'en' ? 'Wild Animals banner' : 'வன விலங்குகள் பேனர்'}
          className="h-full w-full object-cover"
          loading="lazy"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-black/20 to-transparent" />
        <div className="absolute inset-0 flex flex-col items-center justify-center px-6 text-center text-white">
          <p className="max-w-2xl text-sm text-white/85 md:text-base">
            {language === 'en'
              ? 'Meet the incredible mammals, aquatic life, and birds that call Kurumbapatti home.'
              : 'குரும்பட்டி வீட்டாகக் கொண்டுள்ள அற்புதமான பாலூட்டிகள், நீரியல் உயிர்கள் மற்றும் பறவைகளை சந்தியுங்கள்.'}
          </p>
        </div>
      </div>

      <div className="container space-y-16 pt-10">
        <div className="text-center">
          <h1 className="text-4xl font-black text-forest-green md:text-5xl mx-auto">
            {language === 'en' ? 'Wild Animals' : 'வன விலங்குகள்'}
          </h1>
          <p className="mt-3 text-xl text-muted-foreground">{language === 'en' ? 'வன விலங்குகள்' : 'Wild Animals'}</p>
        </div>

        <section className="space-y-8">
          <header className="text-center">
            <h2 className="text-3xl font-black text-forest-green md:text-4xl mx-auto">
              {language === 'en' ? 'Mammals Gallery' : 'பாலூட்டிகள் தொகுப்பு'}
            </h2>
            <p className="mt-2 text-base text-muted-foreground md:text-lg">
              {language === 'en'
                ? 'Explore six of the most charismatic mammals ready for your visit.'
                : 'உங்கள் வருகைக்காக காத்திருக்கும் ஆறு சிறப்பான பாலூட்டிகளை பார்க்கவும்.'}
            </p>
          </header>
          <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
            {mammals.map((animal, index) => (
              animal ? (
                <article key={animal.name.en} className={galleryCardClasses}>
                  <img
                    src={animal.image}
                    alt={animal.name[language]}
                    className="h-full w-full object-cover transition duration-500 ease-smooth group-hover:scale-105"
                    loading="lazy"
                  />
                </article>
              ) : (
                <div key={`mammal-placeholder-${index}`} className={galleryPlaceholderClasses}>
                  <span className="text-lg font-semibold">
                    {language === 'en' ? 'Image slot ready' : 'புதிய படங்களுக்கு இடம் தயாராக உள்ளது'}
                  </span>
                  <p className="mt-2 text-sm text-forest-green/80">
                    {language === 'en'
                      ? 'Add a new mammal asset to complete this gallery tile.'
                      : 'இந்த தொகுப்பை நிரப்ப ஒரு புதிய பாலூட்டி படத்தை சேர்க்கவும்.'}
                  </p>
                </div>
              )
            ))}
          </div>
        </section>

        <section className="space-y-8">
          <header className="text-center">
            <h2 className="text-3xl font-black text-forest-green md:text-4xl mx-auto">
              {language === 'en' ? 'Aquarium Highlights' : 'அழகிய நீரியல் தொகுப்பு'}
            </h2>
            <p className="mt-2 text-base text-muted-foreground md:text-lg">
              {language === 'en'
                ? 'Dive into four serene aquatic habitats and their vibrant residents.'
                : 'நான்கு அழகான நீரியல் வாழிடங்களையும் அவற்றின் வண்ணமயமான வாழ்வினங்களையும் காணுங்கள்.'}
            </p>
          </header>
          <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
            {aquatic.map((animal, index) => (
              animal ? (
                <article key={animal.name.en} className={galleryCardClasses}>
                  <img
                    src={animal.image}
                    alt={animal.name[language]}
                    className="h-full w-full object-cover transition duration-500 ease-smooth group-hover:scale-105"
                    loading="lazy"
                  />
                </article>
              ) : (
                <div key={`aquatic-placeholder-${index}`} className={galleryPlaceholderClasses}>
                  <span className="text-lg font-semibold">
                    {language === 'en' ? 'Aquarium slot open' : 'அக்வேரியம் இடம் திறந்திருக்கும்'}
                  </span>
                  <p className="mt-2 text-sm text-forest-green/80">
                    {language === 'en'
                      ? 'Drop in a new aquatic asset to showcase here.'
                      : 'இங்கே காட்சிப்படுத்த புதிய நீரியல் படத்தைச் சேர்க்கவும்.'}
                  </p>
                </div>
              )
            ))}
          </div>
        </section>

        <section className="space-y-8">
          <header className="text-center">
            <h2 className="text-3xl font-black text-forest-green md:text-4xl mx-auto">
              {language === 'en' ? 'Birds & Reptiles' : 'பறவைகள் மற்றும் ஊர்வன'}
            </h2>
            <p className="mt-2 text-base text-muted-foreground md:text-lg">
              {language === 'en'
                ? 'Discover four featured species from the aviary and herpetarium collections.'
                : 'பறவைகள் மற்றும் ஊர்வனக் காட்சியகங்களில் இருக்கும் நான்கு பிரத்யேக உயிரினங்களை அறிந்துகொள்ளுங்கள்.'}
            </p>
          </header>
          <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
            {birds.map((animal, index) => (
              animal ? (
                <article key={animal.name.en} className={galleryCardClasses}>
                  <img
                    src={animal.image}
                    alt={animal.name[language]}
                    className="h-full w-full object-cover transition duration-500 ease-smooth group-hover:scale-105"
                    loading="lazy"
                  />
                </article>
              ) : (
                <div key={`bird-placeholder-${index}`} className={galleryPlaceholderClasses}>
                  <span className="text-lg font-semibold">
                    {language === 'en' ? 'Aviary slot waiting' : 'பறவைக் கூட இடம் காத்திருக்கிறது'}
                  </span>
                  <p className="mt-2 text-sm text-forest-green/80">
                    {language === 'en'
                      ? 'Add a bird image from assets to complete this row.'
                      : 'இந்த வரிசையை முடிக்க ஒரு பறவை படத்தைச் சேர்க்கவும்.'}
                  </p>
                </div>
              )
            ))}
          </div>
        </section>

        <section className="space-y-8">
          <header className="text-center">
            <h2 className="text-3xl font-black text-forest-green md:text-4xl mx-auto">
              {language === 'en' ? 'Butterfly Park' : 'வண்ணத்துப்பூச்சிப் பூங்கா'}
            </h2>
            <p className="mt-2 text-base text-muted-foreground md:text-lg">
              {language === 'en'
                ? 'See the collection of vibrant and exotic butterflies.'
                : 'வண்ணமயமான மற்றும் அபூர்வமான வண்ணத்துப்பூச்சிகளின் தொகுப்பைப் பாருங்கள்.'}
            </p>
          </header>
          <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
            {butterflies.map((butterfly) => (
              <article key={butterfly.src} className={galleryCardClasses}>
                <img
                  src={butterfly.src}
                  alt={butterfly.alt[language]}
                  className="h-full w-full object-cover transition duration-500 ease-smooth group-hover:scale-105"
                  loading="lazy"
                />
              </article>
            ))}
          </div>
        </section>
      </div>
    </section>
  )
}
