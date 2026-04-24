import express from 'express'
import { Ticket } from '../backend/models/Ticket.js'
import { Payment } from '../backend/models/Payment.js'
import { getTicketForDisplay } from '../backend/services/bookingService.js'
import { ApiError, asyncHandler } from '../backend/utils/errors.js'

const router = express.Router()
const BOOKINGS_PAGE_SIZE = 15

const normaliseVisitDate = (value) => {
  if (!value) return undefined
  // Accept YYYY-MM-DD; parse as UTC midnight
  const parsed = new Date(`${value}T00:00:00.000Z`)
  return Number.isNaN(parsed.getTime()) ? undefined : parsed
}

const buildVisitDateRange = (visitDate) => {
  if (!visitDate) return undefined
  const start = new Date(Date.UTC(visitDate.getUTCFullYear(), visitDate.getUTCMonth(), visitDate.getUTCDate()))
  const end = new Date(start)
  end.setUTCDate(end.getUTCDate() + 1)
  return { $gte: start, $lt: end }
}

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

const computeEntryStatus = (ticket) => {
  if (ticket?.qrUsed) {
    return ticket?.usedVia === 'MANUAL_TICKET_ID' ? 'Entered (Manual)' : 'Entered'
  }
  return 'Not Entered'
}

const normaliseEntryFilter = (value) => {
  if (!value || value === 'all') return undefined
  const normalized = value.toString().toLowerCase()
  if (normalized === 'entered') return 'entered'
  if (normalized === 'entered_manual' || normalized === 'entered (manual)') return 'entered_manual'
  if (normalized === 'not_entered' || normalized === 'not entered') return 'not_entered'
  return undefined
}

const computePaymentStatus = (ticket, payment) => {
  if (payment?.status) return payment.status.toString().toUpperCase()
  if (ticket?.paymentStatus) return ticket.paymentStatus.toString().toUpperCase()
  return 'UNKNOWN'
}

const presentBookingRow = (ticket, payment) => {
  const entryStatus = computeEntryStatus(ticket)
  const paymentStatus = computePaymentStatus(ticket, payment)
  const ticketCount = Array.isArray(ticket.items)
    ? ticket.items.reduce((sum, item) => sum + Number(item.quantity || 0), 0)
    : undefined
  const bookedAt = ticket.createdAt || ticket.issueDate

  return {
    ticketId: ticket.ticketId,
    visitDate: ticket.visitDate instanceof Date ? ticket.visitDate.toISOString().slice(0, 10) : ticket.visitDate,
    issueDate: ticket.issueDate instanceof Date ? ticket.issueDate.toISOString() : ticket.issueDate,
    bookedAt: bookedAt instanceof Date ? bookedAt.toISOString() : bookedAt,
    visitorName: ticket.visitorName,
    visitorMobile: ticket.visitorMobile,
    ticketSource: ticket.ticketSource,
    paymentMode: payment?.mode?.toUpperCase() || ticket.paymentMode,
    paymentStatus,
    paymentProvider: payment?.provider,
    paymentReference: payment?.providerPaymentId,
    paymentAmount: payment?.amount ?? ticket.totalAmount,
    totalAmount: ticket.totalAmount,
    ticketCount,
    entryStatus,
    entryTimestamp: ticket.usedAt || ticket.qrUsedAt,
  }
}

