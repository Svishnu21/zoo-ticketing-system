import { Link } from 'react-router-dom'

import aboutParkImage from '@/assets/images/heroslide1.webp'
import { Button } from '@/components/ui/Button'

export function AdoptionPage() {
  return (
    <div className="page-enter space-y-16 bg-soft-bg">
      <section className="relative isolate overflow-hidden">
        <div className="absolute inset-0">
          <img
            src={aboutParkImage}
            alt="Leafy canopy welcoming visitors"
            className="h-full w-full object-cover opacity-35"
            loading="eager"
            decoding="async"
            fetchPriority="high"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-forest-green/40 via-forest-green/20 to-soft-bg/70" />
        </div>
        <div className="relative z-10">
          <div className="container py-16">
            <div className="mx-auto max-w-3xl space-y-4 text-center text-white">
              <h1 className="inline-flex items-center justify-center rounded-[26px] bg-[#8B5E3C] px-6 py-3 text-lg font-black uppercase tracking-[0.28em] text-[#FCE7C8] shadow-[0_16px_32px_rgba(77,52,28,0.35)]">
                Wild Animal Adoption Programme
              </h1>
              <p className="text-base font-medium text-white/80 md:text-lg">
                Become a guardian for the incredible residents of Kurumbapatti Zoological Park.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="pb-20">
        <div className="container">
          <div className="mx-auto max-w-4xl space-y-8 rounded-3xl border border-forest-green/15 bg-white/95 p-10 text-forest-green shadow-xl backdrop-blur">
            <div className="space-y-6 text-lg leading-8 text-forest-green/90">
              <h2 className="text-3xl font-bold text-forest-green md:text-4xl">Become a Conservationist</h2>
              <div className="mt-4 flex justify-center">
                <Button asChild variant="hero" size="lg" className="mb-6 w-full sm:w-auto">
                  <Link to="/adoption/choose">Adopt Now</Link>
                </Button>
              </div>
              <p>
                Kurumbapatti Zoological Park is one of the prime wildlife conservation centers in the region. The concept of a zoo has evolved from pure entertainment to research and conservation education. Wild animal adoption gives you an opportunity to become a conservationist. Your adoption supports the highest standard of care for the wild animals at the Zoo and symbolizes your passion towards their conservation.
              </p>

              <h2 className="text-3xl font-bold text-forest-green md:text-4xl">Why Should You Adopt a Wild Animal?</h2>
              <p>
                The animals we house in the zoo are the representatives of their counterparts in the wild. When you adopt a wild animal from the zoo, you voice for the conservation of that animal species and also help to spread out a message to others about this.
              </p>
              <p>
                You will also probably have a hairy, furry, scaly or a feathered friend who will make your zoo visit a special one. You can go a step further than other normal zoo visitors and become &apos;A Voice of the Voiceless&apos; by adopting a wild animal. All your donations go directly towards the cost of caring for the wild animals at the zoo. Your support also helps us create awareness and foster scientific rationale.
              </p>

              <h2 className="text-3xl font-bold text-forest-green md:text-4xl">Adopt Wild Animals Online</h2>
              <p>
                Choose your favourite species and support their daily nourishment, medical care, and enrichment. Every adoption tier comes with heartfelt recognition from our team.
              </p>

              <h2 className="text-3xl font-bold text-forest-green md:text-4xl">Offline Adoption</h2>
              <p>
                For offline adoption programmes, adopters need to take a DD/Cheque in favour of "The Member Secretary, Zoo Authority of Tamil Nadu" and send with a covering letter addressed to the "District Forest Officer, Salem Division, Kurumbapatti Zoological Park, Salem - 636008".
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
