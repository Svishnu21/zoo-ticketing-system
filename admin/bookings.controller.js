import express from 'express'
import { Ticket } from '../backend/models/Ticket.js'
import { Payment } from '../backend/models/Payment.js'
import { getTicketForDisplay } from '../backend/services/bookingService.js'
import { ApiError, asyncHandler } from '../backend/utils/errors.js'

const router = express.Router()

const normaliseVisitDate = (value) => {
  if (!value) return undefined
  const parsed = new Date(`${value}T00:00:00.000Z`)
  return Number.isNaN(parsed.getTime()) ? undefined : parsed
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

  return {
    ticketId: ticket.ticketId,
    visitDate: ticket.visitDate instanceof Date ? ticket.visitDate.toISOString().slice(0, 10) : ticket.visitDate,
    issueDate: ticket.issueDate instanceof Date ? ticket.issueDate.toISOString() : ticket.issueDate,
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
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20))
    const skip = (page - 1) * limit

    const match = { ticketSource: 'ONLINE' }

    const visitDate = normaliseVisitDate(req.query.visitDate)
    if (visitDate) {
      match.visitDate = visitDate
    }

    if (typeof req.query.paymentStatus === 'string' && req.query.paymentStatus.toLowerCase() !== 'all') {
      match.paymentStatus = req.query.paymentStatus.toUpperCase()
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

    const query = Ticket.find(match)
      .sort({ issueDate: -1 })
      .skip(skip)
      .limit(limit)
      .select('ticketId visitDate issueDate totalAmount paymentMode paymentStatus ticketSource paymentBreakup qrUsed qrUsedAt usedVia usedAt visitorName visitorMobile items')

    const [tickets, total] = await Promise.all([query.lean(), Ticket.countDocuments(match)])

    const paymentMap = {}
    if (tickets.length) {
      const payments = await Payment.find({ ticketId: { $in: tickets.map((t) => t._id) } })
        .select('ticketId status provider providerPaymentId mode amount')
        .lean()
      payments.forEach((payment) => {
        paymentMap[payment.ticketId.toString()] = payment
      })
    }

    const rows = tickets.map((ticket) => presentBookingRow(ticket, paymentMap[ticket._id.toString()]))

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
      .select('ticketId visitDate issueDate totalAmount paymentMode paymentStatus ticketSource paymentBreakup qrUsed qrUsedAt usedVia usedAt visitorName visitorMobile items')
      .lean()

    if (!ticketDoc) {
      throw ApiError.notFound('Booking not found.')
    }

    const display = await getTicketForDisplay(ticketId)

    const payment = await Payment.findOne({ ticketId: ticketDoc._id })
      .select('status provider providerPaymentId mode amount metadata completedAt')
      .lean()

    res.json({
      ...display,
      visitorName: ticketDoc.visitorName,
      visitorMobile: ticketDoc.visitorMobile,
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
