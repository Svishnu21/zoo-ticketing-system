import { Ticket } from '../models/Ticket.js'
import { Booking } from '../models/Booking.js'
import { ScanLog } from '../models/ScanLog.js'
import { ApiError } from '../utils/errors.js'
import { todayIsoDate } from '../utils/dates.js'

const logScan = async ({ ticketId, ticketRef, bookingId, qrToken, result, gateId }) => {
  try {
    await ScanLog.create({
      ticketId,
      ticketRef,
      bookingId,
      qrTokenHash: qrToken,
      result,
      gateId,
      method: 'QR_TOKEN',
    })
  } catch (error) {
    // Logging failures should never block gate flow; swallow errors after emitting for operators
    console.error('Failed to log scan attempt', error)
  }
}

/**
 * Self-healing: When a ticket has paymentStatus PENDING but its parent Booking
 * shows a confirmed payment (SUCCESS or PAID), auto-repair the ticket and return true.
 * This covers tickets created before the payment-callback fix was deployed, and
 * any future edge case where the callback-level Ticket.updateMany fails silently.
 */
const tryAutoRepairPaymentStatus = async (existing) => {
  if (!existing || ['PAID', 'SUCCESS'].includes(existing.paymentStatus)) {
    return false // Nothing to repair
  }

  // Look up the parent booking by bookingId (human-readable) or bookingRef (ObjectId)
  const bookingFilter = existing.bookingRef
    ? { _id: existing.bookingRef }
    : existing.bookingId
      ? { bookingId: existing.bookingId }
      : null

  if (!bookingFilter) {
    console.warn('[qr-validate] auto-repair skipped: no booking linkage on ticket', { ticketId: existing.ticketId })
    return false
  }

  const booking = await Booking.findOne(bookingFilter)
    .select('bookingId paymentStatus status')
    .lean()

  if (!booking) {
    console.warn('[qr-validate] auto-repair skipped: booking not found', { ticketId: existing.ticketId, bookingFilter })
    return false
  }

  if (!['PAID', 'SUCCESS'].includes(booking.paymentStatus)) {
    // Booking itself is not paid — genuine payment-pending situation
    console.info('[qr-validate] auto-repair skipped: booking payment not confirmed', {
      ticketId: existing.ticketId,
      bookingPaymentStatus: booking.paymentStatus,
    })
    return false
  }

  // Booking IS paid but ticket is still PENDING → auto-repair the ticket
  const repairResult = await Ticket.updateOne(
    { _id: existing._id, paymentStatus: { $nin: ['PAID', 'SUCCESS'] } },
    { $set: { paymentStatus: 'SUCCESS' } },
  )

  console.info('[qr-validate] AUTO-REPAIRED ticket paymentStatus', {
    ticketId: existing.ticketId,
    bookingId: booking.bookingId,
    bookingPaymentStatus: booking.paymentStatus,
    previousTicketStatus: existing.paymentStatus,
    modified: repairResult.modifiedCount,
  })

  return repairResult.modifiedCount > 0
}

