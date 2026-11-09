import express from 'express'
import { Ticket } from '../backend/models/Ticket.js'
import { ScanLog } from '../backend/models/ScanLog.js'
import { Booking } from '../backend/models/Booking.js'
import { buildConfirmedTicketFilter, ONLINE_BOOKING_STATUS } from '../backend/services/onlinePaymentService.js'
import { asyncHandler, ApiError } from '../backend/utils/errors.js'

const router = express.Router()

const ANALYTICS_TICKET_LABEL_ALIASES = {
  'parking - 2 & 3 wheeler': 'Parking - 2 Wheeler',
}

const resolveAnalyticsTicketLabel = ({ itemCode, label }) => {
  const code = (itemCode || '').toString().trim().toLowerCase()
  if (code === 'parking_2w_3w') return 'Parking - 2 Wheeler'
  const normalizedLabel = (label || '').toString().trim().toLowerCase()
  return ANALYTICS_TICKET_LABEL_ALIASES[normalizedLabel] || label || ''
}

const parseDateOnly = (value) => {
  if (!value) return null
  const parsed = new Date(`${value}T00:00:00.000Z`)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

const startOfUtcDay = (date) => new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()))

const addUtcDays = (date, days) => {
  const next = new Date(date.getTime())
  next.setUTCDate(next.getUTCDate() + days)
  return next
}

const buildRangePreset = (range) => {
  if (!range) return null
  const normalized = range.toString().toLowerCase()
  const now = new Date()
  const todayStart = startOfUtcDay(now)

  if (normalized === 'today') {
    return { $gte: todayStart, $lt: addUtcDays(todayStart, 1) }
  }

  if (normalized === 'yesterday') {
    const start = addUtcDays(todayStart, -1)
    return { $gte: start, $lt: addUtcDays(start, 1) }
  }

  if (normalized === 'last7') {
    const start = addUtcDays(todayStart, -6)
    return { $gte: start, $lt: addUtcDays(todayStart, 1) }
  }

  if (normalized === 'month') {
    const start = new Date(Date.UTC(todayStart.getUTCFullYear(), todayStart.getUTCMonth(), 1))
    const end = new Date(start)
    end.setUTCMonth(end.getUTCMonth() + 1)
    return { $gte: start, $lt: end }
  }

  return null
}

const buildDateMatch = (query) => {
  const { date, from, to, range } = query
  const presetRange = buildRangePreset(range)
  if (presetRange) return presetRange

  // Single date (preferred for overview): use full-day UTC range
  if (date) {
    const d = parseDateOnly(date)
    if (!d) throw ApiError.badRequest('Invalid date')
    const start = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()))
    const end = new Date(start)
    end.setUTCDate(end.getUTCDate() + 1)
    return { $gte: start, $lt: end }
  }

  // From/To range (optional advanced filters)
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

  // No date provided: return undefined to indicate lifetime aggregation (no implicit today filter)
  return undefined
}

const buildVisitOrIssueMatch = (range) => {
	if (!range) return {}
	return { $or: [{ visitDate: range }, { issueDate: range }] }
}

// All ticket metrics use confirmed tickets only: counter tickets as before, and online tickets
// whose payment was verified. Unpaid / failed online attempts contribute zero.
const buildMetricsMatch = async (range) => ({
	...buildVisitOrIssueMatch(range),
	...(await buildConfirmedTicketFilter()),
})

// Online payment attempts that are NOT confirmed bookings — reported separately, never in revenue.
const getOnlineAttemptSummary = async (range) => {
	const match = {
		ticketSource: 'ONLINE',
		status: {
			$in: [
				ONLINE_BOOKING_STATUS.PENDING,
				ONLINE_BOOKING_STATUS.INITIATION_FAILED,
				ONLINE_BOOKING_STATUS.FAILED,
				ONLINE_BOOKING_STATUS.RECOVERY_REQUIRED,
			],
		},
		...(range ? { $or: [{ visitDate: range }, { createdAt: range }] } : {}),
	}
	const rows = await Booking.aggregate([
		{ $match: match },
		{ $group: { _id: '$status', count: { $sum: 1 }, amount: { $sum: '$totalAmount' } } },
	])
	const summary = {
		pending: { count: 0, amount: 0 },
		initiationFailed: { count: 0, amount: 0 },
		failed: { count: 0, amount: 0 },
		recoveryRequired: { count: 0, amount: 0 },
	}
	const keyByStatus = {
		[ONLINE_BOOKING_STATUS.PENDING]: 'pending',
		[ONLINE_BOOKING_STATUS.INITIATION_FAILED]: 'initiationFailed',
		[ONLINE_BOOKING_STATUS.FAILED]: 'failed',
		[ONLINE_BOOKING_STATUS.RECOVERY_REQUIRED]: 'recoveryRequired',
	}
	rows.forEach((row) => {
		const key = keyByStatus[row._id]
		if (key) summary[key] = { count: row.count, amount: row.amount }
	})
	return summary
}

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

const getSummaryData = async (visitRange, match, confirmedFilter = {}) => {
  const pipeline = []
  if (Object.keys(match).length) {
    pipeline.push({ $match: match })
  }

  pipeline.push({
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
  })

  const [doc] = await Ticket.aggregate(pipeline)
  const pendingFilter = visitRange
    ? { visitDate: visitRange, qrUsed: false, ...confirmedFilter }
    : { qrUsed: false, ...confirmedFilter }
  const pending = await Ticket.countDocuments(pendingFilter)

  return {
    onlineCount: doc?.onlineCount || 0,
    counterCount: doc?.counterCount || 0,
    onlineRevenue: doc?.onlineRevenue || 0,
    counterRevenue: doc?.counterRevenue || 0,
    totalRevenue: doc?.totalRevenue || 0,
    entered: doc?.entered || 0,
    pending,
  }
}

