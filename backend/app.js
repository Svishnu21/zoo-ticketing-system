import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import rateLimit from 'express-rate-limit'
import mongoSanitize from 'express-mongo-sanitize'
import hpp from 'hpp'
import fs from 'fs'
import path from 'path'
import React from 'react'
import { Document, Page, Text, View, pdf } from '@react-pdf/renderer'
import { fileURLToPath } from 'url'

import bookingRoutes from './routes/bookingRoutes.js'
import dayControlRoutes from './routes/dayControlRoutes.js'
import systemSettingsRoutes from './routes/systemSettings.js'
import scannerRoutes from './routes/scannerRoutes.js'
import counterRoutes from './routes/counterRoutes.js'
import authRoutes from './routes/authRoutes.js'
import userRoutes from './routes/userRoutes.js'
import assignmentRoutes from './routes/assignmentRoutes.js'
import paymentRoutes from './routes/payment.js'
import adminRoutes from '../admin/admin.routes.js'
import { requireAuth, requireRole, requireAdminSession } from './middleware/authMiddleware.js'
import { setCsrfCookie, verifyCsrfToken } from './middleware/csrf.js'
import { ApiError, errorHandler } from './utils/errors.js'
import { getCounterTicket } from './services/counterBookingService.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const PUBLIC_PATH = path.join(__dirname, '..', 'public')
const FRONTEND_DIST = path.join(__dirname, '..', 'frontend', 'dist')
const DIST_PATH = fs.existsSync(FRONTEND_DIST) ? FRONTEND_DIST : path.join(__dirname, '..', 'dist')
const FRONTEND_PUBLIC = path.join(__dirname, '..', 'frontend', 'public')

const staticHtmlRoutes = [
  { route: '/payment', file: 'payment.html' },
  { route: '/success', file: 'success.html' },
  { route: '/review-adoption', file: 'review-adoption.html' },
  { route: '/adoption-success', file: 'adoption-success.html' },
  { route: '/csr-activity', file: 'csr-activity.html' },
]

const staticRouteSet = new Set(staticHtmlRoutes.map((item) => item.route))

const sensitiveNoCachePathMatchers = [
  /^\/success(?:\.html)?(?:\/.*)?$/i,
  /^\/payment(?:\.html)?(?:\/.*)?$/i,
  /^\/review-adoption(?:\.html)?(?:\/.*)?$/i,
  /^\/api\/tickets\/[^/]+(?:\/.*)?$/i,
  /^\/ticket\/[^/]+(?:\/.*)?$/i,
]

const escapeHtml = (value) => String(value ?? '')
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#39;')

const formatCounterDateOnly = (value) => {
  if (!value) return 'NOT SET'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return String(value)
  return date.toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' })
}

