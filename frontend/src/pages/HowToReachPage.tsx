export function HowToReachPage() {
  return (
    <div className="page-enter space-y-16 bg-soft-bg">
      <section className="relative isolate overflow-hidden bg-[var(--primary)]">
        <div className="relative z-10">
          <div className="container py-16">
            <div className="mx-auto max-w-3xl space-y-4 text-center">
              <h1 className="text-lg font-black uppercase tracking-[0.28em] text-[#FACC15]">
                How To Reach Us
              </h1>
              <p className="text-base font-medium text-forest-green/90 md:text-lg">
                Plan your journey with ease and arrive ready for a day amidst Salem's serene wilderness.
                <br />
                Check bus and mini-bus schedules in advance and allow extra travel time during peak hours.
                <br />
                Park facilities and seasonal timings may vary — please confirm details before your visit.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="pb-20">
        <div className="container">
          <article className="mx-auto max-w-4xl space-y-10 rounded-3xl border border-forest-green/15 bg-white/95 p-10 shadow-xl backdrop-blur" style={{ fontFamily: "'Open Sans', Poppins, sans-serif" }}>

            {/* Section 1: Connectivity & Distances */}
            <div className="space-y-6">
              <div className="text-center">
                <span className="inline-flex items-center justify-center rounded-full bg-[#FACC15] px-4 py-2 text-sm font-black uppercase tracking-[0.12em] text-forest-green serif-heading">
                  Connectivity &amp; Distances
                </span>
              </div>

              <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="rounded-2xl border border-forest-green/10 bg-soft-bg/60 p-6 shadow-sm">
                  <div className="text-sm font-semibold uppercase tracking-[0.18em] text-forest-green/70">Distance from Salem Airport</div>
                  <div className="mt-2 text-lg font-semibold text-forest-green">25 km via NH 44</div>
                </div>

                <div className="rounded-2xl border border-forest-green/10 bg-soft-bg/60 p-6 shadow-sm">
                  <div className="text-sm font-semibold uppercase tracking-[0.18em] text-forest-green/70">Distance from Railway Junction</div>
                  <div className="mt-2 text-lg font-semibold text-forest-green">13.7 km via Yercaud Main Rd</div>
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

            {/* Section 3: Public Transport Timings */}
            <div className="space-y-6">
              <div className="text-center">
                <span className="inline-flex items-center justify-center rounded-full bg-[#FACC15] px-4 py-2 text-sm font-black uppercase tracking-[0.08em] text-forest-green serif-heading">
                  Public Transport Timings
                </span>
              </div>

              <div className="grid gap-6 md:grid-cols-2">
                <div className="rounded-2xl border border-forest-green/12 bg-soft-bg/70 p-5 shadow-sm">
                  <h3 className="text-lg font-semibold text-forest-green">Mini Bus — New Bus Stand → Zoological Park (KZP)</h3>
                  <div className="mt-3 w-full overflow-x-auto">
                    <table className="min-w-[360px] table-auto text-forest-green">
                      <thead>
                        <tr className="text-xs font-semibold uppercase tracking-[0.08em] text-forest-green/80">
                          <th className="p-2 text-left border-b border-forest-green/10">Departure</th>
                          <th className="p-2 text-left border-b border-forest-green/10">Arrival</th>
                        </tr>
                      </thead>
                      <tbody className="text-sm divide-y divide-forest-green/10">
                        <tr>
                          <td className="p-2">9:50 AM</td>
                          <td className="p-2">10:30 AM</td>
                        </tr>
                        <tr>
                          <td className="p-2">12:50 PM</td>
                          <td className="p-2">1:30 PM</td>
                        </tr>
                        <tr>
                          <td className="p-2">4:00 PM</td>
                          <td className="p-2">4:30 PM</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="rounded-2xl border border-forest-green/12 bg-soft-bg/70 p-5 shadow-sm">
                  <h3 className="text-lg font-semibold text-forest-green">Mini Bus — Old Bus Stand → Zoological Park (KZP)</h3>
                  <div className="mt-3 w-full overflow-x-auto">
                    <table className="min-w-[360px] table-auto text-forest-green">
                      <thead>
                        <tr className="text-xs font-semibold uppercase tracking-[0.08em] text-forest-green/80">
                          <th className="p-2 text-left border-b border-forest-green/10">Departure</th>
                          <th className="p-2 text-left border-b border-forest-green/10">Arrival</th>
                        </tr>
                      </thead>
                      <tbody className="text-sm divide-y divide-forest-green/10">
                        <tr>
                          <td className="p-2">8:30 AM</td>
                          <td className="p-2">9:10 AM</td>
                        </tr>
                        <tr>
                          <td className="p-2">11:25 AM</td>
                          <td className="p-2">12:00 PM</td>
                        </tr>
                        <tr>
                          <td className="p-2">2:30 PM</td>
                          <td className="p-2">3:00 PM</td>
                        </tr>
                        <tr>
                          <td className="p-2">5:40 PM</td>
                          <td className="p-2">6:10 PM</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="rounded-2xl border border-forest-green/12 bg-soft-bg/70 p-5 shadow-sm">
                  <h3 className="text-lg font-semibold text-forest-green">Bus No. 3 — Old Bus Stand → Zoological Park (via intermediate stops)</h3>
                  <div className="mt-3 w-full overflow-x-auto">
                    <table className="min-w-[380px] table-auto text-forest-green">
                      <thead>
                        <tr className="text-xs font-semibold uppercase tracking-[0.08em] text-forest-green/80">
                          <th className="p-2 text-left border-b border-forest-green/10">Departure</th>
                          <th className="p-2 text-left border-b border-forest-green/10">Arrival (Intermediate / KZP)</th>
                        </tr>
                      </thead>
                      <tbody className="text-sm divide-y divide-forest-green/10">
                        <tr>
                          <td className="p-2">6:15 AM</td>
                          <td className="p-2">7:00 AM / 7:25 AM</td>
                        </tr>
                        <tr>
                          <td className="p-2">1:30 PM</td>
                          <td className="p-2">2:15 PM / 2:50 PM</td>
                        </tr>
                        <tr>
                          <td className="p-2">4:10 PM</td>
                          <td className="p-2">4:50 PM / 4:55 PM</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="rounded-2xl border border-forest-green/12 bg-soft-bg/70 p-5 shadow-sm">
                  <h3 className="text-lg font-semibold text-forest-green">Bus No. 3 / 73 — Old Bus Stand → Zoological Park (Direct)</h3>
                  <div className="mt-3 w-full overflow-x-auto">
                    <table className="min-w-[380px] table-auto text-forest-green">
                      <thead>
                        <tr className="text-xs font-semibold uppercase tracking-[0.08em] text-forest-green/80">
                          <th className="p-2 text-left border-b border-forest-green/10">Departure</th>
                          <th className="p-2 text-left border-b border-forest-green/10">Arrival</th>
                        </tr>
                      </thead>
                      <tbody className="text-sm divide-y divide-forest-green/10">
                        <tr>
                          <td className="p-2">4:55 AM</td>
                          <td className="p-2">5:40 AM</td>
                        </tr>
                        <tr>
                          <td className="p-2">7:22 AM</td>
                          <td className="p-2">8:00 AM</td>
                        </tr>
                        <tr>
                          <td className="p-2">9:05 AM</td>
                          <td className="p-2">9:54 AM</td>
                        </tr>
                        <tr>
                          <td className="p-2">12:40 PM</td>
                          <td className="p-2">1:20 PM</td>
                        </tr>
                        <tr>
                          <td className="p-2">2:35 PM</td>
                          <td className="p-2">3:15 PM</td>
                        </tr>
                        <tr>
                          <td className="p-2">6:35 PM</td>
                          <td className="p-2">7:15 PM</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              <p className="text-center text-sm text-forest-green/70">
                Timings are subject to change. Please confirm locally before travel.
              </p>
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
                  src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3713.0055266035456!2d78.16758937482015!3d11.744942488468933!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3babf6c57f2ecabb%3A0x974814abf4e4f02e!2sKurumbapatty%20Zoological%20Park!5e1!3m2!1sen!2sin!4v1767024712201!5m2!1sen!2sin"
                  width="100%"
                  height="420"
                  style={{ border: 0 }}
                  allowFullScreen
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                />
              </div>
            </div>
          </article>
        </div>
      </section>
    </div>
  )
}
