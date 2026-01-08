export function PrivacyPage() {
  return (
    <section className="relative overflow-hidden bg-[#F4FBF6] py-24">
      <div className="container">
        <div className="mx-auto max-w-4xl space-y-8 rounded-3xl border border-forest-green/15 bg-white/95 p-10 shadow-xl backdrop-blur-sm">
          <header className="space-y-3 text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.4em] text-forest-green/60">Kurumbapatti Zoological Park</p>
            <h1 className="text-3xl font-bold text-forest-green md:text-4xl">Privacy Policy</h1>
            <p className="text-sm text-forest-green/70">At Kurumbapatti Zoological Park – Online Ticket Booking System</p>
          </header>

          <div className="space-y-6 text-forest-green/90">
            <p>
              At Kurumbapatti Zoological Park – Online Ticket Booking System (accessible from your official website/domain),
              one of our top priorities is the privacy and security of our visitors and users. This Privacy Policy document
              explains what information we collect, how we use it, how we protect it, and your rights regarding your data.
              This Privacy Policy applies only to online activities conducted through this website and does not apply to
              offline data collection or any other channels. If you have any questions or need further clarification, please
              contact us using the details provided below.
            </p>

            <hr className="border-forest-green/10" />

            <section className="space-y-3">
              <h2 className="text-lg font-semibold text-forest-green">1. Consent</h2>
              <p>By accessing or using our website, booking tickets, or submitting your information, you hereby consent to this Privacy Policy and agree to its terms.</p>
            </section>

            <section className="space-y-3">
              <h2 className="text-lg font-semibold text-forest-green">2. Information We Collect</h2>
              <p className="font-semibold">We collect information only when necessary to provide secure and efficient services.</p>
              <h3 className="text-md font-semibold">a) Personal Information</h3>
              <ul className="list-disc pl-5">
                <li>Full name</li>
                <li>Mobile number</li>
                <li>Email address</li>
                <li>Visit date and ticket details</li>
                <li>Transaction reference ID</li>
                <li>Any information you voluntarily provide through forms or support requests</li>
              </ul>

              <h3 className="text-md font-semibold">b) Payment Information</h3>
              <ul className="list-disc pl-5">
                <li>We do not store debit/credit card details, UPI IDs, or banking credentials</li>
                <li>All payments are securely processed through authorized third-party payment gateways</li>
              </ul>

              <h3 className="text-md font-semibold">c) Technical &amp; Usage Data</h3>
              <ul className="list-disc pl-5">
                <li>IP address</li>
                <li>Browser type and version</li>
                <li>Device information</li>
                <li>Date and time of access</li>
                <li>Pages visited and navigation patterns</li>
                <li>QR scan status (entered / not entered)</li>
              </ul>
            </section>

            <section className="space-y-3">
              <h2 className="text-lg font-semibold text-forest-green">3. How We Use Your Information</h2>
              <ul className="list-disc pl-5">
                <li>Generate and validate online zoo tickets</li>
                <li>Provide QR code–based entry verification</li>
                <li>Confirm bookings and send notifications (SMS / email)</li>
                <li>Prevent fraud, duplicate entry, or misuse</li>
                <li>Improve website performance and user experience</li>
                <li>Respond to user queries and support requests</li>
                <li>Maintain system security and audit logs</li>
                <li>Comply with legal and regulatory obligations</li>
              </ul>
            </section>

            <section className="space-y-3">
              <h2 className="text-lg font-semibold text-forest-green">4. Ticket Validation &amp; Security</h2>
              <ul className="list-disc pl-5">
                <li>Each ticket is generated with a unique Ticket ID and QR Code</li>
                <li>QR codes are validated at the zoo entrance and marked as used once</li>
                <li>Entry status is logged to prevent reuse or duplication</li>
                <li>Any attempt to misuse tickets may lead to blocking without refund</li>
              </ul>
            </section>

            <section className="space-y-3">
              <h2 className="text-lg font-semibold text-forest-green">5. Log Files</h2>
              <p>Like most websites, we use log files to track usage patterns. These logs may include IP addresses, browser type, ISP, date/time stamps, and referring/exit pages. This data is not linked to personally identifiable information and is used for system monitoring, security audits, performance optimization, and fraud detection.</p>
            </section>

            <section className="space-y-3">
              <h2 className="text-lg font-semibold text-forest-green">6. Cookies and Web Technologies</h2>
              <p>Our website uses cookies to maintain session security, remember user preferences, improve functionality, and analyze traffic. You may choose to disable cookies through your browser settings; however, doing so may affect certain features of the website.</p>
            </section>

            <section className="space-y-3">
              <h2 className="text-lg font-semibold text-forest-green">7. Third-Party Services &amp; Advertising</h2>
              <p>We may use trusted third-party services such as payment gateways, analytics providers, and SMS/email notification services. These third parties may use cookies or similar technologies and are governed by their own privacy policies. We have no control over third-party cookies.</p>
              <p className="mt-2">Example: Google Ads &amp; Analytics — https://policies.google.com/technologies/ads</p>
            </section>

            <section className="space-y-3">
              <h2 className="text-lg font-semibold text-forest-green">8. Data Protection &amp; Storage</h2>
              <ul className="list-disc pl-5">
                <li>All reasonable technical and organizational security measures are implemented</li>
                <li>Access to user data is restricted to authorized personnel only</li>
                <li>Data is stored only for as long as necessary for operational or legal purposes</li>
                <li>Despite best efforts, no online system is 100% secure. Users acknowledge this inherent risk.</li>
              </ul>
            </section>

            <section className="space-y-3">
              <h2 className="text-lg font-semibold text-forest-green">9. CCPA Privacy Rights (For California Users)</h2>
              <p>Under the CCPA, users have the right to request disclosure, deletion, and to opt-out of sale of personal data (we do not sell data). Requests will be processed within one month.</p>
            </section>

            <section className="space-y-3">
              <h2 className="text-lg font-semibold text-forest-green">10. GDPR Data Protection Rights</h2>
              <p>All users are entitled to rights such as access, rectification, erasure, restriction, objection, and data portability. To exercise these rights, please contact us. Requests will be addressed within 30 days.</p>
            </section>

            <section className="space-y-3">
              <h2 className="text-lg font-semibold text-forest-green">11. Children’s Privacy</h2>
              <ul className="list-disc pl-5">
                <li>This website is not intended for children under the age of 13</li>
                <li>We do not knowingly collect personal data from children</li>
                <li>If such data is identified, it will be immediately removed</li>
              </ul>
            </section>

            <section className="space-y-3">
              <h2 className="text-lg font-semibold text-forest-green">12. Data Sharing Policy</h2>
              <p>We do not sell, trade, or rent users’ personal information. Data may be shared only when required by law, necessary to complete a transaction, or required for fraud prevention or security investigations.</p>
            </section>

            <section className="space-y-3">
              <h2 className="text-lg font-semibold text-forest-green">13. Changes to This Privacy Policy</h2>
              <p>We reserve the right to update or modify this Privacy Policy at any time. Changes will be effective immediately upon posting on this page. Users are advised to review this page periodically.</p>
            </section>

            <section className="space-y-3">
              <h2 className="text-lg font-semibold text-forest-green">14. Contact Us</h2>
              <p>If you have any questions, concerns, or requests regarding this Privacy Policy, please contact us through the official support channel provided on the website.</p>
            </section>

            <div className="text-sm text-forest-green/70">© Copyright 2026. All Rights Reserved — Powered by Pargavan Cyyber Solutions</div>
          </div>
        </div>
      </div>
    </section>
  )
}
