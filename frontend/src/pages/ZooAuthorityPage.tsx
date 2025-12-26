import safariImage from '@/assets/images/heroslide2.webp'

export function ZooAuthorityPage() {
  return (
    <div className="page-enter space-y-16 bg-soft-bg">
      <section className="relative isolate overflow-hidden">
        <div className="absolute inset-0">
          <img
            src={safariImage}
            alt="Placeholder signage for Tamilnadu zoos"
            className="h-full w-full object-cover opacity-30"
            loading="eager"
            decoding="async"
            fetchPriority="high"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/45 via-forest-green/35 to-soft-bg/70" />
        </div>
        <div className="relative z-10">
          <div className="container py-16">
            <div className="mx-auto flex max-w-4xl flex-col items-center gap-4 text-center text-white">
              <span className="inline-flex items-center justify-center rounded-full border border-white/30 bg-white/10 px-5 py-2 text-xs font-semibold uppercase tracking-[0.35em] text-white/80">
                ABOUT ZAT
              </span>
              <h1 className="text-4xl font-black tracking-tight md:text-5xl">Zoo Authority of Tamilnadu</h1>
              <p className="text-base font-semibold uppercase tracking-[0.3em] text-white/70">
                A society under the Government of Tamilnadu
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="pb-20">
        <div className="container">
          <div className="mx-auto max-w-4xl space-y-6 rounded-3xl border border-forest-green/15 bg-white/95 p-10 text-forest-green shadow-xl backdrop-blur">
            <p className="text-lg leading-8 text-forest-green/90">
              The Tamil Nadu State Government constituted the Zoo Authority of Tamil Nadu (ZAT) on 03.12.2004. It is a registered Society under the Tamil Nadu Societies Registration Act, 1975. The Authority was created to facilitate supervision, control, and management of AAZP and for the flow of funds for development and improvement activities. The Governing Board of ZAT administers the zoological parks effectively, and this board, chaired by the Hon&apos;ble Chief Minister, approves proposals for all zoos in the state.
            </p>
          </div>
        </div>
      </section>
    </div>
  )
}
