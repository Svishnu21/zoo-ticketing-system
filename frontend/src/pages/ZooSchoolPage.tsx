import aboutParkImage from '@/assets/images/heroslide1.webp'

export function ZooSchoolPage() {
  return (
    <div className="page-enter space-y-16 bg-soft-bg pb-20">
      <section className="relative isolate overflow-hidden">
        <div className="absolute inset-0">
          <img
            src={aboutParkImage}
            alt="Sunlit canopy welcoming learners"
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
                Zoo School
              </span>
              <p className="text-base font-medium text-white/85 md:text-lg">
                Inspiring conservation through immersive learning moments.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="pb-16">
        <div className="container">
          <div className="mx-auto max-w-4xl space-y-8 rounded-3xl border border-forest-green/15 bg-white/95 p-8 shadow-xl backdrop-blur sm:p-10 md:p-12">
            <div className="space-y-4 text-forest-green">
              <h2 className="text-3xl font-bold md:text-4xl">Our Educational Mission</h2>
              <p className="text-lg leading-relaxed text-forest-green/90">
                Kurumbapatti Zoological Park is committed to providing nature education for the school children and local
                populace of Salem and adjoining districts. Our mission is to create awareness for conservation support
                through education and outreach.
              </p>
            </div>

            <div className="space-y-4 text-forest-green">
              <h2 className="text-3xl font-bold md:text-4xl">An Interpretative Centre for Nature</h2>
              <p className="text-lg leading-relaxed text-forest-green/90">
                We act as an Interpretative Centre for Nature Education on Tropical Dry Deciduous forests. We welcome
                educational visits from schools and academic institutions throughout the year as part of their curriculum.
                We are also a much sought-after place for family groups during weekends, local holidays, and summer
                vacations.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
