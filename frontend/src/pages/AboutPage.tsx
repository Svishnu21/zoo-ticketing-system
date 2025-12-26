import objectivesImage from '@/assets/images/objectives.jpg'
import { useLanguage } from '@/providers/LanguageProvider'

export function AboutPage() {
  useLanguage()
  return (
    <div className="page-enter space-y-16">
  <section className="relative isolate bg-soft-bg pt-10 pb-16">
    <div className="container max-w-4xl space-y-8">
          <header className="mx-auto max-w-2xl space-y-4 text-center">
            <h1 className="text-4xl font-extrabold tracking-tight text-forest-green md:text-5xl">
              <span>About the Park</span>
              <span className="mt-2 block text-3xl font-semibold text-forest-green md:text-4xl">
                பூங்கா பற்றி
              </span>
            </h1>
            <p className="text-lg font-medium text-forest-green/95 md:text-xl text-center mb-1">
              <span className="block">Stories of conservation, community, and care.</span>
            </p>
          </header>

          <div className="mx-auto max-w-3xl space-y-8 rounded-[32px] bg-white p-8 text-left shadow-2xl backdrop-blur md:p-12">
            <article className="space-y-6">
              <h2 className="text-2xl md:text-3xl font-bold" style={{ color: '#FACC15' }}>
                Park History
              </h2>

              <p className="text-base leading-relaxed text-black" style={{ textAlign: 'justify' }}>
                Kurumbapatti Zoological Park in its present location amidst reserve forest areas, at the foothills of Shevaroyan Hills was initially opened to public as a Forest Recreation Centre, within Kurumbapatti Reserve Forest under Salem Circle. The recreation centre was inaugurated by Thiru. K. A. Bhoja Shetty, I.F.S., then Chief Conservator of Forests (General), Tamil Nadu on 21st March 1976 in connection with the celebration of the World Forestry Day, 1976. Later on, it was setup as a small museum in 1981, on a sprawling 11.5 hectares of reserve forest land. With its rudiment legacy as a public recreation centre this park has slowly transitioned over a period of four decades, from a menagerie to a small modern Zoo, only recently. Present Zoo area extends to 36 ha.
              </p>

              <p className="text-base leading-relaxed text-black" style={{ textAlign: 'justify' }}>
                The State of Environment Report (2003) mentioned this Zoo as Kurumbapatti Recreation centre under Salem Division, so the thrust area for the park management was not on Zoological collections for nearly three decades. In 2004, this Zoo was listed as one among the 5 recognized Zoos of Tamil Nadu as per Central Zoo Authority (as on 31/03/2004) under mini-category Zoo. In 2005, due to resource crunch and drought the Zoo had disposed of some of the exciting animals kept in its collection. The monitoring & evaluation from Central Zoo Authority (CZA) was carried out in 2007, after which the Zoo was granted renewal of recognition as a ‘mini category Zoo’. In Feb 2010, the Zoo was granted recognition following evaluation done by CZA in 2009. The Zoo was upgraded from its then status as a ‘mini category Zoo’ to ‘small category Zoo’ vide F.No. 19-99/92 CZA (250) (Volume II) (M) DT. 26.02.2010.
              </p>

              <p className="text-base leading-relaxed text-black" style={{ textAlign: 'justify' }}>
                The Tamil Nadu State Government had constituted a State Zoo Authority known as Zoo Authority of Tamil Nadu (ZAT) on 03.12.2004. It is a registered Society under Tamil Nadu Societies Registration Act, 1975. The Governing Board of ZAT was reconstituted on 06.03.2013 to administer the Zoological parks more effectively under G.O. No.23 Environment and Forests. The Order sought to include all Zoos & butterfly park managed by Department of Forests under the ambit of ZAT for facilitating development and maintenance of all the Zoos in a self-sustaining manner by receiving and utilizing funds from different Government and Non-Government sources. The Zoo was granted renewal of recognition by Central Zoo Authority for a period up to 08.08.2028.
              </p>

              <h2 className="text-2xl md:text-3xl font-bold mt-6" style={{ color: '#FACC15' }}>
                VISION OF THE ZOO
              </h2>
              <p className="text-base leading-relaxed text-black" style={{ textAlign: 'justify' }}>
                “The Zoo will provide a rewarding experience to the visitors about the wildlife of this region and its importance in ecological balance. The display, care and awareness shall be fitting to promote conservation of wildlife.”
              </p>

              <h2 className="text-2xl md:text-3xl font-bold mt-6" style={{ color: '#FACC15' }}>
                MISSION OF THE ZOO
              </h2>
              <p className="text-base leading-relaxed text-black" style={{ textAlign: 'justify' }}>
                The mission of the Kurumbapatti Zoological Park is in tune with the following mandates stipulated in the guidelines of the CZA: “Develop amongst visitors’ an empathy for wild animals and motivate them to support the cause of conservation of wildlife. To function as a Rescue and Rehabilitation Centre by receiving and keeping orphaned, seized, rescued, injured wild animals subject to availability of appropriate housing for the same.”
              </p>
            </article>
          </div>
        </div>
      </section>

      <section className="bg-soft-bg pb-16">
        <div className="container max-w-4xl space-y-8">
          <div className="relative mx-auto w-full max-w-xl">
            <img
              src={objectivesImage}
              alt="Wooden board highlighting park objectives"
              className="w-full rounded-[30px] object-cover shadow-2xl"
              loading="lazy"
            />
            <div className="absolute inset-0 flex flex-col items-center justify-center px-8 text-center">
              <span className="rounded-full bg-black/35 px-5 py-2 text-[32px] font-black uppercase tracking-[0.18em] text-white shadow-lg backdrop-blur md:text-[40px]">
                Objectives
              </span>
              <span className="mt-3 rounded-full bg-white/90 px-4 py-1 text-sm font-semibold text-forest-green shadow-md">
                குறிக்கோள்கள்
              </span>
            </div>
          </div>

          <div className="mx-auto max-w-4xl space-y-10">
            <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
              <div className="rounded-3xl bg-white p-8 shadow-xl feature-card">
                <svg className="mb-4 h-12 w-12 text-vibrant-green" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 21c-.35 0-.7-.1-1-.3C6.5 18 3 14.87 3 10.9 3 8 5.2 6 7.5 6c1.4 0 2.8.7 3.5 1.8C11.7 6.7 13.1 6 14.5 6 16.8 6 19 8 19 10.9c0 3.97-3.5 7.1-8 9.8-.3.2-.65.3-1 .3Z" />
                </svg>
                <h3 className="text-2xl font-semibold text-forest-green">
                  <span>Conservation & Empathy</span>
                  <span className="mt-1 block text-lg font-semibold text-forest-green/85">பாதுகாப்பும் பரிவும்</span>
                </h3>
                <p className="mt-3 text-base leading-relaxed text-muted-foreground">
                  <span>To conserve and build empathy for the threatened wildlife of Peninsular India, especially the fauna of the local eco-region.</span>
                  <span className="mt-2 block text-sm text-muted-foreground/90">தென் இந்திய தீபகற்பத்தின் அச்சுறுத்தப்பட்ட வனவிலங்குகளையும், குறிப்பாக உள்ளூர் சூழலியல் பகுதியில் வாழும் விலங்குகளையும் பாதுகாத்து, அவற்றிற்கான பரிவை உருவாக்குவது.</span>
                </p>
              </div>

              <div className="rounded-3xl bg-white p-8 shadow-xl feature-card">
                <svg className="mb-4 h-12 w-12 text-vibrant-green" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4.5 19.5h15M5 9l2 10h10l2-10M9 9V4h6v5" />
                </svg>
                <h3 className="text-2xl font-semibold text-forest-green">
                  <span>Conservation Breeding</span>
                  <span className="mt-1 block text-lg font-semibold text-forest-green/85">பாதுகாப்பு இனப்பெருக்கம்</span>
                </h3>
                <p className="mt-3 text-base leading-relaxed text-muted-foreground">
                  <span>To serve as a specialized conservation breeding center for the endangered fauna of the eco-region.</span>
                  <span className="mt-2 block text-sm text-muted-foreground/90">சூழலியல் பகுதியின் அபாய நிலையில் உள்ள விலங்குகளுக்கான சிறப்பு பாதுகாப்பு இனப்பெருக்க மையமாகச் செயல்படுவது.</span>
                </p>
              </div>

              <div className="rounded-3xl bg-white p-8 shadow-xl feature-card">
                <svg className="mb-4 h-12 w-12 text-vibrant-green" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 19h16M4 5h16M12 5v14" />
                  <path d="m8 9 4-4 4 4" />
                  <path d="m8 15 4 4 4-4" />
                </svg>
                <h3 className="text-2xl font-semibold text-forest-green">
                  <span>Education & Awareness</span>
                  <span className="mt-1 block text-lg font-semibold text-forest-green/85">கல்வியும் விழிப்புணர்வும்</span>
                </h3>
                <p className="mt-3 text-base leading-relaxed text-muted-foreground">
                  <span>
                    To create public awareness and support for wildlife conservation through engaging and informative nature education programs.
                  </span>
                  <span className="mt-2 block text-sm text-muted-foreground/90">
                    இயற்கை கல்வி நிகழ்ச்சிகள் மூலம் வனவிலங்கு பாதுகாப்பிற்கான பொதுமக்களின் விழிப்புணர்வையும் ஆதரவையும் உருவாக்குவது.
                  </span>
                </p>
              </div>

              <div className="rounded-3xl bg-white p-8 shadow-xl feature-card">
                <svg className="mb-4 h-12 w-12 text-vibrant-green" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 3v18" />
                  <path d="M5 8c.2 2.9 1.6 5.2 4 7-1.8 1.9-3 4.2-3.5 7" />
                  <path d="M19 8c-.2 2.9-1.6 5.2-4 7 1.8 1.9 3 4.2 3.5 7" />
                </svg>
                <h3 className="text-2xl font-semibold text-forest-green">
                  <span>Eco-Friendly Recreation</span>
                  <span className="mt-1 block text-lg font-semibold text-forest-green/85">சூழல் நட்பு பொழுதுபோக்கு</span>
                </h3>
                <p className="mt-3 text-base leading-relaxed text-muted-foreground">
                  <span>
                    To provide a beautiful, natural space for public recreation that demonstrates and promotes eco-friendly values.
                  </span>
                  <span className="mt-2 block text-sm text-muted-foreground/90">
                    சூழல் மதிப்பைக் காட்டும், ஊக்குவிக்கும் அழகான இயற்கை சூழலை பொது மக்களுக்கு வழங்குவது.
                  </span>
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Zoo Location section removed as requested */}
    </div>
  )
}
