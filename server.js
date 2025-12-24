import express from 'express'
import mongoose from 'mongoose'
import cors from 'cors'
import dotenv from 'dotenv'
import path from 'path'
import fs from 'fs'
import net from 'net'
import { fileURLToPath } from 'url'

dotenv.config()

const app = express()
const PORT = Number(process.env.PORT) || 3000
const MONGODB_URI = process.env.MONGODB_URI

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const PUBLIC_PATH = path.join(__dirname, 'public')
const FRONTEND_DIST = path.join(__dirname, 'frontend', 'dist')
const DIST_PATH = fs.existsSync(FRONTEND_DIST) ? FRONTEND_DIST : path.join(__dirname, 'dist')

if (!MONGODB_URI) {
  console.error('❌ Missing MONGODB_URI environment variable. Please set it in your .env file.')
  process.exit(1)
}

app.set('trust proxy', 1)
app.use(cors({ origin: true, credentials: true }))
app.use(express.json({ limit: '1mb' }))

// Serve public assets (e.g. success pages, static HTML) directly
if (fs.existsSync(PUBLIC_PATH)) {
  app.use(express.static(PUBLIC_PATH))
}

// Friendly routes for static HTML in /public
const staticHtmlRoutes = [
  { route: '/payment', file: 'payment.html' },
  { route: '/success', file: 'success.html' },
  { route: '/review-adoption', file: 'review-adoption.html' },
  { route: '/adoption-success', file: 'adoption-success.html' },
  { route: '/csr-activity', file: 'csr-activity.html' },
]

const staticRouteSet = new Set(staticHtmlRoutes.map((item) => item.route))

staticHtmlRoutes.forEach(({ route, file }) => {
  app.get(route, (_req, res, next) => {
    if (!fs.existsSync(PUBLIC_PATH)) return next()
    return res.sendFile(path.join(PUBLIC_PATH, file), (error) => {
      if (error) next(error)
    })
  })

  // Also serve with trailing slash paths like /payment/thank-you -> still show static file
  app.get(`${route}/*`, (_req, res, next) => {
    if (!fs.existsSync(PUBLIC_PATH)) return next()
    return res.sendFile(path.join(PUBLIC_PATH, file), (error) => {
      if (error) next(error)
    })
  })
})

// Serve admin static files from /admin
const ADMIN_PATH = path.join(PUBLIC_PATH, 'admin')
if (fs.existsSync(ADMIN_PATH)) {
  app.use('/admin', express.static(ADMIN_PATH))
}

const bookingItemSchema = new mongoose.Schema(
  {
    label: { type: String, required: true },
    quantity: { type: Number, required: true, min: 0 },
    price: { type: Number, required: true, min: 0 },
    total: { type: Number, required: true, min: 0 },
  },
  { _id: false },
)

const bookingSchema = new mongoose.Schema(
  {
    bookingDate: { type: String, required: true },
    ticketType: { type: String, required: true },
    items: { type: [bookingItemSchema], default: [] },
    totalAmount: { type: Number, required: true, min: 0 },
    visitorName: { type: String, required: true, trim: true },
    visitorEmail: { type: String, trim: true },
    visitorMobile: { type: String, required: true, trim: true },
    submittedOtp: { type: String, trim: true },
  },
  { timestamps: true },
)

const Booking = mongoose.model('Booking', bookingSchema)

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' })
})

app.get('/.well-known/appspecific/com.chrome.devtools.json', (_req, res) => {
  res.status(204).end()
})

app.post('/api/bookings', async (req, res) => {
  try {
    const {
      bookingDate,
      ticketType,
      items = [],
      totalAmount,
      visitorName,
      visitorEmail,
      visitorMobile,
      submittedOtp,
    } = req.body ?? {}

    if (!bookingDate || !ticketType || !visitorName || !visitorMobile || typeof totalAmount !== 'number') {
      return res.status(400).json({ message: 'Missing required booking fields.' })
    }

    const normalisedItems = Array.isArray(items)
      ? items.map((item) => ({
          label: item.label ?? '',
          quantity: Number(item.quantity) || 0,
          price: Number(item.price) || 0,
          total: Number(item.total) || (Number(item.price) || 0) * (Number(item.quantity) || 0),
        }))
      : []

    const booking = await Booking.create({
      bookingDate,
      ticketType,
      items: normalisedItems,
      totalAmount,
      visitorName,
      visitorEmail,
      visitorMobile,
      submittedOtp,
    })

    return res.status(201).json({
      message: 'Booking saved successfully.',
      bookingId: booking._id,
    })
  } catch (error) {
    console.error('Failed to save booking', error)
    return res.status(500).json({ message: 'Failed to save booking.' })
  }
})

if (fs.existsSync(DIST_PATH)) {
  app.use(express.static(DIST_PATH))

  app.get('*', (req, res, next) => {
    // Let API, admin, and known static HTML routes pass through to their handlers
    if (req.path.startsWith('/api/') || req.path.startsWith('/admin') || staticRouteSet.has(req.path)) {
      return next()
    }

    return res.sendFile(path.join(DIST_PATH, 'index.html'), (error) => {
      if (error) {
        next(error)
      }
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

const getAvailablePort = (startPort, retries = 5) =>
  new Promise((resolve, reject) => {
    const tryPort = (port, attemptsLeft) => {
      const tester = net
        .createServer()
        .once('error', (error) => {
          if (error.code === 'EADDRINUSE' && attemptsLeft > 0) {
            tester.close()
            tryPort(port + 1, attemptsLeft - 1)
          } else {
            reject(error)
          }
        })
        .once('listening', () => {
          tester.close(() => resolve(port))
        })
        .listen(port)
    }

    tryPort(startPort, retries)
  })

const startServer = async () => {
  try {
    await mongoose.connect(MONGODB_URI, {
      serverSelectionTimeoutMS: 5000,
    })
    console.log('✅ Connected to MongoDB')

    const resolvedPort = await getAvailablePort(PORT)

    app.listen(resolvedPort, () => {
      console.log(`🚀 Booking server ready at http://localhost:${resolvedPort}`)
    })
  } catch (error) {
    console.error('❌ Could not connect to MongoDB', error)
    process.exit(1)
  }
}

startServer()
