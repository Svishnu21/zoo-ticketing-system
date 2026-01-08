# Kurumbapatti Zoological Park Website

Production-ready React + Vite build for the Kurumbapatti Zoological Park. The site mirrors the provided design system, delivers bilingual (English/Tamil) content, and ships with interactive experiences such as the hero slider, tariff calculator, booking workflow, and gallery lightbox.

> **Note:** All imagery currently references royalty-free Unsplash placeholders. Replace these URLs with approved assets before launch.

## ✨ Key Features

- Tailwind-powered design tokens (colors, gradients, shadows, radius) matching the forest theme specification.
- Sticky header with bilingual navigation, Tamil toggle, and responsive mobile drawer.
- Auto-playing hero slider with manual controls and CTA buttons.
- Dedicated pages for Home, About, Safari, Zoo Animals, Facilities, Tariff Calculator, Visitor Information, Gallery (with lightbox), and Contact (form + details).
- Live tariff calculator with quantity controls, sticky total card, and online booking modal.
- Tamil/English language toggle persisted between visits.
- Smooth scrolling, hover animations, and `page-enter` transitions.

## 🧱 Tech Stack

- React 19 + TypeScript
- Vite 7
- Tailwind CSS 3.4
- React Router 7
- Lucide React Icons

## 🚀 Getting Started

```bash
# Install dependencies
npm install

# Start full-stack dev (frontend + backend via proxy). Vite runs at localhost:5173 and proxies /api, /qr, /scanner to the backend (default 5000, override BACKEND_PORT).
npm run dev

# Start booking API server only (requires .env configuration)
npm run server

# Notes on validation & payload ownership
# - Frontend sends minimal item data (code/name/qty); backend owns pricing and caps quantities at 100 per item.
# - OTP and payment flows are static in dev; backend remains the authority for totals and ticket issuance.

# Lint source
npm run lint

# Build for production
npm run build

# Preview production bundle locally
npm run preview
```

## 📁 Notable Structure

- `src/components/` – Reusable UI (header, footer, buttons, hero slider, tariff widgets, gallery lightbox).
- `src/data/content.ts` – Bilingual content datasource (text blocks, animals, facilities, tariffs, gallery, etc.).
- `src/pages/` – Route components per page specification.
- `src/providers/LanguageProvider.tsx` – Language context + persistence.
- `src/utils/cn.ts` – Tailwind-friendly class merger.

## 🌐 Internationalization

- `LanguageToggle` control in the header switches between English (`EN`) and Tamil (`தமிழ்`).
- Text content draws from bilingual data structures and mirrors the spec’s Tamil sublabels on navigation and page headings.
- Selections persist via `localStorage` so return visitors see their last language automatically.

## 🧾 Tariff & Booking Flow

- Calculator covers all eight items from the fee table with +/- quantity controls.
- Sticky summary shows real-time total and opens an online booking modal.
- Booking modal collects visitor contact details, previews selected tickets, and confirms submission client-side.
- Review Booking page adds a four-digit OTP verification step with timer messaging and client-side validation before final submission.
- Default development OTP is `0000` (override via `VITE_DEFAULT_OTP` in your `.env`).
- Successful OTP entry opens a confirmation modal requiring Terms & Conditions acceptance before routing to payment.
- Payment page presents a two-column summary + card form; use `vishnu`, `11/25`, and `123` to trigger the demo success flow.
- Success page renders the ticket card with share-to-WhatsApp support and themed action buttons.

## 📸 Gallery Lightbox

- Grid follows the responsive pattern (`grid-cols-2`, `md:grid-cols-3`, `lg:grid-cols-4`).
- Clicking any image opens a keyboard-friendly lightbox with next/previous controls and Tamil-aware captions.

## ✅ Next Steps

- Replace placeholder imagery with curated park assets.
- Connect the booking form to the official reservation backend or notification channel if required.
- Review Tamil translations with native speakers for accuracy before public release.
- Replace the `public/payment.html` placeholder with the live payment experience once integrated.

## 🗄️ Booking API & Database Setup

1. Duplicate the provided `.env.example` as `.env` and update `MONGODB_URI` with your MongoDB Compass connection string (for example, a local `mongodb://localhost:27017/kurumbapatti-zoo`).
2. Optionally set `PORT` if you do not want to use the default `5000`.
3. Run `npm run server` to start the Express + Mongoose API. You should see a confirmation message once the connection succeeds.
4. While developing, the front-end posts to `http://localhost:5000/api/bookings`. Override this by defining `VITE_API_BASE_URL` in a Vite environment file if you deploy the backend elsewhere.
5. When visitors complete OTP verification on the Review Booking page, their booking summary, visitor details, submitted OTP, and total are persisted to the configured MongoDB collection.

### Backend endpoints

- POST /api/bookings – Creates a booking, recalculates totals from the server-side tariff list, issues a secure QR token (random only; no ticket details inside), and returns booking + payment metadata.
- GET /api/bookings/:id – Returns a booking summary (by MongoDB id or ticketId) without exposing the QR token hash.
- POST /api/scanner/validate – Gate-side validator that accepts a QR token, enforces same-day entry, and atomically marks the token as used to block replays.

### Seeding pricing

- Add your pricing rows to `seeds/ticketPricing.json`.
- Run `node scripts/seed-ticket-pricing.mjs` (requires MONGODB_URI in `.env`).
- Booking calls always reload pricing from the database—no code defaults are used at runtime.

## Admin → Online Bookings (Phase-1 constraints)

- **Resend action**: Calls `/admin/bookings/:ticketId/resend`, which returns an acknowledgment only. No SMS/WhatsApp/email delivery is wired in Phase-1. UI shows a neutral confirmation and makes no delivery promises or retries.
- **Dashboard metrics guard**: Booking/entry metrics show live counts only when the Visit Date filter is set to today. This avoids misleading aggregates for other dates; global totals are intentionally not shown.
- **Internal notes/flags**: Not persisted because no sanctioned audit-safe field exists. The admin UI does not expose note inputs and must not imply saved annotations until a formal storage mechanism is approved.
- **Safety locks**: Admin actions are non-mutative for payment status, entry status, and booking identity. Assistance actions (view, resend) are idempotent and rely on backend validation/logging where present.

These boundaries are deliberate to ship a production-safe, auditable Phase-1 without schema changes or risky admin controls. Do not add TODOs or placeholder delivery code that imply unfinished critical features.

Enjoy building with the Kurumbapatti Zoological Park experience! If you need additional integrations or API wiring, feel free to extend the components above.