router.get(
  '/bookings',
  asyncHandler(async (req, res) => {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1)
    const limit = BOOKINGS_PAGE_SIZE
    const skip = (page - 1) * limit

    // Online bookings view: include only true online records and hide known counter placeholders.
    const match = {
      $and: [
        { ticketSource: 'ONLINE' },
        { source: { $ne: 'COUNTER' } },
        { visitorName: { $not: /^counter$/i } },
        { visitorMobile: { $ne: '0000000000' } },
      ],
    }
    const source = typeof req.query.ticketSource === 'string' ? req.query.ticketSource.toUpperCase() : 'ALL'
    if (source === 'COUNTER') {
      // Keep backward compatibility for callers that intentionally request counter records.
      match.$and = [{ ticketSource: 'COUNTER' }]
    } else if (source === 'ONLINE') {
      match.$and = [
        { ticketSource: 'ONLINE' },
        { source: { $ne: 'COUNTER' } },
        { visitorName: { $not: /^counter$/i } },
        { visitorMobile: { $ne: '0000000000' } },
      ]
    }

    const visitDate = normaliseVisitDate(req.query.visitDate)
    if (visitDate) {
      const range = buildVisitDateRange(visitDate)
      match.visitDate = range
    }

    const entryFilter = normaliseEntryFilter(req.query.entryStatus)
    if (entryFilter === 'entered') {
      match.qrUsed = true
      match.usedVia = { $ne: 'MANUAL_TICKET_ID' }
    } else if (entryFilter === 'entered_manual') {
      match.qrUsed = true
      match.usedVia = 'MANUAL_TICKET_ID'
    } else if (entryFilter === 'not_entered') {
      match.qrUsed = false
    }

    const search = typeof req.query.search === 'string' ? req.query.search.trim() : ''
    if (search) {
      const regex = new RegExp(escapeRegex(search), 'i')
      match.$or = [{ ticketId: regex }, { visitorMobile: regex }]
    }

    // Debug: log the exact admin read query to verify filters and source alignment.
    console.log('[admin/bookings] query', {
      match,
      page,
      limit,
      skip,
      sourceFilter: source,
      visitDate: req.query.visitDate,
      paymentStatus: req.query.paymentStatus,
      entryStatus: req.query.entryStatus,
      search,
    })

    const query = Ticket.find(match)
      .sort({ createdAt: -1, issueDate: -1 })
      .skip(skip)
      .limit(limit)
      .select('ticketId bookingRef visitDate issueDate createdAt totalAmount paymentMode paymentStatus ticketSource paymentBreakup qrUsed qrUsedAt usedVia usedAt visitorName visitorMobile items')

    const [tickets, total] = await Promise.all([query.lean(), Ticket.countDocuments(match)])

    // Debug: surface a few IDs and timestamps to compare with DB inserts.
    if (tickets.length) {
      console.log('[admin/bookings] result', {
        returned: tickets.length,
        total,
        firstTicketId: tickets[0]?.ticketId,
        firstIssueDate: tickets[0]?.issueDate,
        lastTicketId: tickets[tickets.length - 1]?.ticketId,
        lastIssueDate: tickets[tickets.length - 1]?.issueDate,
      })
    } else {
      console.log('[admin/bookings] result', { returned: 0, total })
    }

    const paymentMap = {}
    if (tickets.length) {
      const ticketIds = tickets.map((t) => t._id)
      const bookingIds = tickets.filter((t) => t.bookingRef).map((t) => t.bookingRef)

      const payments = await Payment.find({
        $or: [{ ticketId: { $in: ticketIds } }, { bookingId: { $in: bookingIds } }],
      })
        .select('ticketId bookingId status provider providerPaymentId mode amount')
        .lean()

      payments.forEach((payment) => {
        if (payment.ticketId) paymentMap[payment.ticketId.toString()] = payment
        if (payment.bookingId) paymentMap[payment.bookingId.toString()] = payment
      })
    }

    const rows = tickets.map((ticket) => {
      const payment = paymentMap[ticket._id.toString()] || (ticket.bookingRef ? paymentMap[ticket.bookingRef.toString()] : null)
      return presentBookingRow(ticket, payment)
    })

    res.json({
      data: rows,
      pagination: {
        page,
        limit,
        total,
        hasNext: skip + rows.length < total,
      },
    })
  }),
)

router.get(
  '/bookings/:ticketId',
  asyncHandler(async (req, res) => {
    const ticketId = req.params.ticketId?.trim()
    if (!ticketId) {
      throw ApiError.badRequest('Ticket ID is required.')
    }

    const ticketDoc = await Ticket.findOne({ ticketId })
      .select('ticketId visitDate issueDate createdAt totalAmount paymentMode paymentStatus ticketSource paymentBreakup qrUsed qrUsedAt usedVia usedAt visitorName visitorMobile items')
      .lean()

    if (!ticketDoc) {
      throw ApiError.notFound('Booking not found.')
    }

    // Admin-authenticated details view: bypass public verification-token requirement.
    const display = await getTicketForDisplay(ticketId, { allowTokenBypass: true })

    const payment = await Payment.findOne({ ticketId: ticketDoc._id })
      .select('status provider providerPaymentId mode amount metadata completedAt')
      .lean()

    res.json({
      ...display,
      visitorName: ticketDoc.visitorName,
      visitorMobile: ticketDoc.visitorMobile,
      bookedAt: ticketDoc.createdAt || ticketDoc.issueDate,
      entryStatus: computeEntryStatus(ticketDoc),
      entryTimestamp: ticketDoc.usedAt || ticketDoc.qrUsedAt,
      paymentProvider: payment?.provider,
      paymentReference: payment?.providerPaymentId,
      paymentMode: payment?.mode?.toUpperCase() || display.paymentMode,
      paymentStatus: computePaymentStatus(ticketDoc, payment),
      paymentAmount: payment?.amount ?? display.totalAmount,
      paymentCompletedAt: payment?.completedAt,
      paymentMetadata: payment?.metadata,
    })
  }),
)

router.post(
  '/bookings/:ticketId/resend',
  asyncHandler(async (req, res) => {
    const ticketId = req.params.ticketId?.trim()
    if (!ticketId) {
      throw ApiError.badRequest('Ticket ID is required.')
    }

    const ticket = await Ticket.findOne({ ticketId }).select('ticketId paymentStatus visitorEmail visitorMobile visitorName').lean()
    if (!ticket) {
      throw ApiError.notFound('Booking not found.')
    }

    if (ticket.paymentStatus && ticket.paymentStatus.toUpperCase() !== 'PAID') {
      throw ApiError.badRequest('Resend is only available for paid bookings.')
    }

    res.json({
      success: true,
      ticketId,
      message: 'Resend requested. Configure delivery service to dispatch SMS/Email/WhatsApp.',
      recipient: {
        email: ticket.visitorEmail || undefined,
        mobile: ticket.visitorMobile,
        name: ticket.visitorName,
      },
    })
  }),
)

export default router
