import { Ticket } from '../models/Ticket.js'
import { ScanLog } from '../models/ScanLog.js'
import { ApiError } from '../utils/errors.js'
import { todayIsoDate } from '../utils/dates.js'

const logScan = async ({ ticketId, qrToken, result, gateId }) => {
  try {
    await ScanLog.create({ ticketId, qrTokenHash: qrToken, result, gateId })
  } catch (error) {
    // Logging failures should never block gate flow; swallow errors after emitting for operators
    console.error('Failed to log scan attempt', error)
  }
}

export const validateAndConsumeQrToken = async (token, { gateId } = {}) => {
  if (!token) {
    throw ApiError.badRequest('QR token is required.')
  }

  const todayIso = todayIsoDate()
  // Use date-only comparison to avoid timezone drift between ticket storage (00:00 UTC) and gate scans
  const todayDateOnly = new Date(`${todayIso}T00:00:00.000Z`)
  const now = new Date()

  // Atomic update prevents replay: only the first valid scan flips the status from unused to used
  const ticket = await Ticket.findOneAndUpdate(
    { qrToken: token, qrUsed: false, visitDate: todayDateOnly },
    { $set: { qrUsed: true, qrUsedAt: now, usedVia: 'QR_TOKEN', usedAt: now } },
    { new: true, projection: { ticketId: 1, visitDate: 1, qrUsedAt: 1, _id: 0 } },
  ).lean()

  if (ticket) {
    await logScan({ ticketId: ticket.ticketId, qrToken: token, result: 'success', gateId })
    return ticket
  }

  const existing = await Ticket.findOne({ qrToken: token })
    .select('visitDate qrUsed qrUsedAt ticketId')
    .lean()

  if (!existing) {
    await logScan({ ticketId: undefined, qrToken: token, result: 'invalid_token', gateId })
    throw ApiError.notFound('QR code is invalid.', { code: 'INVALID' })
  }

  if (existing.qrUsed) {
    await logScan({ ticketId: existing.ticketId, qrToken: token, result: 'already_used', gateId })
    throw ApiError.conflict('QR code has already been used.', { code: 'ALREADY_USED' })
  }

  const visitDateIso = existing.visitDate instanceof Date ? existing.visitDate.toISOString().slice(0, 10) : undefined
  if (visitDateIso !== todayIso) {
    await logScan({ ticketId: existing.ticketId, qrToken: token, result: 'invalid_date', gateId })
    throw ApiError.badRequest('Ticket is not valid for today.', { code: 'INVALID_DATE' })
  }

  await logScan({ ticketId: existing.ticketId, qrToken: token, result: 'error', gateId })
  throw ApiError.badRequest('QR code could not be validated.')
}
