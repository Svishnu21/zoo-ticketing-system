import { Ticket } from '../models/Ticket.js'
import { ScanLog } from '../models/ScanLog.js'
import { ApiError } from '../utils/errors.js'
import { todayIsoDate } from '../utils/dates.js'

const TICKET_ID_PATTERN = /^KZP-[0-9]{6}-[A-Z0-9]{6}$/

const normaliseTicketId = (value) => {
  if (!value || typeof value !== 'string') {
    throw ApiError.badRequest('Ticket ID is required for manual validation.')
  }

  const trimmed = value.trim().toUpperCase()
  if (!TICKET_ID_PATTERN.test(trimmed)) {
    throw ApiError.badRequest('Ticket ID format is invalid.')
  }

  return trimmed
}

const normaliseReason = (value) => {
  if (!value || typeof value !== 'string') {
    throw ApiError.badRequest('Reason is required when bypassing QR.')
  }

  const trimmed = value.trim()
  if (!trimmed) {
    throw ApiError.badRequest('Reason cannot be empty.')
  }

  if (trimmed.length > 500) {
    throw ApiError.badRequest('Reason is too long. Please keep it under 500 characters.')
  }

  return trimmed
}

const logManualAttempt = async ({ ticketId, gateId, reason, result }) => {
  try {
    await ScanLog.create({
      ticketId,
      qrTokenHash: null,
      method: 'MANUAL_TICKET_ID',
      reason,
      gateId,
      result,
    })
  } catch (error) {
    // Logging failures should never block gate flow
    console.error('Failed to log manual ticket validation', error)
  }
}

export const validateTicketIdFallback = async ({ ticketId, gateId, reason }) => {
  let normalizedTicketId
  let normalizedReason

  try {
    normalizedTicketId = normaliseTicketId(ticketId)
    normalizedReason = normaliseReason(reason)
  } catch (error) {
    await logManualAttempt({
      ticketId: typeof ticketId === 'string' ? ticketId.trim().toUpperCase() : ticketId,
      gateId,
      reason: typeof reason === 'string' ? reason.trim() : undefined,
      result: 'error',
    })
    throw error
  }

  const todayIso = todayIsoDate()
  const todayDateOnly = new Date(`${todayIso}T00:00:00.000Z`)
  const now = new Date()

  const ticket = await Ticket.findOneAndUpdate(
    { ticketId: normalizedTicketId, paymentStatus: 'PAID', visitDate: todayDateOnly, qrUsed: false },
    { $set: { qrUsed: true, qrUsedAt: now, usedVia: 'MANUAL_TICKET_ID', usedAt: now } },
    { new: true, projection: { ticketId: 1, visitDate: 1, qrUsedAt: 1, usedAt: 1, _id: 0 } },
  ).lean()

  if (ticket) {
    await logManualAttempt({ ticketId: normalizedTicketId, gateId, reason: normalizedReason, result: 'success' })
    return {
      ticketId: ticket.ticketId,
      visitDate: ticket.visitDate instanceof Date ? ticket.visitDate.toISOString().slice(0, 10) : todayIso,
      usedAt: ticket.usedAt || ticket.qrUsedAt || now,
    }
  }

  const existing = await Ticket.findOne({ ticketId: normalizedTicketId })
    .select('ticketId visitDate qrUsed qrUsedAt usedVia usedAt paymentStatus')
    .lean()

  if (!existing) {
    await logManualAttempt({ ticketId: normalizedTicketId, gateId, reason: normalizedReason, result: 'not_found' })
    throw ApiError.notFound('Ticket ID not found.')
  }

  if (existing.paymentStatus !== 'PAID') {
    await logManualAttempt({ ticketId: normalizedTicketId, gateId, reason: normalizedReason, result: 'error' })
    throw ApiError.forbidden('Payment not completed for this ticket.')
  }

  const visitDateIso = existing.visitDate instanceof Date ? existing.visitDate.toISOString().slice(0, 10) : undefined
  if (visitDateIso !== todayIso) {
    await logManualAttempt({ ticketId: normalizedTicketId, gateId, reason: normalizedReason, result: 'invalid_date' })
    throw ApiError.badRequest('Ticket is not valid for today.')
  }

  if (existing.qrUsed) {
    await logManualAttempt({ ticketId: normalizedTicketId, gateId, reason: normalizedReason, result: 'already_used' })
    const consumedVia = existing.usedVia || 'a previous scan'
    throw ApiError.conflict(`Ticket has already been used via ${consumedVia}.`)
  }

  await logManualAttempt({ ticketId: normalizedTicketId, gateId, reason: normalizedReason, result: 'error' })
  throw ApiError.badRequest('Ticket ID could not be validated.')
}
