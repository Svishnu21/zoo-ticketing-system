import { Ticket } from '../models/Ticket.js'
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
  if (istTime.getUTCHours() >= 17) {
    throw ApiError.badRequest('Ticket expired. Entry is closed for today after 05:00 PM IST.', { code: 'EXPIRED' })
  }

  // --- Lookup with qrToken explicitly included (select:false in schema) ---
  // Atomic update prevents replay: only the first valid scan flips the status from unused to used.
  // Enforcement: strictly verify paymentStatus is PAID (for counter/admin) or SUCCESS (for online).
  const ticket = await Ticket.findOneAndUpdate(
    {
      $or: [{ qrToken: cleanToken }, { ticketId: cleanToken }],
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

  if (ticket) {
    console.info('[qr-validate] VALID → entry granted', { ticketId: ticket.ticketId, bookingId: ticket.bookingId, paymentStatus: ticket.paymentStatus, gateId })
    await logScan({ ticketId: ticket.ticketId, ticketRef: ticket._id, bookingId: ticket.bookingId, qrToken: cleanToken, result: 'success', gateId })
    return ticket
  }

  // --- Fallback: find the ticket to determine the exact rejection reason ---
  const existing = await Ticket.findOne({ $or: [{ qrToken: cleanToken }, { ticketId: cleanToken }] })
    .select('+qrToken visitDate qrUsed qrUsedAt ticketId bookingId paymentStatus')
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

  if (!['PAID', 'SUCCESS'].includes(existing.paymentStatus)) {
    await logScan({ ticketId: existing.ticketId, ticketRef: existing._id, bookingId: existing.bookingId, qrToken: cleanToken, result: 'payment_pending', gateId })
    throw ApiError.forbidden('Payment pending. User must pay before entry.', { code: 'PAYMENT_PENDING', ticketId: existing.ticketId })
  }

  if (existing.qrUsed) {
    await logScan({ ticketId: existing.ticketId, ticketRef: existing._id, bookingId: existing.bookingId, qrToken: cleanToken, result: 'already_used', gateId })
    throw ApiError.conflict('QR code has already been used.', { code: 'ALREADY_USED' })
  }

  const visitDateIso = existing.visitDate instanceof Date ? existing.visitDate.toISOString().slice(0, 10) : undefined
  if (visitDateIso !== todayIso) {
    await logScan({ ticketId: existing.ticketId, ticketRef: existing._id, bookingId: existing.bookingId, qrToken: cleanToken, result: 'invalid_date', gateId })
    throw ApiError.badRequest('Ticket is not valid for today.', { code: 'INVALID_DATE' })
  }

  await logScan({ ticketId: existing.ticketId, ticketRef: existing._id, bookingId: existing.bookingId, qrToken: cleanToken, result: 'error', gateId })
  throw ApiError.badRequest('QR code could not be validated.')
}
