# Kurumbapatti Zoological Park Website
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