const getTicketTypeRows = async (match) => {
  const pipeline = []
  if (Object.keys(match).length) pipeline.push({ $match: match })
  pipeline.push(
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
  )
  const rows = await Ticket.aggregate(pipeline)
  return (Array.isArray(rows) ? rows : []).map((row) => ({
    ...row,
    label: resolveAnalyticsTicketLabel({ itemCode: row?._id, label: row?.label }),
  }))
}

const getCategoryRows = async (match) => {
  const pipeline = []
  if (Object.keys(match).length) pipeline.push({ $match: match })
  pipeline.push(
    { $unwind: '$items' },
    {
      $group: {
        _id: '$items.category',
        quantity: { $sum: '$items.quantity' },
        amount: { $sum: '$items.amount' },
      },
    },
    { $sort: { amount: -1, quantity: -1, _id: 1 } },
  )
  return Ticket.aggregate(pipeline)
}

const getSourceSplitRows = async (match) => {
  const pipeline = []
  if (Object.keys(match).length) pipeline.push({ $match: match })
  pipeline.push(
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
  )
  return Ticket.aggregate(pipeline)
}

const getEntriesData = async (baseMatch) => {
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

  return {
    entered,
    notEntered,
    manualOverrides,
    avgEntryDelayMinutes: delay?.[0]?.avgDelayMinutes ?? null,
  }
}

const getScanlogData = async (visitRange) => {
  const match = visitRange ? { scannedAt: visitRange } : {}
  const [total, invalid] = await Promise.all([
    ScanLog.countDocuments(match),
    ScanLog.countDocuments({ ...match, result: { $ne: 'success' } }),
  ])

  return { total, invalid }
}

router.get(
  '/dashboard',
  asyncHandler(async (req, res) => {
    const visitRange = buildDateMatch(req.query)
    const confirmedFilter = await buildConfirmedTicketFilter()
    const match = { ...buildVisitOrIssueMatch(visitRange), ...confirmedFilter }
    logMatch('dashboard', match, req.query)
    await logIncrementalCounts('dashboard', match)

    const [summary, ticketTypes, categories, sourceSplit, entries, scanlogs, onlinePaymentAttempts] = await Promise.all([
      getSummaryData(visitRange, match, confirmedFilter),
      getTicketTypeRows(match),
      getCategoryRows(match),
      getSourceSplitRows(match),
      getEntriesData(match),
      getScanlogData(visitRange),
      getOnlineAttemptSummary(visitRange),
    ])

    res.json({
      success: true,
      summary,
      onlinePaymentAttempts,
      ticketTypes,
      categories,
      sourceSplit,
      entries,
      scanlogs,
    })
  }),
)

router.get(
  '/analytics/summary',
  asyncHandler(async (req, res) => {
    const visitRange = buildDateMatch(req.query)
    const confirmedFilter = await buildConfirmedTicketFilter()
    const match = { ...buildVisitOrIssueMatch(visitRange), ...confirmedFilter }
    logMatch('summary', match, req.query)
    await logCollectionInfo()
    await logIncrementalCounts('summary', match)
    const [summary, onlinePaymentAttempts] = await Promise.all([
      getSummaryData(visitRange, match, confirmedFilter),
      getOnlineAttemptSummary(visitRange),
    ])

    res.json({ success: true, ...summary, onlinePaymentAttempts })
  }),
)

router.get(
  '/analytics/ticket-types',
  asyncHandler(async (req, res) => {
    const visitRange = buildDateMatch(req.query)
    const match = await buildMetricsMatch(visitRange)
    logMatch('ticket-types', match, req.query)
    await logIncrementalCounts('ticket-types', match)
    const rows = await getTicketTypeRows(match)
    res.json({ success: true, rows })
  }),
)

router.get(
  '/analytics/categories',
  asyncHandler(async (req, res) => {
    const visitRange = buildDateMatch(req.query)
    const match = await buildMetricsMatch(visitRange)
    logMatch('categories', match, req.query)
    await logIncrementalCounts('categories', match)
    const rows = await getCategoryRows(match)
    res.json({ success: true, rows })
  }),
)

router.get(
  '/analytics/source-split',
  asyncHandler(async (req, res) => {
    const visitRange = buildDateMatch(req.query)
    const match = await buildMetricsMatch(visitRange)
    logMatch('source-split', match, req.query)
    await logIncrementalCounts('source-split', match)
    const rows = await getSourceSplitRows(match)
    res.json({ success: true, rows })
  }),
)

router.get(
  '/analytics/entries',
  asyncHandler(async (req, res) => {
    const visitRange = buildDateMatch(req.query)
    const baseMatch = await buildMetricsMatch(visitRange)
    logMatch('entries', baseMatch, req.query)
    await logIncrementalCounts('entries-base', baseMatch)
    const entries = await getEntriesData(baseMatch)
    res.json({ success: true, ...entries })
  }),
)

router.get(
  '/analytics/scanlogs',
  asyncHandler(async (req, res) => {
    const visitRange = buildDateMatch(req.query)
    const match = visitRange ? { scannedAt: visitRange } : {}
    logMatch('scanlogs', match, req.query)
    const scanlogs = await getScanlogData(visitRange)
    const { total, invalid } = scanlogs
    res.json({ success: true, total, invalid })
  }),
)

export default router