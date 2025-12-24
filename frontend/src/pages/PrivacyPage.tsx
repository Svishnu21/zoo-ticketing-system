export function PrivacyPage() {
  return (
    <section className="relative overflow-hidden bg-[#F4FBF6] py-24">
      <div className="container">
        <div className="mx-auto max-w-4xl space-y-8 rounded-3xl border border-forest-green/15 bg-white/95 p-10 shadow-xl backdrop-blur-sm">
          <header className="space-y-3 text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.4em] text-forest-green/60">Kurumbapatti Zoological Park</p>
            <h1 className="text-3xl font-bold text-forest-green md:text-4xl">Privacy Policy</h1>
            <p className="text-sm text-forest-green/70">Your privacy matters to us. Here is how we collect and safeguard your data.</p>
          </header>

          <div className="space-y-6 text-forest-green/90">
            <section className="space-y-3">
              <h2 className="text-lg font-semibold text-forest-green">What We Collect</h2>
              <p>
                We collect personal information you provide during the booking process, such as your name, email address,
                and mobile number. This information helps us confirm your reservation and ensure a smooth entry experience.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-lg font-semibold text-forest-green">How We Use It</h2>
              <p>
                Your details are used solely to process your ticket booking. We send booking confirmations, digital tickets,
                and important updates to the contact information you supply, ensuring you stay informed about your visit.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-lg font-semibold text-forest-green">Data Protection</h2>
              <p>
                We implement reasonable security measures to protect your personal information and prevent unauthorized
                access. We do not sell, trade, or otherwise transfer your personal information to outside parties.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-lg font-semibold text-forest-green">Consent</h2>
              <p>
                By using our site and booking a ticket, you consent to this privacy policy. Please review it regularly for
                updates, and contact the park team if you have any questions about your data.
              </p>
            </section>
          </div>
        </div>
      </div>
    </section>
  )
}
