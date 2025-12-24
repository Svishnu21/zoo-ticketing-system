export function CSRActivityPage() {
  return (
    <section className="page-enter bg-soft-bg pb-20">
      {/* Banner */}
      <div className="relative -mx-4 h-56 overflow-hidden rounded-b-[48px] bg-forest-green/10 sm:-mx-0 sm:h-64">
        <div className="absolute inset-0 bg-[url('/assets/images/leafy-banner.jpg')] bg-cover bg-center" aria-hidden="true" />
        <div className="absolute inset-0 bg-gradient-to-b from-black/45 via-black/20 to-transparent" />
        <div className="relative flex h-full flex-col items-center justify-center px-6 text-center text-white">
          <h1 className="text-3xl font-extrabold md:text-4xl">Partner With Us</h1>
          <p className="mt-2 text-base font-semibold text-emerald-100 md:text-lg">CSR Initiatives 2023-24</p>
        </div>
      </div>

      {/* Main card */}
      <div className="container -mt-12 max-w-5xl space-y-10">
        <div className="mx-auto rounded-3xl bg-white p-8 shadow-forest-lg md:p-10">
          <p className="text-lg leading-relaxed text-muted-foreground">
            We invite partnerships that strengthen conservation outcomes, improve visitor experience, and enhance welfare for the
            wild animals under our care. Explore the categories below to find sponsorship and CSR opportunities.
          </p>

          {/* Category 1 */}
          <section className="mt-10 space-y-4" aria-labelledby="csr-cat-1">
            <h2
              id="csr-cat-1"
              className="text-xl font-extrabold uppercase tracking-wider text-yellow-400 md:text-2xl"
            >
              Animal Care &amp; Welfare
            </h2>
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              <article className="flex min-h-[120px] flex-col justify-between rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm transition-shadow duration-150 hover:shadow-lg">
                <div>
                  <h3 className="text-base font-bold text-forest-green">Animal adoption programme</h3>
                  <p className="mt-1 text-sm text-muted-foreground">Rs. 500 to 10 Lakhs and above</p>
                </div>
                <div className="mt-3 flex justify-end">
                  <span className="inline-flex rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-800">
                    Rs. 500+
                  </span>
                </div>
              </article>

              <article className="flex min-h-[120px] flex-col justify-between rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm transition-shadow duration-150 hover:shadow-lg">
                <div>
                  <h3 className="text-base font-bold text-forest-green">Animal enclosure enrichment and equipments</h3>
                  <p className="mt-1 text-sm text-muted-foreground">Rs. 2 Lakhs</p>
                </div>
                <div className="mt-3 flex justify-end">
                  <span className="inline-flex rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-800">
                    Rs. 2,00,000
                  </span>
                </div>
              </article>

              <article className="flex min-h-[120px] flex-col justify-between rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm transition-shadow duration-150 hover:shadow-lg">
                <div>
                  <h3 className="text-base font-bold text-forest-green">
                    Development of birds aviary and inclusion of enclosure enrichments
                  </h3>
                  <p className="mt-1 text-sm text-muted-foreground">Rs. 5 Lakhs</p>
                </div>
                <div className="mt-3 flex justify-end">
                  <span className="inline-flex rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-800">
                    Rs. 5,00,000
                  </span>
                </div>
              </article>

              <article className="flex min-h-[120px] flex-col justify-between rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm transition-shadow duration-150 hover:shadow-lg">
                <div>
                  <h3 className="text-base font-bold text-forest-green">Provision of cattle feed choppers</h3>
                  <p className="mt-1 text-sm text-muted-foreground">Rs. 50 Thousand</p>
                </div>
                <div className="mt-3 flex justify-end">
                  <span className="inline-flex rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-800">
                    Rs. 50,000
                  </span>
                </div>
              </article>
            </div>
          </section>

          {/* Category 2 */}
          <section className="mt-10 space-y-4" aria-labelledby="csr-cat-2">
            <h2
              id="csr-cat-2"
              className="text-xl font-extrabold uppercase tracking-wider text-yellow-400 md:text-2xl"
            >
              Development of Park
            </h2>
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              <article className="flex min-h-[120px] flex-col justify-between rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm transition-shadow duration-150 hover:shadow-lg">
                <div>
                  <h3 className="text-base font-bold text-forest-green">
                    Painting the enclosure wall with conservation messages
                  </h3>
                  <p className="mt-1 text-sm text-muted-foreground">Rs. 50 Thousand</p>
                </div>
                <div className="mt-3 flex justify-end">
                  <span className="inline-flex rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-800">
                    Rs. 50,000
                  </span>
                </div>
              </article>

              <article className="flex min-h-[120px] flex-col justify-between rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm transition-shadow duration-150 hover:shadow-lg">
                <div>
                  <h3 className="text-base font-bold text-forest-green">Construction of new modernized toilet blocks</h3>
                  <p className="mt-1 text-sm text-muted-foreground">Rs. 5 Lakhs</p>
                </div>
                <div className="mt-3 flex justify-end">
                  <span className="inline-flex rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-800">
                    Rs. 5,00,000
                  </span>
                </div>
              </article>

              <article className="flex min-h-[120px] flex-col justify-between rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm transition-shadow duration-150 hover:shadow-lg">
                <div>
                  <h3 className="text-base font-bold text-forest-green">Construction over roof in car parking area</h3>
                  <p className="mt-1 text-sm text-muted-foreground">Rs. 20 Lakhs</p>
                </div>
                <div className="mt-3 flex justify-end">
                  <span className="inline-flex rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-800">
                    Rs. 20,00,000
                  </span>
                </div>
              </article>

              <article className="flex min-h-[120px] flex-col justify-between rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm transition-shadow duration-150 hover:shadow-lg">
                <div>
                  <h3 className="text-base font-bold text-forest-green">Animal information boards / signage</h3>
                  <p className="mt-1 text-sm text-muted-foreground">Rs. 10 to 50 Thousand</p>
                </div>
                <div className="mt-3 flex justify-end">
                  <span className="inline-flex rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-800">
                    Rs. 10,000–50,000
                  </span>
                </div>
              </article>

              <article className="flex min-h-[120px] flex-col justify-between rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm transition-shadow duration-150 hover:shadow-lg">
                <div>
                  <h3 className="text-base font-bold text-forest-green">Lawn development and planting flowering plants</h3>
                  <p className="mt-1 text-sm text-muted-foreground">Rs. 1 to 3 Lakhs</p>
                </div>
                <div className="mt-3 flex justify-end">
                  <span className="inline-flex rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-800">
                    Rs. 1,00,000–3,00,000
                  </span>
                </div>
              </article>

              <article className="flex min-h-[120px] flex-col justify-between rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm transition-shadow duration-150 hover:shadow-lg">
                <div>
                  <h3 className="text-base font-bold text-forest-green">
                    Providing rest sheds inside the zoo campus
                  </h3>
                  <p className="mt-1 text-sm text-muted-foreground">Rs. 5 Lakhs</p>
                </div>
                <div className="mt-3 flex justify-end">
                  <span className="inline-flex rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-800">
                    Rs. 5,00,000
                  </span>
                </div>
              </article>

              <article className="flex min-h-[120px] flex-col justify-between rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm transition-shadow duration-150 hover:shadow-lg">
                <div>
                  <h3 className="text-base font-bold text-forest-green">
                    Providing zoo staffs dress changing room and dining area
                  </h3>
                  <p className="mt-1 text-sm text-muted-foreground">Rs. 10 Lakhs</p>
                </div>
                <div className="mt-3 flex justify-end">
                  <span className="inline-flex rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-800">
                    Rs. 10,00,000
                  </span>
                </div>
              </article>
            </div>
          </section>

          {/* Category 3 */}
          <section className="mt-10 space-y-4" aria-labelledby="csr-cat-3">
            <h2
              id="csr-cat-3"
              className="text-xl font-extrabold uppercase tracking-wider text-yellow-400 md:text-2xl"
            >
              Visitor Amenities Development
            </h2>
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              <article className="flex min-h-[120px] flex-col justify-between rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm transition-shadow duration-150 hover:shadow-lg">
                <div>
                  <h3 className="text-base font-bold text-forest-green">
                    Installation of RO Water system and laying pipe lines
                  </h3>
                  <p className="mt-1 text-sm text-muted-foreground">Rs. 5 Lakhs</p>
                </div>
                <div className="mt-3 flex justify-end">
                  <span className="inline-flex rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-800">
                    Rs. 5,00,000
                  </span>
                </div>
              </article>

              <article className="flex min-h-[120px] flex-col justify-between rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm transition-shadow duration-150 hover:shadow-lg">
                <div>
                  <h3 className="text-base font-bold text-forest-green">Garden benches for the visitors</h3>
                  <p className="mt-1 text-sm text-muted-foreground">Rs. 1 Lakh</p>
                </div>
                <div className="mt-3 flex justify-end">
                  <span className="inline-flex rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-800">
                    Rs. 1,00,000
                  </span>
                </div>
              </article>

              <article className="flex min-h-[120px] flex-col justify-between rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm transition-shadow duration-150 hover:shadow-lg">
                <div>
                  <h3 className="text-base font-bold text-forest-green">
                    Dustbins (Animal design) inside/outside zoo
                  </h3>
                  <p className="mt-1 text-sm text-muted-foreground">Rs. 50 Thousand</p>
                </div>
                <div className="mt-3 flex justify-end">
                  <span className="inline-flex rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-800">
                    Rs. 50,000
                  </span>
                </div>
              </article>

              <article className="flex min-h-[120px] flex-col justify-between rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm transition-shadow duration-150 hover:shadow-lg">
                <div>
                  <h3 className="text-base font-bold text-forest-green">Mothers feeding room</h3>
                  <p className="mt-1 text-sm text-muted-foreground">Rs. 10 Lakhs</p>
                </div>
                <div className="mt-3 flex justify-end">
                  <span className="inline-flex rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-800">
                    Rs. 10,00,000
                  </span>
                </div>
              </article>

              <article className="flex min-h-[120px] flex-col justify-between rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm transition-shadow duration-150 hover:shadow-lg">
                <div>
                  <h3 className="text-base font-bold text-forest-green">
                    Visitors Cloak room facility with 500 lockers
                  </h3>
                  <p className="mt-1 text-sm text-muted-foreground">Rs. 5 Lakhs</p>
                </div>
                <div className="mt-3 flex justify-end">
                  <span className="inline-flex rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-800">
                    Rs. 5,00,000
                  </span>
                </div>
              </article>

              <article className="flex min-h-[120px] flex-col justify-between rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm transition-shadow duration-150 hover:shadow-lg">
                <div>
                  <h3 className="text-base font-bold text-forest-green">
                    Battery car and battery cycle waiting area rest shed
                  </h3>
                  <p className="mt-1 text-sm text-muted-foreground">Rs. 10 Lakhs</p>
                </div>
                <div className="mt-3 flex justify-end">
                  <span className="inline-flex rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-800">
                    Rs. 10,00,000
                  </span>
                </div>
              </article>
            </div>
          </section>

          {/* Category 4 */}
          <section className="mt-10 space-y-4" aria-labelledby="csr-cat-4">
            <h2
              id="csr-cat-4"
              className="text-xl font-extrabold uppercase tracking-wider text-yellow-400 md:text-2xl"
            >
              Others
            </h2>
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              <article className="flex min-h-[120px] flex-col justify-between rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm transition-shadow duration-150 hover:shadow-lg">
                <div>
                  <h3 className="text-base font-bold text-forest-green">
                    New play things and development work for Kids Zone
                  </h3>
                  <p className="mt-1 text-sm text-muted-foreground">Rs. 10 Lakhs</p>
                </div>
                <div className="mt-3 flex justify-end">
                  <span className="inline-flex rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-800">
                    Rs. 10,00,000
                  </span>
                </div>
              </article>

              <article className="flex min-h-[120px] flex-col justify-between rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm transition-shadow duration-150 hover:shadow-lg">
                <div>
                  <h3 className="text-base font-bold text-forest-green">
                    Welfare kits for zoo staffs (Rain coat, gumboots, uniforms)
                  </h3>
                  <p className="mt-1 text-sm text-muted-foreground">Rs. 5 Lakhs</p>
                </div>
                <div className="mt-3 flex justify-end">
                  <span className="inline-flex rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-800">
                    Rs. 5,00,000
                  </span>
                </div>
              </article>

              <article className="flex min-h-[120px] flex-col justify-between rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm transition-shadow duration-150 hover:shadow-lg">
                <div>
                  <h3 className="text-base font-bold text-forest-green">
                    Advertising in zoo ticket with annual subscription
                  </h3>
                  <p className="mt-1 text-sm text-muted-foreground">Rs. 50 Thousand / Year</p>
                </div>
                <div className="mt-3 flex justify-end">
                  <span className="inline-flex rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-800">
                    Rs. 50,000/yr
                  </span>
                </div>
              </article>

              <article className="flex min-h-[120px] flex-col justify-between rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm transition-shadow duration-150 hover:shadow-lg">
                <div>
                  <h3 className="text-base font-bold text-forest-green">Animal Statue</h3>
                  <p className="mt-1 text-sm text-muted-foreground">Rs. 5 Lakhs</p>
                </div>
                <div className="mt-3 flex justify-end">
                  <span className="inline-flex rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-800">
                    Rs. 5,00,000
                  </span>
                </div>
              </article>

              <article className="flex min-h-[120px] flex-col justify-between rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm transition-shadow duration-150 hover:shadow-lg">
                <div>
                  <h3 className="text-base font-bold text-forest-green">Entrance Arch</h3>
                  <p className="mt-1 text-sm text-muted-foreground">Rs. 20 Lakhs</p>
                </div>
                <div className="mt-3 flex justify-end">
                  <span className="inline-flex rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-800">
                    Rs. 20,00,000
                  </span>
                </div>
              </article>

              <article className="flex min-h-[120px] flex-col justify-between rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm transition-shadow duration-150 hover:shadow-lg">
                <div>
                  <h3 className="text-base font-bold text-forest-green">Creation of water fountain</h3>
                  <p className="mt-1 text-sm text-muted-foreground">Rs. 5 Lakhs</p>
                </div>
                <div className="mt-3 flex justify-end">
                  <span className="inline-flex rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-800">
                    Rs. 5,00,000
                  </span>
                </div>
              </article>

              <article className="flex min-h-[120px] flex-col justify-between rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm transition-shadow duration-150 hover:shadow-lg">
                <div>
                  <h3 className="text-base font-bold text-forest-green">CCTV Installation</h3>
                  <p className="mt-1 text-sm text-muted-foreground">Rs. 20 Thousand</p>
                </div>
                <div className="mt-3 flex justify-end">
                  <span className="inline-flex rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-800">
                    Rs. 20,000
                  </span>
                </div>
              </article>
            </div>
          </section>

          <div className="mt-10 text-center">
            <a
              href="/contact"
              className="inline-flex items-center justify-center rounded-2xl bg-emerald-600 px-8 py-3 text-base font-semibold text-white shadow-forest-lg transition-colors duration-150 hover:bg-emerald-700"
            >
              Contact Director for CSR
            </a>
          </div>
        </div>
      </div>
    </section>
  )
}
