import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import dotenv from 'dotenv'
import mongoose from 'mongoose'

import { TicketPricing } from '../backend/models/TicketPricing.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Load environment variables from project root so the script can run from any working directory
dotenv.config({ path: path.resolve(__dirname, '..', '.env') })

const MONGODB_URI = process.env.MONGODB_URI

if (!MONGODB_URI) {
  console.error('❌ Missing MONGODB_URI in environment. Create a .env file at project root with MONGODB_URI set.')
  process.exit(1)
}

const seedPath = path.join(__dirname, '..', 'seeds', 'ticketPricing.json')

const readSeedData = () => {
  if (!fs.existsSync(seedPath)) {
    throw new Error(`Seed file not found at ${seedPath}`)
  }
  const raw = fs.readFileSync(seedPath, 'utf8')
  const parsed = JSON.parse(raw)
  if (!Array.isArray(parsed) || parsed.length === 0) {
    throw new Error('Seed file must contain a non-empty array of pricing entries.')
  }
  return parsed.map((entry) => ({
    categoryCode: entry.categoryCode,
    categoryName: entry.categoryName,
    price: Number(entry.price),
    isActive: entry.isActive ?? true,
  }))
}

const run = async () => {
  try {
    console.log('ℹ️  Connecting to MongoDB...')
    await mongoose.connect(MONGODB_URI, { serverSelectionTimeoutMS: 5000 })
    console.log('✅ Connected to MongoDB')

    const seedData = readSeedData()

    const operations = seedData.map((doc) => ({
      updateOne: {
        filter: { categoryCode: doc.categoryCode },
        update: { $set: doc },
        upsert: true,
      },
    }))

    const result = await TicketPricing.bulkWrite(operations, { ordered: false })
    console.log('✅ Pricing seed completed:', {
      upserted: result.upsertedCount,
      modified: result.modifiedCount,
      matched: result.matchedCount,
    })
  } catch (error) {
    console.error('❌ Pricing seed failed:', error.message)
    process.exitCode = 1
  } finally {
    await mongoose.disconnect()
    process.exit()
  }
}

run()