const formatCounterDateTime = (value) => {
  if (!value) return 'NOT SET'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return String(value)
  return date.toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

const formatCounterNumber = (value) => String(Number(value || 0).toFixed(0))

const buildCounterPrintHtml = (ticket = {}) => {
  const items = Array.isArray(ticket.items) ? ticket.items : []

  const itemRows = items.length
    ? items.map((item) => {
      const rawLabel = item?.itemLabel || item?.label || item?.categoryName || item?.itemCode || item?.categoryCode || 'Category'
      const isChildCode = (item?.itemCode || item?.code || '').toString().toLowerCase() === 'zoo_child'
      const label = escapeHtml(isChildCode ? 'Child (5 to 12 years)' : rawLabel)
      const qty = Number(item?.quantity || 0)
      const unitPrice = Number(item?.unitPrice ?? item?.price ?? 0)
      const amount = Number(item?.amount ?? qty * unitPrice)
      return `
        <tr>
          <td>${label}</td>
          <td class="qty">${qty}</td>
          <td class="price">${formatCounterNumber(unitPrice)}</td>
          <td class="amount">${formatCounterNumber(amount)}</td>
        </tr>
      `
    }).join('')
    : '<tr><td colspan="4">No items</td></tr>'

  const qrMarkup = ticket.qrImage
    ? `<img src="${escapeHtml(ticket.qrImage)}" alt="QR code" style="width: 140px; height: 140px; object-fit: contain; border: 1px solid #000; display: block;" />`
    : 'QR'

  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Kurumbapatti Zoological Park - Printable Ticket (Counter)</title>
    <style>
      :root { color-scheme: light; }
      * { box-sizing: border-box; }

      body {
        margin: 0;
        background: #fff;
        color: #000;
        font-family: "Courier New", Consolas, Monaco, Menlo, monospace;
        display: flex;
        justify-content: center;
      }

      main {
        width: 100%;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: flex-start;
        padding: 16px 0;
        gap: 12px;
      }

      .ticket-wrapper {
        width: 100%;
        display: flex;
        justify-content: center;
      }

      .ticket-container {
        width: 300px;
        max-width: calc(100vw - 24px);
      }

      .ticket {
        border: 1px solid #000;
        padding: 12px;
        line-height: 1.35;
        page-break-inside: avoid;
        background: #fff;
        margin-bottom: 0;
      }

      .ticket-header {
        text-align: center;
      }

      .ticket-header .gov {
        font-size: 0.82rem;
        letter-spacing: 0.08em;
        text-transform: uppercase;
      }

      .ticket-header .zoo {
        margin: 2px 0;
        font-weight: 700;
        font-size: 1rem;
      }

      .ticket-header .title {
        margin: 0;
        font-size: 0.92rem;
        text-transform: uppercase;
        letter-spacing: 0.08em;
      }

      .divider {
        border-top: 1px dashed #000;
        margin: 8px 0;
      }

      .meta {
        display: grid;
        gap: 4px;
        font-size: 0.92rem;
      }

      .meta-row {
        display: flex;
        justify-content: space-between;
      }

      .meta-label {
        text-transform: uppercase;
        letter-spacing: 0.04em;
      }

      .meta-value {
        font-weight: 700;
      }

      table {
        width: 100%;
        border-collapse: collapse;
        font-size: 0.92rem;
        margin-top: 6px;
        font-family: inherit;
        font-variant-numeric: tabular-nums;
      }

      th,
      td {
        padding: 4px 0;
        text-align: left;
        border-bottom: 1px dashed #000;
      }

      th {
        font-size: 0.82rem;
        text-transform: uppercase;
        letter-spacing: 0.06em;
      }

      td.qty,
      td.price,
      td.amount {
        text-align: right;
      }

      tbody tr:last-child td {
        border-bottom: 1px solid #000;
      }

      .total {
        display: flex;
        justify-content: space-between;
        font-weight: 700;
        margin-top: 6px;
        padding-top: 6px;
        border-top: 2px solid #000;
      }

      .qr-block {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 6px;
        margin: 10px 0 4px;
      }

      .qr-label {
        font-weight: 700;
      }

      .qr-box {
        width: 140px;
        height: 140px;
        border: 1px solid #000;
        display: flex;
        align-items: center;
        justify-content: center;
        font-weight: 700;
        text-align: center;
      }

      .notes {
        width: 100%;
        font-size: 0.9rem;
        margin: 6px 0 0;
        padding: 0;
        list-style: none;
      }

      .notes li {
        margin: 2px 0;
      }

      .footer {
        text-align: center;
        font-size: 0.9rem;
        margin-top: 6px;
        line-height: 1.3;
      }

      .actions {
        display: flex;
        gap: 8px;
        justify-content: center;
        margin-top: 0;
      }

      button {
        border: 1px solid #000;
        background: #fff;
        padding: 8px 10px;
        font-weight: 700;
        font-family: inherit;
        cursor: pointer;
        text-decoration: none;
        color: #000;
      }

      .btn-print {
        background: #16a34a;
        border-color: #16a34a;
        color: #fff;
      }

      .btn-print:hover {
        background: #15803d;
        border-color: #15803d;
      }

      .btn-home {
        background: #dc2626;
        border-color: #dc2626;
        color: #fff;
      }

      .btn-home:hover {
        background: #b91c1c;
        border-color: #b91c1c;
      }

      @media print {
        @page {
          size: auto;
          margin: 0;
        }

        body {
          margin: 0;
          padding: 0;
          background: #fff;
        }

        main {
          margin: 0;
          padding: 0;
          width: 100%;
        }

        .ticket-wrapper {
          width: 100%;
          display: flex;
          justify-content: center;
          margin: 0;
          padding: 0;
        }

        .no-print {
          display: none !important;
        }

        .ticket-container {
          width: 300px;
          max-width: 300px;
          margin: 0 auto;
        }

        .ticket {
          border: 1px solid #000;
          margin: 0;
        }
      }
    </style>
  </head>
  <body>
    <main class="print-wrap">
      <div id="print-area" class="ticket-wrapper">
        <section class="ticket ticket-container" aria-label="Kurumbapatti Zoological Park Ticket">
        <header class="ticket-header">
          <div class="gov">Government of Tamil Nadu</div>
          <div class="zoo">Kurumbapatti Zoological Park, Salem</div>
          <div class="title">Zoo Ticket</div>
        </header>

        <div class="divider"></div>

        <section class="meta" aria-label="Ticket identifiers">
          <div class="meta-row"><span class="meta-label">Ticket ID</span><span class="meta-value">${escapeHtml(ticket.ticketId || 'NOT SET')}</span></div>
          <div class="meta-row"><span class="meta-label">Ticket Source</span><span class="meta-value">${escapeHtml((ticket.ticketSource || 'COUNTER').toString().toUpperCase())}</span></div>
          <div class="meta-row"><span class="meta-label">Visit Date</span><span class="meta-value">${escapeHtml(formatCounterDateOnly(ticket.visitDate))}</span></div>
          <div class="meta-row"><span class="meta-label">Issue Date &amp; Time</span><span class="meta-value">${escapeHtml(formatCounterDateTime(ticket.issueDate))}</span></div>
          <div class="meta-row"><span class="meta-label">Payment Mode</span><span class="meta-value">${escapeHtml((ticket.paymentMode || 'NOT SET').toString().toUpperCase())}</span></div>
        </section>

        <div class="divider"></div>

        <section aria-label="Ticket breakdown">
          <table>
          <thead>
            <tr>
              <th>Ticket Items</th>
              <th>Quantity</th>
              <th>Unit Price</th>
              <th>Total Amount</th>
            </tr>
          </thead>
          <tbody>
            ${itemRows}
          </tbody>
        </table>
          <div class="total"><span>Total Amount Paid</span><span>${escapeHtml(formatCounterNumber(ticket.totalAmount || 0))}</span></div>
        </section>

        <div class="divider"></div>

        <section class="qr-block" aria-label="QR and entry notes">
          <div class="qr-label">Ticket Type</div>
          <div class="qr-box">${qrMarkup}</div>
          <ul class="notes">
            <li>Single entry only.</li>
            <li>Entry timings: 09:00 AM - 05:00 PM.</li>
            <li>Closed on Tuesdays (weekly holiday).</li>
            <li>Keep this ticket until you exit the park.</li>
          </ul>
        </section>

        <div class="footer">
          <div>Scan this QR code at the entry gate.</div>
          <div>Ticket once used is invalid for re-entry.</div>
        </div>
        </section>
      </div>

      <div class="actions no-print">
        <button class="btn-print" type="button" onclick="window.print()">Print Ticket</button>
        <button class="btn-home" type="button" onclick="window.location.href='/admin/dashboard.html#counter'">Back to Counter Report</button>
      </div>
    </main>

    <script>
      window.addEventListener('load', function () {
        window.setTimeout(function () {
          window.print();
        }, 180);
      });
    </script>
  </body>
</html>`
}

export const createApp = () => {
  const app = express()
  const ADMIN_PATH = path.join(PUBLIC_PATH, 'admin')

  const allowedOrigins = (process.env.ALLOWED_ORIGINS || '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean)

  const corsOptions = {
    origin: (origin, callback) => {
      // Allow non-browser or same-origin requests with no Origin header.
      if (!origin) return callback(null, true)
      // In local development, allow all origins to avoid blocked assets when Vite auto-switches ports.
      if (process.env.NODE_ENV !== 'production') {
        return callback(null, true)
      }
      const isEasebuzz = (origin || '').toString().toLowerCase().includes('easebuzz.in')
      if (allowedOrigins.includes(origin) || isEasebuzz) return callback(null, true)
      return callback(ApiError.forbidden('CORS origin not allowed.'))
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  }

  const authRateLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, message: 'Too many authentication attempts. Please try again later.' },
  })

  const apiRateLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 200,
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, message: 'Too many requests. Please try again later.' },
  })

  const cspDirectives = {
    defaultSrc: ["'self'"],
    scriptSrc: ["'self'", "'unsafe-inline'", 'https://unpkg.com'],
    styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
    imgSrc: ["'self'", 'data:', 'https:'],
    fontSrc: ["'self'", 'https://fonts.gstatic.com', 'data:'],
    connectSrc: ["'self'", 'https:', 'https://unpkg.com'],
    frameSrc: ["'self'", 'https://www.google.com', 'https://maps.google.com'],
    childSrc: ["'self'", 'https://www.google.com', 'https://maps.google.com'],
    baseUri: ["'self'"],
    formAction: ["'self'"],
    frameAncestors: ["'none'"],
  }

  if (process.env.NODE_ENV !== 'production') {
    cspDirectives.upgradeInsecureRequests = null
  }

  const resolveAdminFile = (fileName) => {
    const candidates = [
      path.join(ADMIN_PATH, fileName),
      path.join(FRONTEND_PUBLIC, 'admin', fileName),
    ]
    return candidates.find((filePath) => fs.existsSync(filePath))
  }

  const sendAdminFile = (fileName, notFoundMessage, res, next) => {
    const filePath = resolveAdminFile(fileName)
    if (!filePath) return next(ApiError.notFound(notFoundMessage))

    return res.sendFile(filePath, (error) => {
      if (error) next(error)
    })
  }

  const isProtectedAdminHtml = (requestPath) => {
    const normalized = (requestPath || '').toString().toLowerCase()
    if (!normalized.startsWith('/admin/')) return false
    if (!normalized.endsWith('.html')) return false
    if (normalized === '/admin/login.html' || normalized === '/admin/index.html') return false
    return true
  }

  app.set('trust proxy', 1)
  app.disable('x-powered-by')
  app.use(
    helmet({
      contentSecurityPolicy: {
        useDefaults: true,
        directives: cspDirectives,
      },
    }),
  )
  app.use(cors(corsOptions))
  app.use(express.json({ limit: '50kb' }))
  app.use(express.urlencoded({ extended: true, limit: '50kb' }))
  app.use((req, _res, next) => {
    // Express 5 exposes req.query via getter-only property; sanitize in place and avoid reassignment.
    ['body', 'params', 'headers', 'query'].forEach((key) => {
      const target = req[key]
      if (target && typeof target === 'object') {
        mongoSanitize.sanitize(target)
      }
    })
    next()
  })
  app.use(hpp())
  app.use(setCsrfCookie)

  app.use('/api/auth/login', authRateLimiter)
  app.use('/api/auth/register', authRateLimiter)
  app.use('/api/auth/forgot-password', authRateLimiter)
  app.use('/api/auth/otp', authRateLimiter)
  app.use('/api/auth/reset-password', authRateLimiter)
  app.use('/api/counter/login', authRateLimiter)
  app.use('/api', apiRateLimiter)
  app.use('/api', verifyCsrfToken)
  app.use('/admin', verifyCsrfToken)

  // Prevent browser/proxy caching for sensitive booking-flow pages and ticket-fetch endpoints.
  app.use((req, res, next) => {
    const isSensitivePath = sensitiveNoCachePathMatchers.some((pattern) => pattern.test(req.path || ''))
    if (!isSensitivePath) return next()

    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate')
    res.setHeader('Pragma', 'no-cache')
    res.setHeader('Expires', '0')
    res.setHeader('Surrogate-Control', 'no-store')
    return next()
  })

  // Protect all admin HTML pages except login/index with server-side admin session checks.
  app.use((req, res, next) => {
    if (!isProtectedAdminHtml(req.path)) return next()
    return requireAdminSession(req, res, next)
  })

  if (fs.existsSync(PUBLIC_PATH)) {
    app.use(express.static(PUBLIC_PATH))
  }

  // Also serve frontend/public (unbuilt static assets) when present so
  // requests like `/js/counter.js` resolve during development.
  if (fs.existsSync(FRONTEND_PUBLIC)) {
    app.use(express.static(FRONTEND_PUBLIC))
  }

  // MOVED: Serve built frontend assets before route registrations so /assets/*.css and /assets/*.js are not intercepted.
  if (fs.existsSync(DIST_PATH)) {
    app.use(express.static(DIST_PATH))
  }

  // Serve friendly routes for static HTML from /public
  staticHtmlRoutes.forEach(({ route, file }) => {
    app.get(route, (_req, res, next) => {
      if (!fs.existsSync(PUBLIC_PATH)) return next()
      return res.sendFile(path.join(PUBLIC_PATH, file), (error) => {
        if (error) next(error)
      })
    })

    // Use a RegExp to match the route and any sub-paths. Some path-to-regexp versions
    // produce errors when a bare `*` token appears in the path string, so a regex
    // avoids that incompatibility while matching the same URLs (e.g. /payment/*).
    app.get(new RegExp(`^${route}(?:/.*)?$`), (_req, res, next) => {
      if (!fs.existsSync(PUBLIC_PATH)) return next()
      return res.sendFile(path.join(PUBLIC_PATH, file), (error) => {
        if (error) next(error)
      })
    })
  })

  // Serve admin static files from /public/admin
  if (fs.existsSync(ADMIN_PATH)) {
    app.use('/admin', express.static(ADMIN_PATH))
  }

  app.get('/admin/login', (_req, res, next) => {
    return sendAdminFile('login.html', 'Admin login page not found.', res, next)
  })

  // Admin booking details page entrypoint, protected by server-side admin session validation.
  app.get('/admin/booking/:ticketId', requireAdminSession, (_req, res, next) => {
    return sendAdminFile('booking.html', 'Admin booking page not found.', res, next)
  })

  // Admin counter ticket print route: render server-side print template with counter ticket data.
  app.get('/admin/counter/:ticketId/print', requireAdminSession, async (req, res, next) => {
    try {
      const ticketId = (req.params.ticketId || '').trim()
      if (!ticketId) return next(ApiError.badRequest('Counter ticket ID is required.'))

      const ticket = await getCounterTicket(ticketId)
      const html = buildCounterPrintHtml(ticket)
      res.setHeader('Content-Type', 'text/html; charset=utf-8')
      return res.status(200).send(html)
    } catch (error) {
      return next(error)
    }
  })

  // Admin counter ticket details page entrypoint, protected by server-side admin session validation.
  app.get('/admin/counter/:ticketId', requireAdminSession, (_req, res, next) => {
    return sendAdminFile('counter-ticket.html', 'Admin counter ticket page not found.', res, next)
  })

  // Protected admin download route for ticket view access.
  app.get('/admin/ticket/download/:ticketId', requireAdminSession, (req, res) => {
    const ticketId = (req.params.ticketId || '').trim()
    if (!ticketId) {
      return res.redirect('/admin/dashboard.html#bookings')
    }

    return res.redirect(`/ticket/${encodeURIComponent(ticketId)}`)
  })

  app.get('/api/health', (_req, res) => res.json({ status: 'ok' }))

  // Safe entry route for guarded client-side redirects from sensitive pages.
  app.get('/tickets', (_req, res) => {
    return res.redirect('/')
  })

  // Canonical ticket view route for opening the original booking ticket template.
  app.get('/ticket/:ticketId', (req, res) => {
    const ticketId = (req.params.ticketId || '').trim()
    if (!ticketId) {
      return res.redirect('/success.html')
    }

    const params = new URLSearchParams()
    params.set('ticketId', ticketId)
    Object.entries(req.query || {}).forEach(([key, value]) => {
      if (key === 'ticketId') return
      if (Array.isArray(value)) {
        value.forEach((item) => {
          if (item !== undefined && item !== null && String(item).length) params.append(key, String(item))
        })
      } else if (value !== undefined && value !== null && String(value).length) {
        params.set(key, String(value))
      }
    })

    return res.redirect(`/success.html?${params.toString()}`)
  })

  app.use('/api/auth', authRoutes)
  app.use('/api', assignmentRoutes)
  app.use('/api/users', userRoutes)

  app.use('/api/tickets', bookingRoutes)
  app.use('/api/bookings', bookingRoutes)
  app.use('/api/payment', paymentRoutes)
  app.use('/api/day-control', dayControlRoutes)
  app.use('/api', systemSettingsRoutes)
  app.use('/api/counter', requireAuth, requireRole('ADMIN', 'COUNTER'), counterRoutes)
  app.use('/api/scanner', requireAuth, requireRole('ADMIN', 'SCANNER'), scannerRoutes)
  app.use('/admin', requireAdminSession, adminRoutes)

  if (process.env.NODE_ENV !== 'production') {
    // --- PDF ISOLATION TEST (no shared logic, no DB) ---
    app.get('/__pdf_isolation_test__', async (_req, res, next) => {
      try {
        const doc = React.createElement(
          Document,
          null,
          React.createElement(
            Page,
            { size: 'A4' },
            React.createElement(Text, null, 'PDF ISOLATION TEST - OK'),
          ),
        )

        const blob = await pdf(doc).toBlob()
        const ab = await blob.arrayBuffer()
        const buffer = Buffer.from(ab)
        res.setHeader('Content-Type', 'application/pdf')
        res.setHeader('Content-Disposition', 'inline; filename="pdf-isolation-test.pdf"')
        res.setHeader('Content-Length', buffer.length)
        return res.end(buffer)
      } catch (error) {
        return next(error)
      }
    })
  }

  // --- Daily Summary PDF (binary-only, no redirects, placeholder data) ---
  app.get('/api/reports/daily-summary/pdf', async (_req, res, next) => {
    try {
      const doc = React.createElement(
        Document,
        null,
        React.createElement(
          Page,
          { size: 'A4' },
          React.createElement(
            View,
            null,
            React.createElement(Text, null, 'Daily Collection Summary'),
            React.createElement(Text, null, 'Binary stream check'),
            React.createElement(Text, null, 'This endpoint returns only PDF bytes.'),
          ),
        ),
      )

      const blob = await pdf(doc).toBlob()
      const ab = await blob.arrayBuffer()
      const buffer = Buffer.from(ab)
      res.setHeader('Content-Type', 'application/pdf')
      res.setHeader('Content-Disposition', 'inline; filename="daily-summary.pdf"')
      res.setHeader('Content-Length', buffer.length)
      return res.end(buffer)
    } catch (error) {
      return next(error)
    }
  })

  // Avoid using wildcard tokens in route strings (some path-to-regexp versions
  // treat `*` as a malformed parameter). Instead, handle unmatched `/api/`
  // requests via middleware that inspects the request path.
  app.use((req, _res, next) => {
    if (req.path.startsWith('/api/')) return next(ApiError.notFound('API route not found.'))
    return next()
  })

  if (fs.existsSync(DIST_PATH)) {
    // FIX 1: Keep only the React Router catch-all here. Static assets are served earlier.
    // Use `app.use` instead of a wildcard route string to avoid path-to-regexp
    // incompatibilities with certain versions of the matcher library.
    app.use((req, res, next) => {
      // Avoid hijacking API, admin, and known static HTML routes
      if (req.path.startsWith('/api/') || req.path.startsWith('/admin') || staticRouteSet.has(req.path)) {
        return next()
      }

      return res.sendFile(path.join(DIST_PATH, 'index.html'), (error) => {
        if (error) next(error)
      })
    })
  } else {
    app.get('/', (_req, res) => {
      res.json({
        status: 'ready',
        message: 'Booking API is running. Build the client with `npm run build` to serve the UI from Express.',
      })
    })
  }

  app.use(errorHandler)

  return app
}

export { DIST_PATH, PUBLIC_PATH }
