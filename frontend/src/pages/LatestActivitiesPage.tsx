import aboutParkImage from '@/assets/images/heroslide1.webp'

export function LatestActivitiesPage() {
  return (
    <div className="page-enter space-y-16 bg-soft-bg pb-20">
      <section className="relative isolate overflow-hidden">
        <div className="absolute inset-0">
          <img
            src={aboutParkImage}
            alt="Journey into new experiences"
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
              <span className="inline-flex items-center justify-center rounded-[26px] bg-[#8B5E3C] px-6 py-3 text-lg font-black uppercase tracking-[0.28em] text-[#FCE7C8] shadow-[0_16px_32px_rgba(77,52,28,0.35)]">
                Latest Activities
              </span>
              <p className="text-base font-medium text-white/85 md:text-lg">
                Stay tuned for thrilling updates and immersive adventures.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="pb-16">
        <div className="container">
          <div className="mx-auto max-w-4xl space-y-8 rounded-3xl border border-forest-green/15 bg-white/95 p-8 shadow-xl backdrop-blur sm:p-10 md:p-12">
            <div className="space-y-4 text-forest-green">
              <h2 className="text-3xl font-bold md:text-4xl">Coming Soon: New Adventures!</h2>
              <p className="text-lg leading-relaxed text-forest-green/90">
                We are working hard to bring new and exciting experiences to Kurumbapatti Zoological Park. Here’s a sneak
                peek at what&apos;s in development:
              </p>
            </div>

            <div className="space-y-4 text-forest-green">
              <h3 className="text-2xl font-bold md:text-3xl">Safari Experience (Coming Soon)</h3>
              <p className="text-lg leading-relaxed text-forest-green/90">
                Get ready to explore a new, expansive safari area! This upcoming feature will let you see wild animals in a more
                natural and open habitat, all from the safety of a guided vehicle. This will be a thrilling adventure for the
                whole family.
              </p>
            </div>

            <div className="space-y-4 text-forest-green">
              <h3 className="text-2xl font-bold md:text-3xl">New Adventure Activities (Coming Soon)</h3>
              <p className="text-lg leading-relaxed text-forest-green/90">
                We are also planning new adventure zones, including educational trails and other fun activities designed to
                help you learn about conservation while having fun. Stay tuned!
              </p>
            </div>

            <p className="text-lg font-semibold leading-relaxed text-forest-green/90">
              Keep an eye on this page and our social media for official launch dates!
            </p>
          </div>
        </div>
      </section>
    </div>
  )
}
