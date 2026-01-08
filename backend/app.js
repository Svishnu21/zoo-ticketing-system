import express from 'express'
import cors from 'cors'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

import bookingRoutes from './routes/bookingRoutes.js'
import scannerRoutes from './routes/scannerRoutes.js'
import counterRoutes from './routes/counterRoutes.js'
import adminRoutes from '../admin/admin.routes.js'
import { ApiError, errorHandler } from './utils/errors.js'

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

export const createApp = () => {
  const app = express()

  app.set('trust proxy', 1)
  app.use(cors({ origin: true, credentials: true }))
  app.use(express.json({ limit: '1mb' }))

  if (fs.existsSync(PUBLIC_PATH)) {
    app.use(express.static(PUBLIC_PATH))
  }

  // Also serve frontend/public (unbuilt static assets) when present so
  // requests like `/js/counter.js` resolve during development.
  if (fs.existsSync(FRONTEND_PUBLIC)) {
    app.use(express.static(FRONTEND_PUBLIC))
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
  const ADMIN_PATH = path.join(PUBLIC_PATH, 'admin')
  if (fs.existsSync(ADMIN_PATH)) {
    app.use('/admin', express.static(ADMIN_PATH))
  }

  app.get('/api/health', (_req, res) => res.json({ status: 'ok' }))

  app.use('/api/tickets', bookingRoutes)
  app.use('/api/bookings', bookingRoutes)
  app.use('/api/counter', counterRoutes)
  app.use('/api/scanner', scannerRoutes)
  app.use('/admin', adminRoutes)

  // Avoid using wildcard tokens in route strings (some path-to-regexp versions
  // treat `*` as a malformed parameter). Instead, handle unmatched `/api/`
  // requests via middleware that inspects the request path.
  app.use((req, _res, next) => {
    if (req.path.startsWith('/api/')) return next(ApiError.notFound('API route not found.'))
    return next()
  })

  if (fs.existsSync(DIST_PATH)) {
    app.use(express.static(DIST_PATH))

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
