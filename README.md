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

# Start development server
npm run dev

# Start booking API server (requires .env configuration)
npm run server

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

Enjoy building with the Kurumbapatti Zoological Park experience! If you need additional integrations or API wiring, feel free to extend the components above.
