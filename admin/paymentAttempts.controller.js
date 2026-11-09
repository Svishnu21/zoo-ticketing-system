// Admin audit view of ONLINE payment attempts (all lifecycle states), plus safe recovery actions.
// Confirmed bookings remain in the main Bookings list; this view exists so failed / pending /
// recovery-required attempts are preserved and visible without ever counting as bookings.
import express from 'express'
import { Booking } from '../backend/models/Booking.js'
import { Payment } from '../backend/models/Payment.js'
import { Ticket } from '../backend/models/Ticket.js'
import { ApiError, asyncHandler } from '../backend/utils/errors.js'
import {
  ONLINE_BOOKING_STATUS,
  PAID_STATUSES,
  issueTicketForConfirmedBooking,
} from '../backend/services/onlinePaymentService.js'
import { reconcileTransactionWithGateway } from '../backend/controllers/paymentController.js'
import { recordAuditLog } from '../backend/utils/auditTrail.js'

const router = express.Router()
const PAGE_SIZE = 20
const STATUSES = Object.values(ONLINE_BOOKING_STATUS)

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

const parseDateOnly = (value) => {
  if (!value) return null
  const parsed = new Date(`${value}T00:00:00.000Z`)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

// Attempt dates are recorded in UTC; the admin picks IST calendar days.
const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000
const buildCreatedRange = (from, to) => {
  const fromDate = parseDateOnly(from)
  const toDate = parseDateOnly(to)
  if (!fromDate && !toDate) return undefined
  const range = {}
  if (fromDate) range.$gte = new Date(fromDate.getTime() - IST_OFFSET_MS)
  if (toDate) range.$lt = new Date(toDate.getTime() + 24 * 60 * 60 * 1000 - IST_OFFSET_MS)
  return range
}

const findOnlineBooking = async (bookingId) => {
  const booking = await Booking.findOne({ bookingId, ticketSource: 'ONLINE' })
  if (!booking) throw ApiError.notFound('Online booking attempt not found.')
  return booking
}

const findPaymentForBooking = (booking) =>
  Payment.findOne(booking.paymentId ? { _id: booking.paymentId } : { bookingId: booking._id })

router.get(
  '/payment-attempts',
  asyncHandler(async (req, res) => {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1)
    const status = typeof req.query.status === 'string' ? req.query.status.toUpperCase() : 'ALL'

    const baseMatch = { ticketSource: 'ONLINE' }
    const createdRange = buildCreatedRange(req.query.from, req.query.to)
    if (createdRange) baseMatch.createdAt = createdRange

    const search = typeof req.query.search === 'string' ? req.query.search.trim() : ''
    if (search) {
      const regex = new RegExp(escapeRegex(search), 'i')
      const matchingPayments = await Payment.find({
        $or: [{ transactionId: regex }, { providerPaymentId: regex }],
      })
        .select('bookingId')
        .limit(200)
        .lean()
      baseMatch.$or = [
        { bookingId: regex },
        { visitorMobile: regex },
        { customerPhone: regex },
        { visitorName: regex },
        { _id: { $in: matchingPayments.map((payment) => payment.bookingId).filter(Boolean) } },
      ]
    }

    const listMatch = STATUSES.includes(status) ? { ...baseMatch, status } : baseMatch

    const [bookings, total, statusCounts] = await Promise.all([
      Booking.find(listMatch)
        .sort({ createdAt: -1 })
        .skip((page - 1) * PAGE_SIZE)
        .limit(PAGE_SIZE)
        .select('bookingId status statusReason paymentStatus visitDate totalAmount items tickets visitorName visitorMobile customerName customerPhone paymentId createdAt confirmedAt recoveryRequiredAt')
        .lean(),
      Booking.countDocuments(listMatch),
      Booking.aggregate([
        { $match: baseMatch },
        { $group: { _id: '$status', count: { $sum: 1 }, amount: { $sum: '$totalAmount' } } },
      ]),
    ])

    const bookingObjectIds = bookings.map((booking) => booking._id)
    const ticketObjectIds = bookings.flatMap((booking) => booking.tickets || [])
    const [payments, tickets] = await Promise.all([
      Payment.find({ bookingId: { $in: bookingObjectIds } })
        .select('bookingId transactionId providerPaymentId status amount failureReason requestedAt completedAt method')
        .lean(),
      Ticket.find({ _id: { $in: ticketObjectIds } }).select('ticketId paymentStatus qrUsed').lean(),
    ])
    const paymentByBooking = new Map(payments.map((payment) => [String(payment.bookingId), payment]))
    const ticketById = new Map(tickets.map((ticket) => [String(ticket._id), ticket]))

    const rows = bookings.map((booking) => {
      const payment = paymentByBooking.get(String(booking._id))
      const ticket = (booking.tickets || []).map((id) => ticketById.get(String(id))).find(Boolean)
      const ticketCount = (booking.items || []).reduce((sum, item) => sum + Number(item.quantity || 0), 0)
      const paymentVerified = PAID_STATUSES.includes(String(payment?.status || '').toUpperCase())
      return {
        bookingId: booking.bookingId,
        status: booking.status,
        statusReason: booking.statusReason || payment?.failureReason || '',
        visitorName: booking.visitorName || booking.customerName,
        visitorMobile: booking.visitorMobile || booking.customerPhone,
        visitDate: booking.visitDate instanceof Date ? booking.visitDate.toISOString().slice(0, 10) : booking.visitDate,
        attemptedAt: booking.createdAt,
        confirmedAt: booking.confirmedAt,
        totalAmount: booking.totalAmount,
        ticketCount,
        transactionId: payment?.transactionId,
        gatewayPaymentId: payment?.providerPaymentId,
        paymentStatus: payment?.status || booking.paymentStatus,
        paymentCompletedAt: payment?.completedAt,
        ticketId: ticket?.ticketId,
        ticketPaymentStatus: ticket?.paymentStatus,
        canVerify: Boolean(payment?.transactionId) && booking.status !== ONLINE_BOOKING_STATUS.CONFIRMED,
        canRecoverTicket: paymentVerified && booking.status !== ONLINE_BOOKING_STATUS.CONFIRMED,
      }
    })

    const summary = Object.fromEntries(STATUSES.map((key) => [key, { count: 0, amount: 0 }]))
    statusCounts.forEach((row) => {
      if (row._id) summary[row._id] = { count: row.count, amount: row.amount }
    })

    res.json({
      success: true,
      data: rows,
      summary,
      pagination: { page, limit: PAGE_SIZE, total, hasNext: page * PAGE_SIZE < total },
    })
  }),
)

