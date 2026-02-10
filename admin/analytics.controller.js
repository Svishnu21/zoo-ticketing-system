import express from 'express'
import { Ticket } from '../backend/models/Ticket.js'
import { ScanLog } from '../backend/models/ScanLog.js'
import { asyncHandler, ApiError } from '../backend/utils/errors.js'

const router = express.Router()

const parseDateOnly = (value) => {
  if (!value) return null
  const parsed = new Date(`${value}T00:00:00.000Z`)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

const buildDateMatch = (query) => {
  const { date, from, to } = query
  if (date) {
    const d = parseDateOnly(date)
    if (!d) throw ApiError.badRequest('Invalid date')
    const start = new Date(d)
    const end = new Date(d)
    end.setUTCDate(end.getUTCDate() + 1)
    return { $gte: start, $lt: end }
  }
  if (from || to) {
    const fromDate = from ? parseDateOnly(from) : null
    const toDate = to ? parseDateOnly(to) : null
    if (from && !fromDate) throw ApiError.badRequest('Invalid from date')
    if (to && !toDate) throw ApiError.badRequest('Invalid to date')
    const start = fromDate || new Date('1970-01-01T00:00:00.000Z')
    const end = toDate ? new Date(toDate.getTime()) : new Date('2999-12-31T00:00:00.000Z')
    end.setUTCDate(end.getUTCDate() + 1)
    return { $gte: start, $lt: end }
  }
  const today = new Date()
  today.setUTCHours(0, 0, 0, 0)
  const end = new Date(today)
  end.setUTCDate(end.getUTCDate() + 1)
  return { $gte: today, $lt: end }
}

const buildVisitOrIssueMatch = (range) => ({
	$or: [{ visitDate: range }, { issueDate: range }],
})

const logMatch = (label, match, query) => {
	console.log(`[admin/analytics] ${label} match`, {
		match,
		query,
	})
}

const logCollectionInfo = async () => {
  try {
    console.log('[admin/analytics] collection info', {
      db: Ticket.db?.name,
      collection: Ticket.collection?.name,
    })
    const totalAll = await Ticket.countDocuments({})
    console.log('[admin/analytics] total tickets (no filters)', totalAll)
  } catch (err) {
    console.warn('[admin/analytics] collection info failed', err?.message)
  }
}

const logIncrementalCounts = async (label, match) => {
  try {
    const totalAll = await Ticket.countDocuments({})
    const totalMatch = await Ticket.countDocuments(match)
    console.log(`[admin/analytics] counts ${label}`, {
      totalAll,
      totalMatch,
    })
  } catch (err) {
    console.warn(`[admin/analytics] counts ${label} failed`, err?.message)
  }
}

router.get(
  '/analytics/summary',
  asyncHandler(async (req, res) => {
    const visitRange = buildDateMatch(req.query)
    const match = buildVisitOrIssueMatch(visitRange)
    logMatch('summary', match, req.query)
    await logCollectionInfo()
    await logIncrementalCounts('summary', match)

    const pipeline = [
      { $match: match },
      {
        $group: {
          _id: null,
          onlineCount: { $sum: { $cond: [{ $eq: ['$ticketSource', 'ONLINE'] }, 1, 0] } },
          counterCount: { $sum: { $cond: [{ $eq: ['$ticketSource', 'COUNTER'] }, 1, 0] } },
          onlineRevenue: { $sum: { $cond: [{ $eq: ['$paymentMode', 'ONLINE'] }, '$totalAmount', 0] } },
          counterRevenue: {
            $sum: {
              $cond: [
                {
                  $or: [
                    { $eq: ['$ticketSource', 'COUNTER'] },
                    { $eq: [{ $ifNull: ['$issuedBy', ''] }, 'COUNTER'] },
                  ],
                },
                '$totalAmount',
                0,
              ],
            },
          },
          totalRevenue: { $sum: '$totalAmount' },
          entered: { $sum: { $cond: ['$qrUsed', 1, 0] } },
        },
      },
    ]

    const [doc] = await Ticket.aggregate(pipeline)

    const totalPending = await Ticket.countDocuments({ visitDate: visitRange, qrUsed: false })

    res.json({
      success: true,
      onlineCount: doc?.onlineCount || 0,
      counterCount: doc?.counterCount || 0,
      onlineRevenue: doc?.onlineRevenue || 0,
      counterRevenue: doc?.counterRevenue || 0,
      totalRevenue: doc?.totalRevenue || 0,
      entered: doc?.entered || 0,
      pending: totalPending,
    })
  }),
)

router.get(
  '/analytics/ticket-types',
  asyncHandler(async (req, res) => {
    const visitRange = buildDateMatch(req.query)
    const match = buildVisitOrIssueMatch(visitRange)
    logMatch('ticket-types', match, req.query)
    await logIncrementalCounts('ticket-types', match)
    const pipeline = [
      { $match: match },
      { $unwind: '$items' },
      {
        $group: {
          _id: '$items.itemCode',
          label: { $last: '$items.itemLabel' },
          quantity: { $sum: '$items.quantity' },
          amount: { $sum: '$items.amount' },
        },
      },
      { $sort: { amount: -1, quantity: -1, _id: 1 } },
    ]
    const rows = await Ticket.aggregate(pipeline)
    res.json({ success: true, rows })
  }),
)

router.get(
  '/analytics/categories',
  asyncHandler(async (req, res) => {
    const visitRange = buildDateMatch(req.query)
    const match = buildVisitOrIssueMatch(visitRange)
    logMatch('categories', match, req.query)
    await logIncrementalCounts('categories', match)
    const pipeline = [
      { $match: match },
      { $unwind: '$items' },
      {
        $group: {
          _id: '$items.category',
          quantity: { $sum: '$items.quantity' },
          amount: { $sum: '$items.amount' },
        },
      },
      { $sort: { amount: -1, quantity: -1, _id: 1 } },
    ]
    const rows = await Ticket.aggregate(pipeline)
    res.json({ success: true, rows })
  }),
)

router.get(
  '/analytics/source-split',
  asyncHandler(async (req, res) => {
    const visitRange = buildDateMatch(req.query)
    const match = buildVisitOrIssueMatch(visitRange)
    logMatch('source-split', match, req.query)
    await logIncrementalCounts('source-split', match)
    const pipeline = [
      { $match: match },
      {
        $project: {
          ticketSource: 1,
          totalAmount: '$totalAmount',
          itemQuantity: { $sum: '$items.quantity' },
        },
      },
      {
        $group: {
          _id: '$ticketSource',
          quantity: { $sum: '$itemQuantity' },
          tickets: { $sum: 1 },
          amount: { $sum: '$totalAmount' },
        },
      },
    ]
    const rows = await Ticket.aggregate(pipeline)
    res.json({ success: true, rows })
  }),
)

router.get(
  '/analytics/entries',
  asyncHandler(async (req, res) => {
    const visitRange = buildDateMatch(req.query)
    const baseMatch = buildVisitOrIssueMatch(visitRange)
    logMatch('entries', baseMatch, req.query)
    await logIncrementalCounts('entries-base', baseMatch)

    const enteredMatch = { ...baseMatch, qrUsed: true }
    const notEnteredMatch = { ...baseMatch, qrUsed: false }

    const [entered, notEntered, manualOverrides] = await Promise.all([
      Ticket.countDocuments(enteredMatch),
      Ticket.countDocuments(notEnteredMatch),
      Ticket.countDocuments({ ...enteredMatch, usedVia: 'MANUAL_TICKET_ID' }),
    ])

    const delayPipeline = [
      { $match: enteredMatch },
      {
        $project: {
          issueDate: 1,
          entryTime: { $ifNull: ['$usedAt', '$qrUsedAt'] },
        },
      },
      { $match: { entryTime: { $type: 'date' } } },
      {
        $project: {
          delayMinutes: { $divide: [{ $subtract: ['$entryTime', '$issueDate'] }, 1000 * 60] },
        },
      },
      {
        $group: {
          _id: null,
          avgDelayMinutes: { $avg: '$delayMinutes' },
        },
      },
    ]

    const delay = await Ticket.aggregate(delayPipeline)

    res.json({
      success: true,
      entered,
      notEntered,
      manualOverrides,
      avgEntryDelayMinutes: delay?.[0]?.avgDelayMinutes ?? null,
    })
  }),
)

router.get(
  '/analytics/scanlogs',
  asyncHandler(async (req, res) => {
    const visitRange = buildDateMatch(req.query)
    const match = { scannedAt: visitRange }
    logMatch('scanlogs', match, req.query)
    const total = await ScanLog.countDocuments(match)
    const invalid = await ScanLog.countDocuments({ ...match, result: { $ne: 'success' } })
    res.json({ success: true, total, invalid })
  }),
)

export default router