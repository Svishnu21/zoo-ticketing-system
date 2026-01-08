import express from 'express'
import { ScanLog } from '../backend/models/ScanLog.js'
import { asyncHandler } from '../backend/utils/errors.js'

const router = express.Router()

const parseDateOnly = (value) => {
  if (!value || typeof value !== 'string') return null
  const parsed = new Date(`${value}T00:00:00.000Z`)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

router.get(
  '/scanner-logs',
  asyncHandler(async (req, res) => {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1)
    const limit = Math.min(500, Math.max(1, parseInt(req.query.limit, 10) || 100))
    const skip = (page - 1) * limit

    const match = {}

    const normalizedDate = parseDateOnly(req.query.date)
    if (normalizedDate) {
      const nextDay = new Date(normalizedDate)
      nextDay.setDate(nextDay.getDate() + 1)
      match.scannedAt = { $gte: normalizedDate, $lt: nextDay }
    }

    const bookingId = typeof req.query.bookingId === 'string' ? req.query.bookingId.trim().toUpperCase() : ''
    if (bookingId) {
      match.ticketId = bookingId
    }

    const query = ScanLog.find(match)
      .sort({ scannedAt: -1 })
      .skip(skip)
      .limit(limit)
      .select('ticketId scannedAt gateId result method')

    const [logs, total] = await Promise.all([query.lean(), ScanLog.countDocuments(match)])

    res.json({
      data: logs.map((log) => ({
        bookingId: log.ticketId,
        scannedAt: log.scannedAt,
        gateId: log.gateId,
        result: log.result,
        method: log.method,
      })),
      pagination: {
        page,
        limit,
        total,
        hasNext: skip + logs.length < total,
      },
    })
  }),
)

export default router