// Ask Easebuzz (Transaction Retrieve API) for the real status of the attempt and apply it.
// Success → booking confirmed + ticket issued; failure → FAILED; otherwise unchanged.
router.post(
  '/payment-attempts/:bookingId/verify',
  asyncHandler(async (req, res) => {
    const booking = await findOnlineBooking(req.params.bookingId)
    const payment = await findPaymentForBooking(booking)
    if (!payment?.transactionId) throw ApiError.badRequest('This attempt has no gateway transaction to verify.')

    const result = await reconcileTransactionWithGateway(payment.transactionId, { source: 'ADMIN_VERIFY' })
    const updated = await Booking.findById(booking._id).select('status').lean()

    recordAuditLog({
      actorId: req.user?._id || req.user?.id,
      action: 'ADMIN_PAYMENT_ATTEMPT_VERIFY',
      entity: 'Booking',
      entityId: booking._id,
      context: { bookingId: booking.bookingId, txnid: payment.transactionId, gatewayStatus: result.gatewayStatus, outcome: result.outcome },
    }).catch(() => {})

    res.json({ success: true, bookingStatus: updated?.status, ...result, verifyData: undefined })
  }),
)

// Issue the missing ticket for a payment that is ALREADY verified as successful.
// Never contacts the gateway and never charges the customer; idempotent (no duplicate tickets).
router.post(
  '/payment-attempts/:bookingId/recover-ticket',
  asyncHandler(async (req, res) => {
    const booking = await findOnlineBooking(req.params.bookingId)
    const payment = await findPaymentForBooking(booking)

    if (!PAID_STATUSES.includes(String(payment?.status || '').toUpperCase())) {
      throw ApiError.conflict('Payment is not verified as successful. Use "Verify with gateway" first.')
    }

    if (!PAID_STATUSES.includes(String(booking.paymentStatus || '').toUpperCase())) {
      await Booking.updateOne({ _id: booking._id }, { $set: { paymentStatus: 'SUCCESS', paymentId: payment._id } })
    }

    let ticket
    try {
      ;({ ticket } = await issueTicketForConfirmedBooking(booking._id))
    } catch (error) {
      await Booking.updateOne(
        { _id: booking._id, status: { $ne: ONLINE_BOOKING_STATUS.CONFIRMED } },
        {
          $set: {
            status: ONLINE_BOOKING_STATUS.RECOVERY_REQUIRED,
            statusReason: `TICKET_RECOVERY_FAILED: ${error?.message || error}`.slice(0, 500),
            recoveryRequiredAt: new Date(),
          },
        },
      )
      throw error
    }

    recordAuditLog({
      actorId: req.user?._id || req.user?.id,
      action: 'ADMIN_TICKET_RECOVERED',
      entity: 'Booking',
      entityId: booking._id,
      context: { bookingId: booking.bookingId, ticketId: ticket?.ticketId, txnid: payment.transactionId },
    }).catch(() => {})

    res.json({ success: true, bookingId: booking.bookingId, ticketId: ticket?.ticketId, bookingStatus: ONLINE_BOOKING_STATUS.CONFIRMED })
  }),
)

export default router
