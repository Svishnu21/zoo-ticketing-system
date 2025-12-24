export function CancellationPage() {
  return (
    <section className="relative overflow-hidden bg-[#F4FBF6] py-24">
      <div className="container">
        <div className="mx-auto max-w-4xl space-y-8 rounded-3xl border border-forest-green/15 bg-white/95 p-10 shadow-xl backdrop-blur-sm">
          <header className="space-y-3 text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.4em] text-forest-green/60">Kurumbapatti Zoological Park</p>
            <h1 className="text-3xl font-bold text-forest-green md:text-4xl">Cancellation &amp; Refund Policy</h1>
            <p className="text-sm text-forest-green/70">Understand our booking commitments before finalizing your visit.</p>
          </header>

          <div className="space-y-6 text-forest-green/90">
            <section className="space-y-3">
              <h2 className="text-lg font-semibold text-forest-green">No Cancellations</h2>
              <p>
                To provide the best experience and carefully manage park capacity, all bookings are final. Once a ticket is
                booked, it cannot be cancelled or edited for a different date or time slot.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-lg font-semibold text-forest-green">No Refunds</h2>
              <p>
                Tickets are strictly non-refundable and non-transferable. No refunds will be issued for no-shows or for tickets
                that are not used on the specified date. Please confirm your availability before completing the payment.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-lg font-semibold text-forest-green">Non-Transferable</h2>
              <p>
                Tickets cannot be transferred to another person or rescheduled for a different date or time. Each confirmed
                booking is linked to the visitor details supplied during checkout.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-lg font-semibold text-forest-green">Review Before Payment</h2>
              <p>
                Please review your booking details carefully for the correct date, time, and ticket quantities before proceeding
                to payment. If you have any questions, contact the park support team prior to submitting your booking.
              </p>
            </section>
          </div>
        </div>
      </div>
    </section>
  )
}
