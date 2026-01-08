import aboutParkImage from '@/assets/images/heroslide1.webp'
import { Button } from '@/components/ui/Button'

export function AnnualReportsPage() {
  return (
    <div className="page-enter space-y-16 bg-soft-bg">
      <section className="relative isolate overflow-hidden">
        <div className="absolute inset-0">
          <img
            src={aboutParkImage}
            alt="Sunlight filtering through lush leaves"
            className="h-full w-full object-cover opacity-30"
            loading="eager"
            decoding="async"
            fetchPriority="high"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-forest-green/45 via-forest-green/25 to-soft-bg/70" />
        </div>
        <div className="relative z-10">
          <div className="container py-16">
            <div className="mx-auto max-w-3xl space-y-4 text-center text-white">
              <h1 className="inline-flex items-center justify-center rounded-[26px] bg-[#8B5E3C] px-6 py-3 text-lg font-black uppercase tracking-[0.28em] text-[#FCE7C8] shadow-[0_16px_32px_rgba(77,52,28,0.35)]">
                Annual Reports
              </h1>
              <p className="text-base font-medium text-white/80 md:text-lg">
                Track our progress, milestones, and conservation impact year after year.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="pb-20">
        <div className="container">
          <div className="mx-auto max-w-4xl space-y-8 rounded-3xl border border-forest-green/15 bg-white/95 p-10 text-forest-green shadow-xl backdrop-blur">
            <div className="space-y-4">
              <h2 className="text-3xl font-bold text-forest-green md:text-4xl">Our Reports &amp; Publications</h2>
              <p className="text-lg leading-8 text-forest-green/90">
                We believe in transparency and are proud to share our progress. Here you can find official reports detailing our conservation efforts, development works, animal inventory, and financial statements.
              </p>
            </div>

            <div className="space-y-4">
              <p className="text-sm font-semibold uppercase tracking-[0.3em] text-forest-green/70">Download Reports</p>
              <Button asChild variant="sunshine" size="sm" className="w-full sm:w-auto">
                <a href="/AR_kurumbattizoo_1819.pdf" download>
                  Download: Annual Report 2018-19
                </a>
              </Button>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
