import aboutParkImage from '@/assets/images/heroslide1.webp'

export function ZooEducationPage() {
  return (
    <div className="page-enter space-y-16 bg-soft-bg pb-20">
      <section className="relative isolate overflow-hidden">
        <div className="absolute inset-0">
          <img
            src={aboutParkImage}
            alt="Educational trail through the park"
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
                Zoo Education
              </h1>
              <p className="text-base font-medium text-white/85 md:text-lg">
                Guided learning experiences for every visitor.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="pb-16">
        <div className="container">
          <div className="mx-auto max-w-4xl space-y-8 rounded-3xl border border-forest-green/15 bg-white/95 p-8 shadow-xl backdrop-blur sm:p-10 md:p-12">
            <div className="space-y-4 text-forest-green">
              <h2 className="text-3xl font-bold md:text-4xl">Learning at the Park</h2>
              <p className="text-lg leading-relaxed text-forest-green/90">
                We provide education through large signage panels placed at each animal exhibit. These signages describe each
                species&apos; appearance, behavior, diet, and conservation status, helping to educate all our visitors. The trees
                inside the zoo are also botanically labelled with useful plant information.
              </p>
            </div>

            <div className="space-y-4 text-forest-green">
              <h2 className="text-3xl font-bold md:text-4xl">Programs for Institutions</h2>
              <p className="text-lg leading-relaxed text-forest-green/90">
                During visits from vocational institutions, such as the Forest Academy, our Forest Officials and Biologists
                give talks on zoo management and share their experiences to give insights into real-life conservation
                situations.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
