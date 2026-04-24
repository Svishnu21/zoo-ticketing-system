import dotenv from 'dotenv'
import mongoose from 'mongoose'
import path from 'path'
import { fileURLToPath } from 'url'

import { createApp } from './app.js'
import { seedTicketPricingIfEmpty, ensureDefaultTicketPricing } from './services/pricingSeedService.js'

// Ensure .env is loaded from project root even when server starts from /backend
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
dotenv.config({ path: path.resolve(__dirname, '..', '.env') })

const PORT = Number(process.env.PORT) || 5000

const MONGODB_URI = process.env.MONGODB_URI

const REQUIRED_ENV_VARS = [
  'MONGODB_URI',
  'JWT_SECRET',
  'ALLOWED_ORIGINS',
  'NODE_ENV',
  'JWT_EXPIRES_IN',
  'BCRYPT_SALT_ROUNDS',
]

const missing = REQUIRED_ENV_VARS.filter((key) => !process.env[key])
if (missing.length > 0) {
  console.error('Missing required environment variables:', missing)
  process.exit(1)
}

if (!['development', 'test', 'production'].includes(process.env.NODE_ENV)) {
  console.error('NODE_ENV must be one of development, test, production.')
  process.exit(1)
}

if (!MONGODB_URI) {
  console.error('MONGODB_URI is required. Configure it in environment variables.')
  process.exit(1)
}

if (!process.env.JWT_SECRET) {
  console.warn('⚠️ JWT_SECRET not set — authentication endpoints will fail until it is configured.')
}

if ((process.env.JWT_SECRET || '').length > 0 && (process.env.JWT_SECRET || '').length < 32) {
  console.warn('⚠️ JWT_SECRET should be at least 32 characters for production security.')
}

if (!process.env.ADMIN_USERNAME || !process.env.ADMIN_PASSWORD_HASH) {
  console.warn('⚠️ ADMIN_USERNAME/ADMIN_PASSWORD_HASH not set — env-based admin login will be unavailable.')
}

if (process.env.ADMIN_PASSWORD) {
  console.warn('⚠️ ADMIN_PASSWORD is plaintext. Prefer ADMIN_PASSWORD_HASH for secure admin authentication.')
}

const startServer = async () => {
  try {
    await mongoose.connect(MONGODB_URI, {
      serverSelectionTimeoutMS: 5000,
    })

    console.log(`✅ Connected to MongoDB at ${MONGODB_URI}`)

    try {
      const seedResult = await seedTicketPricingIfEmpty()
      if (seedResult?.seeded) {
        console.log(`🌱 Seeded ${seedResult.insertedCount ?? 0} ticket pricing records.`)
      }
    } catch (err) {
      console.warn('Seed-once step failed (non-fatal):', err?.message ?? err)
    }

    try {
      const upsertResult = await ensureDefaultTicketPricing()
      console.log(
        `🔄 Ensured default pricing: upserted=${upsertResult.upserted} matched=${upsertResult.matched}`
      )
    } catch (err) {
      console.error('Failed to ensure default pricing (will continue):', err?.message ?? err)
    }

    const app = createApp()

    const server = app.listen(PORT, () => {
      console.log(`🚀 Booking server ready at http://localhost:${PORT}`)
    })

    server.setTimeout(30000)
  } catch (error) {
    console.error('❌ Could not start the booking server', error)
    process.exit(1)
  }
}

startServer()