export const validateAndConsumeQrToken = async (token, { gateId } = {}) => {
  if (!token) {
    throw ApiError.badRequest('QR token is required.')
  }

  const cleanToken = String(token || '').trim()
  console.info('[qr-validate] scan attempt', { tokenPrefix: cleanToken.substring(0, 8), gateId })

  const todayIso = todayIsoDate()
  // Use date-only comparison to avoid timezone drift between ticket storage (00:00 UTC) and gate scans
  const todayDateOnly = new Date(`${todayIso}T00:00:00.000Z`)
  const now = new Date()

  // --- Fix 7: 5:00 PM (17:00 IST) server-side expiry ---
  // Asia/Kolkata is UTC+5:30
  const istTime = new Date(now.getTime() + (5.5 * 60 * 60 * 1000))
  const isPast5PM = istTime.getUTCHours() >= 17

  // --- Lookup with qrToken explicitly included (select:false in schema) ---
  // Atomic update prevents replay: only the first valid scan flips the status from unused to used.
  // Enforcement: strictly verify paymentStatus is PAID (for counter/admin) or SUCCESS (for online).
  const query = {
    $or: [{ qrToken: cleanToken }, { ticketId: cleanToken }],
    qrUsed: false,
    visitDate: todayDateOnly,
    paymentStatus: { $in: ['PAID', 'SUCCESS'] },
  }

  if (isPast5PM) {
    query.ticketSource = { $ne: 'ONLINE' }
  }

  const ticket = await Ticket.findOneAndUpdate(
    query,
    {
      $set: {
        qrUsed: true,
        qrUsedAt: now,
        usedVia: 'QR_TOKEN',
        usedAt: now,
        entryStatus: 'ENTERED',
        scannedAt: now,
      },
    },
    { returnDocument: 'after', projection: { ticketId: 1, visitDate: 1, qrUsedAt: 1, bookingId: 1, bookingRef: 1, paymentStatus: 1, ticketSource: 1 } },
  ).lean()

  if (ticket) {
    console.info('[qr-validate] VALID → entry granted', { ticketId: ticket.ticketId, bookingId: ticket.bookingId, paymentStatus: ticket.paymentStatus, gateId })
    await logScan({ ticketId: ticket.ticketId, ticketRef: ticket._id, bookingId: ticket.bookingId, qrToken: cleanToken, result: 'success', gateId })
    return ticket
  }

  // --- Fallback: find the ticket to determine the exact rejection reason ---
  const existing = await Ticket.findOne({ $or: [{ qrToken: cleanToken }, { ticketId: cleanToken }] })
    .select('+qrToken visitDate qrUsed qrUsedAt ticketId bookingId bookingRef paymentStatus ticketSource')
    .lean()

  console.info('[qr-validate] primary atomic update missed; diagnosing reason', {
    tokenPrefix: cleanToken.substring(0, 8),
    found: !!existing,
    ticketId: existing?.ticketId,
    paymentStatus: existing?.paymentStatus,
    qrUsed: existing?.qrUsed,
    visitDate: existing?.visitDate instanceof Date ? existing.visitDate.toISOString().slice(0, 10) : existing?.visitDate,
    todayIso,
  })
  
  if (!existing) {
    await logScan({ ticketId: undefined, qrToken: cleanToken, result: 'invalid_token', gateId })
    throw ApiError.notFound('QR code is invalid.', { code: 'INVALID' })
  }

  if (isPast5PM && existing.ticketSource === 'ONLINE') {
    await logScan({ ticketId: existing.ticketId, ticketRef: existing._id, bookingId: existing.bookingId, qrToken: cleanToken, result: 'expired', gateId })
    throw ApiError.badRequest('Ticket expired. Entry is closed for today after 05:00 PM IST.', {
      code: 'EXPIRED',
      ticketId: existing.ticketId,
      visitDate: existing.visitDate instanceof Date ? existing.visitDate.toISOString().slice(0, 10) : existing.visitDate,
      ticketSource: existing.ticketSource
    })
  }

  // --- Self-healing: if ticket is PENDING but Booking is paid, auto-repair and retry ---
  if (!['PAID', 'SUCCESS'].includes(existing.paymentStatus)) {
    const repaired = await tryAutoRepairPaymentStatus(existing)

    if (repaired) {
      // Ticket is now fixed → retry the atomic scan-and-consume
      const retryTicket = await Ticket.findOneAndUpdate(
        {
          _id: existing._id,
          qrUsed: false,
          visitDate: todayDateOnly,
          paymentStatus: { $in: ['PAID', 'SUCCESS'] },
        },
        {
          $set: {
            qrUsed: true,
            qrUsedAt: now,
            usedVia: 'QR_TOKEN',
            usedAt: now,
            entryStatus: 'ENTERED',
            scannedAt: now,
          },
        },
        { returnDocument: 'after', projection: { ticketId: 1, visitDate: 1, qrUsedAt: 1, bookingId: 1, bookingRef: 1, paymentStatus: 1 } },
      ).lean()

      if (retryTicket) {
        console.info('[qr-validate] VALID (auto-repaired) → entry granted', { ticketId: retryTicket.ticketId, gateId })
        await logScan({ ticketId: retryTicket.ticketId, ticketRef: retryTicket._id, bookingId: retryTicket.bookingId, qrToken: cleanToken, result: 'success', gateId })
        return retryTicket
      }
    }

    // Auto-repair was not possible or retry still failed — genuine payment pending
    await logScan({ ticketId: existing.ticketId, ticketRef: existing._id, bookingId: existing.bookingId, qrToken: cleanToken, result: 'payment_pending', gateId })
    throw ApiError.forbidden('Payment pending. User must pay before entry.', { code: 'PAYMENT_PENDING', ticketId: existing.ticketId })
  }

  if (existing.qrUsed) {
    await logScan({ ticketId: existing.ticketId, ticketRef: existing._id, bookingId: existing.bookingId, qrToken: cleanToken, result: 'already_used', gateId })
    throw ApiError.conflict('QR code has already been used.', { 
      code: 'ALREADY_USED',
      ticketId: existing.ticketId,
      visitDate: existing.visitDate instanceof Date ? existing.visitDate.toISOString().slice(0, 10) : existing.visitDate,
      ticketSource: existing.ticketSource
    })
  }

  const visitDateIso = existing.visitDate instanceof Date ? existing.visitDate.toISOString().slice(0, 10) : undefined
  if (visitDateIso !== todayIso) {
    await logScan({ ticketId: existing.ticketId, ticketRef: existing._id, bookingId: existing.bookingId, qrToken: cleanToken, result: 'invalid_date', gateId })
    throw ApiError.badRequest('Ticket is not valid for today.', {
      code: 'INVALID_DATE',
      ticketId: existing.ticketId,
      visitDate: visitDateIso,
      ticketSource: existing.ticketSource
    })
  }

  await logScan({ ticketId: existing.ticketId, ticketRef: existing._id, bookingId: existing.bookingId, qrToken: cleanToken, result: 'error', gateId })
  throw ApiError.badRequest('QR code could not be validated.')
}

