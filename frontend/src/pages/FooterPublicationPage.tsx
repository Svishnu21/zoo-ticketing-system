import { Link } from 'react-router-dom'

import aboutParkImage from '@/assets/images/heroslide1.webp'
import { Button } from '@/components/ui/Button'

export function FooterPublicationPage() {
  return (
    <div className="page-enter space-y-16 bg-soft-bg pb-20">
      <section className="relative isolate overflow-hidden">
        <div className="absolute inset-0">
          <img
            src={aboutParkImage}
            alt="Publication banner with leafy backdrop"
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
                Publications
              </h1>
              <p className="text-base font-medium text-white/85 md:text-lg">
                Sharing our progress with transparency and pride.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="pb-16">
        <div className="container">
          <div className="mx-auto max-w-4xl space-y-10 rounded-3xl border border-forest-green/15 bg-white/95 p-8 shadow-xl backdrop-blur sm:p-10 md:p-12">
            <div className="space-y-4 text-forest-green">
              <h2 className="text-3xl font-bold md:text-4xl">Our Reports &amp; Research</h2>
              <p className="text-lg leading-relaxed text-forest-green/90">
                We believe in transparency and are proud to share our progress. Here you can find official reports detailing
                our conservation efforts, development works, animal inventory, and financial statements. [cite: 20]
              </p>
            </div>

            <div className="flex flex-col gap-4 sm:flex-row">
              <Button asChild variant="default" size="lg" className="sm:flex-1">
                <Link to="/about/annual-report">View Annual Reports</Link>
              </Button>
              <Button asChild variant="outline" size="lg" className="sm:flex-1">
                <Link to="/about/publications">View Other Publications</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
