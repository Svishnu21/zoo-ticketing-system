export function HowToReachPage() {
  return (
    <div className="page-enter space-y-16 bg-soft-bg">
      <section className="relative isolate overflow-hidden bg-[var(--primary)]">
        <div className="relative z-10">
          <div className="container py-16">
            <div className="mx-auto max-w-3xl space-y-4 text-center">
              <span className="text-lg font-black uppercase tracking-[0.28em] text-[#FACC15]">
                How To Reach Us
              </span>
              <p className="text-base font-medium text-forest-green/90 md:text-lg">
                Plan your journey with ease and arrive ready for a day amidst Salem's serene wilderness.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="pb-20">
        <div className="container">
          <div className="mx-auto max-w-4xl space-y-10 rounded-3xl border border-forest-green/15 bg-white/95 p-10 shadow-xl backdrop-blur" style={{ fontFamily: "'Open Sans', Poppins, sans-serif" }}>

            {/* Section 1: Connectivity & Distances */}
            <div className="space-y-6">
              <div className="text-center">
                <span className="inline-flex items-center justify-center rounded-full bg-[#FACC15] px-4 py-2 text-sm font-black uppercase tracking-[0.12em] text-forest-green serif-heading">
                  Connectivity &amp; Distances
                </span>
              </div>

              <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="rounded-2xl border border-forest-green/10 bg-soft-bg/60 p-6 shadow-sm">
                  <div className="text-sm font-semibold uppercase tracking-[0.18em] text-forest-green/70">Distance from Salem Airport</div>
                  <div className="mt-2 text-lg font-semibold text-forest-green">25 km via NH 44</div>
                </div>

                <div className="rounded-2xl border border-forest-green/10 bg-soft-bg/60 p-6 shadow-sm">
                  <div className="text-sm font-semibold uppercase tracking-[0.18em] text-forest-green/70">Distance from Railway Junction</div>
                  <div className="mt-2 text-lg font-semibold text-forest-green">13.7 km via Yercaud Main Rd</div>
                </div>

                <div className="rounded-2xl border border-forest-green/10 bg-soft-bg/60 p-6 shadow-sm">
                  <div className="text-sm font-semibold uppercase tracking-[0.18em] text-forest-green/70">Distance from Salem Bus Station</div>
                  <div className="mt-2 text-lg font-semibold text-forest-green">11.8 km</div>
                </div>
              </div>
            </div>

            {/* Section 2: Modes of Transport */}
            <div className="space-y-4">
              <div className="text-center">
                <span className="inline-flex items-center justify-center rounded-full bg-[#FACC15] px-4 py-2 text-sm font-black uppercase tracking-[0.12em] text-forest-green serif-heading">
                  Modes of Transport
                </span>
              </div>

              <ul className="mt-4 space-y-3 text-forest-green">
                <li className="flex items-start gap-3">
                  <i className="fa-solid fa-bus mt-1 text-forest-green/80" aria-hidden="true" />
                  <div>
                    <div className="font-semibold">Public Bus</div>
                    <div className="text-sm text-forest-green/90">Tamil Nadu State Transport Corporation (TNSTC).</div>
                  </div>
                </li>

                <li className="flex items-start gap-3">
                  <i className="fa-solid fa-bus-simple mt-1 text-forest-green/80" aria-hidden="true" />
                  <div>
                    <div className="font-semibold">Mini Bus</div>
                    <div className="text-sm text-forest-green/90">Private mini bus service available from Hasthampatty.</div>
                  </div>
                </li>

                <li className="flex items-start gap-3">
                  <i className="fa-solid fa-taxi mt-1 text-forest-green/80" aria-hidden="true" />
                  <div>
                    <div className="font-semibold">Auto</div>
                    <div className="text-sm text-forest-green/90">Share-autos available from Gorimedu point.</div>
                  </div>
                </li>
              </ul>
            </div>

            {/* Section 3: Special Bus Services (Timings) */}
            <div className="space-y-4">
              <div className="text-center">
                <span className="inline-flex items-center justify-center rounded-full bg-[#FACC15] px-4 py-2 text-sm font-black uppercase tracking-[0.08em] text-forest-green serif-heading">
                  Bus Timings (Bus No: 2, 3, 3/73)
                </span>
              </div>

              <div className="mt-4 w-full overflow-x-auto pb-4">
                <table className="min-w-[520px] table-auto text-forest-green">
                  <thead>
                    <tr className="text-sm font-semibold text-forest-green/80">
                      <th className="p-3 text-left border-b border-forest-green/10">Departure from Old Bus Stand</th>
                      <th className="p-3 text-left border-b border-forest-green/10">Departure from Zoological Park</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-forest-green/10">
                    <tr>
                      <td className="p-3">6:30 AM</td>
                      <td className="p-3">7:30 AM</td>
                    </tr>
                    <tr>
                      <td className="p-3">7:15 AM</td>
                      <td className="p-3">8:15 AM</td>
                    </tr>
                    <tr>
                      <td className="p-3">9:05 AM</td>
                      <td className="p-3">9:40 AM</td>
                    </tr>
                    <tr>
                      <td className="p-3">1:30 PM</td>
                      <td className="p-3">2:30 PM</td>
                    </tr>
                    <tr>
                      <td className="p-3">4:00 PM</td>
                      <td className="p-3">5:00 PM</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Section 4: Location Map */}
            <div className="space-y-4">
              <div className="text-center">
                <span className="inline-flex items-center justify-center rounded-full bg-[#FACC15] px-4 py-2 text-sm font-black uppercase tracking-[0.12em] text-forest-green serif-heading">
                  Find Us on Google Maps
                </span>
              </div>

              <div className="overflow-hidden rounded-3xl border border-forest-green/10 shadow-2xl">
                <iframe
                  title="Kurumbapatti Zoological Park Location"
                  src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3898.694421199198!2d78.158907375823!3d11.610284091752744!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3babfde9a9b73525%3A0x64a176b49076ec0c!2sKurumbapatti%20Zoological%20Park!5e0!3m2!1sen!2sin!4v1730894256000!5m2!1sen!2sin"
                  width="100%"
                  height="420"
                  style={{ border: 0 }}
                  allowFullScreen
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                />
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
