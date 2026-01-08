export function CancellationPage() {
  return (
    <section className="relative overflow-hidden bg-[#F4FBF6] py-24">
      <div className="container">
        <div className="mx-auto max-w-4xl space-y-8 rounded-3xl border border-forest-green/15 bg-white/95 p-10 shadow-xl backdrop-blur-sm">
          <header className="space-y-3 text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.4em] text-forest-green/60">Kurumbapatti Zoological Park</p>
            <h1 className="text-3xl font-bold text-forest-green md:text-4xl">Refund Policy</h1>
            <p className="text-sm text-forest-green/70">At Kurumbapatti Zoological Park Online Ticket Booking System</p>
          </header>

          <div className="space-y-6 text-forest-green/90">
            <p>
              At Kurumbapatti Zoological Park Online Ticket Booking System (accessible from your official website/domain), we
              strive to provide a smooth and transparent ticket booking experience for all visitors. This Refund Policy explains
              the conditions under which refunds may or may not be provided. By booking tickets through our website, you agree to
              the terms outlined in this Refund Policy.
            </p>

            <hr className="border-forest-green/10" />

            <section className="space-y-3">
              <h2 className="text-lg font-semibold text-forest-green">1. Ticket Confirmation &amp; Usage</h2>
              <ul className="list-disc pl-5">
                <li>All tickets booked online are issued with a unique Ticket ID and QR Code.</li>
                <li>Each ticket is valid for a single entry only and must be scanned at the zoo entrance.</li>
                <li>Once a ticket is scanned and marked as “Entered”, it is non-refundable and non-transferable.</li>
              </ul>
            </section>

            <section className="space-y-3">
              <h2 className="text-lg font-semibold text-forest-green">2. Refund Eligibility</h2>
              <p className="font-semibold">Refunds are applicable only under the following circumstances:</p>
              <p className="mt-2 font-semibold">Eligible for Refund</p>
              <ul className="list-disc pl-5">
                <li>Payment deducted but ticket not generated</li>
                <li>Transaction failure due to payment gateway issues</li>
                <li>Duplicate payment for the same booking</li>
                <li>Zoo closure on the selected visit date due to government orders, emergencies, or unforeseen circumstances</li>
              </ul>

              <p className="mt-2 font-semibold">Not Eligible for Refund</p>
              <ul className="list-disc pl-5">
                <li>Tickets not used on the selected visit date</li>
                <li>Late arrival or no-show</li>
                <li>Tickets already scanned or marked as entered</li>
                <li>Incorrect date or ticket details selected by the user</li>
                <li>Cancellation due to personal reasons</li>
                <li>Internet, device, or user-side technical issues</li>
              </ul>
            </section>

            <section className="space-y-3">
              <h2 className="text-lg font-semibold text-forest-green">3. Cancellation Policy</h2>
              <ul className="list-disc pl-5">
                <li>Online ticket cancellations are not allowed once the ticket is generated</li>
                <li>Date modification or rescheduling is not permitted</li>
                <li>Please ensure you verify the visit date, ticket count, and visitor category before confirming payment</li>
              </ul>
            </section>

            <section className="space-y-3">
              <h2 className="text-lg font-semibold text-forest-green">4. Refund Processing Time</h2>
              <ul className="list-disc pl-5">
                <li>Approved refunds will be processed to the original payment method</li>
                <li>Refunds typically take 5–7 working days, depending on the bank or payment provider</li>
                <li>Any payment gateway charges, if applicable, may be deducted</li>
              </ul>
            </section>

            <section className="space-y-3">
              <h2 className="text-lg font-semibold text-forest-green">5. Payment Gateway Responsibility</h2>
              <ul className="list-disc pl-5">
                <li>All online payments are processed through secure third-party payment gateways</li>
                <li>We are not responsible for delays caused by banks or payment service providers</li>
                <li>For failed or pending transactions, users are advised to check their bank statement before raising a request</li>
              </ul>
            </section>

            <section className="space-y-3">
              <h2 className="text-lg font-semibold text-forest-green">6. Entry Validation &amp; Fraud Prevention</h2>
              <ul className="list-disc pl-5">
                <li>Tickets are validated using QR code scanning at the zoo entrance</li>
                <li>Any attempt to reuse, duplicate, or tamper with tickets will result in entry denial without refund</li>
                <li>The administration reserves the right to invalidate tickets in case of misuse</li>
              </ul>
            </section>

            <section className="space-y-3">
              <h2 className="text-lg font-semibold text-forest-green">7. Contact for Refund Queries</h2>
              <p>If you face any payment-related issues or believe you are eligible for a refund, please contact us with the following details:</p>
              <ul className="list-disc pl-5">
                <li>Ticket ID</li>
                <li>Registered mobile number</li>
                <li>Transaction reference ID</li>
                <li>Booking date and visit date</li>
                <li>Screenshot (if applicable)</li>
              </ul>
              <p className="mt-2">Contact: <a className="text-accent-yellow underline" href="https://kzpsalem.com/contact" target="_blank" rel="noopener noreferrer">https://kzpsalem.com/contact</a></p>
            </section>

            <section className="space-y-3">
              <h2 className="text-lg font-semibold text-forest-green">8. Policy Changes</h2>
              <p>
                Kurumbapatti Zoological Park reserves the right to modify or update this Refund Policy at any time without prior
                notice. Changes will be effective immediately upon posting on this page.
              </p>
            </section>

            <div className="text-sm text-forest-green/70">© Copyright 2026. All Rights Reserved — Powered by Pargavan Cyyber Solutions</div>
          </div>
        </div>
      </div>
    </section>
  )
}
