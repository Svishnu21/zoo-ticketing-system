import aboutParkImage from '@/assets/images/heroslide1.webp'
import { Button } from '@/components/ui/Button'

const tenderListings = [
  {
    id: 'animal-feed-2025',
    title: 'Supply of Animal Feed — FY 2025',
    description:
      'Inviting sealed quotations from certified vendors for the supply of fruits, vegetables, and specialized nutrition for the wild animals.',
    dueDate: 'Submission Deadline: 10 December 2025',
    link: '#',
  },
  {
    id: 'enclosure-upgrade',
    title: 'Enclosure Upgrade & Landscape Work',
    description:
      'Tender for civil, plumbing, and horticulture improvements across multiple exhibit zones inside Kurumbapatti Zoological Park.',
    dueDate: 'Submission Deadline: 22 December 2025',
    link: '#',
  },
]

export function TendersPage() {
  return (
    <div className="page-enter space-y-16 bg-soft-bg">
      <section className="relative isolate overflow-hidden">
        <div className="absolute inset-0">
          <img
            src={aboutParkImage}
            alt="Invitation board surrounded by greenery"
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
                Tenders
              </h1>
              <p className="text-base font-medium text-white/80 md:text-lg">
                Stay informed about current procurement notices and project opportunities at Kurumbapatti Zoological Park.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="pb-20">
        <div className="container">
          <div className="mx-auto max-w-4xl space-y-8 rounded-3xl border border-forest-green/15 bg-white/95 p-10 text-forest-green shadow-xl backdrop-blur">
            <div className="space-y-4">
              <h2 className="text-3xl font-bold text-forest-green md:text-4xl">Active Tender Notices</h2>
              <p className="text-lg leading-8 text-forest-green/90">
                The following tenders are currently open. Please review the detailed documents for eligibility, submission
                guidelines, and contact information.
              </p>
            </div>

            <div className="space-y-6">
              {tenderListings.map((tender) => (
                <article
                  key={tender.id}
                  className="space-y-3 rounded-3xl border border-forest-green/10 bg-soft-bg/70 px-6 py-5 shadow-sm"
                >
                  <h3 className="text-2xl font-semibold text-forest-green">{tender.title}</h3>
                  <p className="text-base leading-7 text-forest-green/85">{tender.description}</p>
                  <div className="flex flex-wrap items-center justify-between gap-3 text-sm font-semibold uppercase tracking-[0.2em] text-forest-green/70">
                    <span>{tender.dueDate}</span>
                    <Button asChild variant="sunshine" size="sm">
                      <a href={tender.link}>View Details</a>
                    </Button>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
