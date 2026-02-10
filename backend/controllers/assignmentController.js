import { asyncHandler } from '../utils/errors.js'
import { Counter } from '../models/Counter.js'

const mapAssignment = (doc) => ({ id: doc._id?.toString?.(), name: doc.name, status: doc.status })

export const listCounters = asyncHandler(async (_req, res) => {
  const counters = await Counter.find({ isActive: true, status: 'ACTIVE' }).select('name status').sort({ name: 1 }).lean()
  res.json({ success: true, data: counters.map(mapAssignment) })
})

// Gate support reuses the same Counter master data until a dedicated Gate model exists
export const listGates = asyncHandler(async (_req, res) => {
  const gates = await Counter.find({ isActive: true, status: 'ACTIVE' }).select('name status').sort({ name: 1 }).lean()
  res.json({ success: true, data: gates.map(mapAssignment) })
})
