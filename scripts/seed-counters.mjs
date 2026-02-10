import 'dotenv/config'
import mongoose from 'mongoose'
import { Counter } from '../backend/models/Counter.js'

const seedCounters = [
  { _id: new mongoose.Types.ObjectId('65b000000000000000000c01'), name: 'Counter 1', location: 'Front desk', status: 'ACTIVE', isActive: true, source: 'ADMIN' },
  { _id: new mongoose.Types.ObjectId('65b000000000000000000c02'), name: 'Counter 2', location: 'West wing', status: 'ACTIVE', isActive: true, source: 'ADMIN' },
  { _id: new mongoose.Types.ObjectId('65b000000000000000000c03'), name: 'Counter 3', location: 'East wing', status: 'ACTIVE', isActive: true, source: 'ADMIN' },
  { _id: new mongoose.Types.ObjectId('65b000000000000000000a01'), name: 'Scanner 1', location: 'Gate A', status: 'ACTIVE', isActive: true, source: 'ADMIN' },
  { _id: new mongoose.Types.ObjectId('65b000000000000000000a02'), name: 'Scanner 2', location: 'Gate B', status: 'ACTIVE', isActive: true, source: 'ADMIN' },
  { _id: new mongoose.Types.ObjectId('65b000000000000000000a03'), name: 'Scanner 3', location: 'Gate C', status: 'ACTIVE', isActive: true, source: 'ADMIN' },
]

const run = async () => {
  const uri = process.env.MONGODB_URI
  if (!uri) {
    throw new Error('MONGODB_URI is not set')
  }

  await mongoose.connect(uri)

  let upserts = 0
  for (const counter of seedCounters) {
    const { _id, ...rest } = counter
    const res = await Counter.updateOne(
      { _id },
      { $set: rest, $setOnInsert: { _id } },
      { upsert: true },
    )
    if (res.upsertedCount > 0) upserts += 1
  }

  const total = await Counter.countDocuments({})
  console.log(`Seeded counters. Upserted: ${upserts}, total counters: ${total}`)
}

run()
  .catch((err) => {
    console.error(err)
    process.exitCode = 1
  })
  .finally(async () => {
    await mongoose.disconnect()
  })
