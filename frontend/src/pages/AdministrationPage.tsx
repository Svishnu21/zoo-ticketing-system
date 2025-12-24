export function AdministrationPage() {
  const adminProfiles = [
    {
      name: 'T. RITTO CYRIAC ., I.F.S',
      titles: [
        'Chief Conservator of Forests & Director, AAZP',
        'Member Secretary, Zoo Authority of Tamil Nadu',
      ],
    },
    {
      name: 'KASHYAP SHASHANK RAVI ., I.F.S',
      titles: ['District Forest Officer, Salem & Director, KZP'],
    },
    {
      name: 'Dr. R. SELVAKUMAR ., S.F.S',
      titles: ['Assistant Conservator of Forests & Assistant Director, KZP'],
    },
  ]

  return (
    <div className="page-enter bg-white py-16">
      <div className="container">
        <div
          className="mx-auto max-w-4xl rounded-3xl border border-forest-green/15 bg-white p-10 text-justify text-forest-green/90 shadow-forest-lg"
          style={{ fontFamily: "'Open Sans', Poppins, sans-serif" }}
        >
          <header className="space-y-3 text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.4em] text-forest-green/70">
              Official Document
            </p>
            <h1 className="text-3xl font-bold text-secondary md:text-4xl">ADMINISTRATION DETAILS</h1>
          </header>

          <section className="mt-10 space-y-6">
            {adminProfiles.map((profile) => (
              <article
                key={profile.name}
                className="flex flex-col items-center gap-6 rounded-2xl bg-[#FACC15] p-6 shadow-md md:flex-row md:items-center"
              >
                <div className="flex-shrink-0">
                  <div className="flex h-28 w-28 items-center justify-center rounded-full bg-white">
                    <svg
                      width="56"
                      height="56"
                      viewBox="0 0 24 24"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                      aria-hidden
                    >
                      <path
                        d="M12 12c2.761 0 5-2.239 5-5s-2.239-5-5-5-5 2.239-5 5 2.239 5 5 5zm0 2c-3.86 0-7 1.79-7 4v1h14v-1c0-2.21-3.14-4-7-4z"
                        fill="#000"
                      />
                    </svg>
                  </div>
                </div>
                <div className="min-w-0 text-center md:text-left">
                  <h2 className="text-2xl font-bold leading-tight text-forest-green md:text-3xl">{profile.name.trim()}</h2>
                  <div className="mt-2 text-lg font-semibold text-forest-green/90 whitespace-normal break-words">
                    {profile.titles?.map((tline, idx) => (
                      <p key={idx} className={idx === 0 ? 'mb-1' : ''}>
                        {tline}
                      </p>
                    ))}
                  </div>
                </div>
              </article>
            ))}
          </section>
        </div>
      </div>
    </div>
  )
}
