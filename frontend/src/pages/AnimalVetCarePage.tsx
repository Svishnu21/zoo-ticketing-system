import aboutParkImage from '@/assets/images/about_park.jpg'
export function AnimalVetCarePage() {
  return (
    <div className="page-enter space-y-16 bg-soft-bg pb-20">
      <section className="relative isolate overflow-hidden">
        <div className="absolute inset-0">
          <img
            src={aboutParkImage}
            alt="Veterinary care backdrop with leafy canopy"
            className="h-full w-full object-cover opacity-35"
            loading="lazy"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-forest-green/45 via-forest-green/20 to-soft-bg/70" />
        </div>
        <div className="relative z-10">
          <div className="container py-16">
            <div className="mx-auto max-w-3xl space-y-4 text-center">
              <span className="inline-flex items-center justify-center rounded-[26px] bg-[#8B5E3C] px-6 py-3 text-lg font-black uppercase tracking-[0.28em] text-[#FCE7C8] shadow-[0_16px_32px_rgba(77,52,28,0.35)]">
                Wild Animal Vet Care
              </span>
              <p className="text-base font-medium text-white/85 md:text-lg">
                Compassionate care built on science, vigilance, and dedication.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="pb-16">
        <div className="container">
          <div className="mx-auto max-w-4xl space-y-10 rounded-3xl border border-forest-green/15 bg-white/95 p-8 shadow-xl backdrop-blur sm:p-10 md:p-12">
            <div className="space-y-4 text-forest-green">
              <h2 className="text-3xl font-bold md:text-4xl">Our Commitment to Wild Animal Health</h2>
              <p className="text-lg leading-relaxed text-forest-green/90">
                The health and welfare of the wild animals is our highest priority. Our zoo has a dedicated wild animal section
                supported by a scientific and technical team, including a biologist and visiting veterinarians from Arignar
                Anna Zoological Park, Vandalur, to ensure the best care.
              </p>
            </div>

            <div className="space-y-4 text-forest-green">
              <h2 className="text-3xl font-bold md:text-4xl">Proactive Healthcare</h2>
              <p className="text-lg leading-relaxed text-forest-green/90">
                We follow strict, approved schedules for the well-being of all residents. This includes:
              </p>
              <ul className="space-y-3 text-lg leading-relaxed text-forest-green/90">
                <li>
                  <span className="font-semibold">Vaccination:</span> Tentative schedules are in place for all species to
                  protect against diseases. [cite: 177]
                </li>
                <li>
                  <span className="font-semibold">Deworming:</span> Regular deworming is carried out based on routine
                  faecal testing and parasitological examinations. [cite: 181]
                </li>
                <li>
                  <span className="font-semibold">Disinfection:</span> All animal housings are disinfected on a routine
                  schedule using approved methods to ensure a clean and safe environment. [cite: 186]
                </li>
                <li>
                  <span className="font-semibold">Health Check-ups:</span> We conduct annual health camps and screen our
                  employees for any zoonotic diseases to protect both our staff and the wild animals. [cite: 189, 191]
                </li>
              </ul>
            </div>

            <div className="rounded-3xl bg-forest-green/5 p-6 text-center text-forest-green">
              <p className="text-lg font-semibold leading-relaxed">
                Together with our expert partners, we ensure every resident thrives in a sanctuary built on trust and care.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
