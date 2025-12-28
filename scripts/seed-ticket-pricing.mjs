#!/usr/bin/env node
import fs from 'fs'
import path from 'path'
import url from 'url'
import mongoose from 'mongoose'
import dotenv from 'dotenv'

import { TicketPricing } from '../backend/models/TicketPricing.js'

dotenv.config()

const __dirname = path.dirname(url.fileURLToPath(import.meta.url))
const jsonPath = process.argv[2] ? path.resolve(process.cwd(), process.argv[2]) : path.join(__dirname, '..', 'seeds', 'ticketPricing.json')

if (!process.env.MONGODB_URI) {
  console.error('Missing MONGODB_URI environment variable. Set it in your .env file.')
  process.exit(1)
}

const run = async () => {
  try {
    const raw = fs.readFileSync(jsonPath, 'utf8')
    const records = JSON.parse(raw)

    if (!Array.isArray(records) || records.length === 0) {
      throw new Error('Seed file must contain an array of pricing records.')
    }

    await mongoose.connect(process.env.MONGODB_URI)

    const bulkOps = records.map((entry) => {
      if (!entry.categoryCode || typeof entry.price !== 'number') {
        throw new Error(`Invalid pricing entry: ${JSON.stringify(entry)}`)
      }
      return {
        updateOne: {
          filter: { categoryCode: entry.categoryCode },
          update: {
            $set: {
              categoryName: entry.categoryName,
              price: entry.price,
              isActive: entry.isActive !== false,
              lastUpdatedAt: new Date(),
            },
          },
          upsert: true,
        },
      }
    })

    const result = await TicketPricing.bulkWrite(bulkOps)
    console.log(`Seed completed. Upserted: ${result.upsertedCount}, Modified: ${result.modifiedCount}`)
  } catch (error) {
    console.error('Failed to seed ticket pricing:', error.message)
    process.exitCode = 1
  } finally {
    await mongoose.connection.close()
  }
}

run()
