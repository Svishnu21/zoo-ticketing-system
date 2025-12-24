export function TermsPage() {
  return (
    <section className="relative overflow-hidden bg-[#F4FBF6] py-24">
      <div className="container">
        <div className="mx-auto max-w-4xl space-y-8 rounded-3xl border border-forest-green/15 bg-white/95 p-10 shadow-xl backdrop-blur-sm">
          <header className="space-y-3 text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.4em] text-forest-green/60">Kurumbapatti Zoological Park</p>
            <h1 className="text-3xl font-bold text-forest-green md:text-4xl">Terms &amp; Conditions</h1>
            <p className="text-sm text-forest-green/70">
              Please review these guidelines carefully before completing your booking.
            </p>
          </header>

          <div className="space-y-6 text-forest-green/90">
            <section className="space-y-3">
              <h2 className="text-lg font-semibold text-forest-green">Ticket Booking</h2>
              <p>
                All tickets are booked for a specific date and time slot. Tickets are valid only for the date and time
                specified. Please ensure you arrive at the park entrance with your digital ticket and a valid photo ID.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-lg font-semibold text-forest-green">Visitor Conduct</h2>
              <p>
                All visitors must adhere to the park&apos;s rules and regulations, which are displayed at the park entrance and
                available on our &ldquo;Park Rules&rdquo; page. The park management reserves the right to refuse entry or remove any
                visitor who does not comply with these rules.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-lg font-semibold text-forest-green">Accuracy of Information</h2>
              <p>
                You agree to provide accurate, current, and complete information during the booking process, including your
                name, mobile number, and email address. This information is used to deliver your digital ticket and share
                important visit updates.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-lg font-semibold text-forest-green">Use of Website</h2>
              <p>
                This website is for your personal and non-commercial use. You may not modify, copy, or distribute any
                content or information from this site without explicit permission from Kurumbapatti Zoological Park.
              </p>
            </section>
          </div>
        </div>
      </div>
    </section>
  )
}
