import { Link } from 'react-router-dom'

import aboutParkImage from '@/assets/images/heroslide1.webp'
import { Button } from '@/components/ui/Button'

export function AdoptionSchemePage() {
  return (
    <div className="page-enter space-y-16 bg-soft-bg pb-20">
      <section className="relative isolate overflow-hidden">
        <div className="absolute inset-0">
          <img
            src={aboutParkImage}
            alt="Adoption banner with leafy ambiance"
            className="h-full w-full object-cover opacity-35"
            loading="eager"
            decoding="async"
            fetchPriority="high"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-forest-green/45 via-forest-green/20 to-soft-bg/70" />
        </div>
        <div className="relative z-10">
          <div className="container py-16">
            <div className="mx-auto max-w-3xl space-y-4 text-center">
              <h1 className="inline-flex items-center justify-center rounded-[26px] bg-[#8B5E3C] px-6 py-3 text-lg font-black uppercase tracking-[0.28em] text-[#FCE7C8] shadow-[0_16px_32px_rgba(77,52,28,0.35)]">
                Adoption Scheme
              </h1>
              <p className="text-base font-medium text-white/85 md:text-lg">
                Join hands with us to champion wildlife conservation.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="pb-16">
        <div className="container">
          <div className="mx-auto max-w-4xl space-y-10 rounded-3xl border border-forest-green/15 bg-white/95 p-8 shadow-xl backdrop-blur sm:p-10 md:p-12">
            <div className="space-y-4 text-forest-green">
              <h2 className="text-3xl font-bold md:text-4xl">Become a Conservationist</h2>
              <p className="text-lg leading-relaxed text-forest-green/90">
                Wild animal adoption gives you an opportunity to become a conservationist. Your adoption supports the highest
                standard of care for the wild animals at the Zoo and symbolizes your passion towards their conservation.
              </p>
            </div>

            <div className="space-y-4 text-forest-green">
              <h2 className="text-3xl font-bold md:text-4xl">Why Should You Adopt a Wild Animal?</h2>
              <p className="text-lg leading-relaxed text-forest-green/90">
                When you adopt a wild animal, you voice for the conservation of that species and become &quot;A Voice of the
                Voiceless&quot;. All your donations go directly towards the cost of caring for the wild animals at the zoo.
              </p>
            </div>

            <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center">
              <Button asChild variant="default" size="lg">
                <Link to="/animal-info">View Wild Animal Profiles</Link>
              </Button>
              <p className="text-sm font-semibold uppercase tracking-[0.3em] text-forest-green/60">
                Explore species details and choose an animal to adopt
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
