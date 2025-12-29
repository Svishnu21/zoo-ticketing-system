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
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/kurumbapatti-zoo'

if (!process.env.MONGODB_URI) {
  console.warn('⚠️ MONGODB_URI not set in .env — falling back to mongodb://localhost:27017/kurumbapatti-zoo')
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
      console.log(`🔄 Ensured default pricing: upserted=${upsertResult.upserted} matched=${upsertResult.matched}`)
    } catch (err) {
      console.error('Failed to ensure default pricing (will continue):', err?.message ?? err)
    }

    const app = createApp()

    app.listen(PORT, () => {
      console.log(`🚀 Booking server ready at http://localhost:${PORT}`)
    })
  } catch (error) {
    console.error('❌ Could not start the booking server', error)
    process.exit(1)
  }
}

startServer()
