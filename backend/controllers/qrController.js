import { validateAndConsumeQrToken } from '../services/qrService.js'
import { validateTicketIdFallback } from '../services/manualTicketValidationService.js'
import { asyncHandler } from '../utils/errors.js'

export const validateQr = asyncHandler(async (req, res) => {
  const { token, gateId } = req.body ?? {}
  const ticket = await validateAndConsumeQrToken(token, { gateId })

  res.json({
    status: 'SUCCESS',
    ticketId: ticket.ticketId,
    visitDate: ticket.visitDate instanceof Date ? ticket.visitDate.toISOString().slice(0, 10) : ticket.visitDate,
  })
})

export const validateTicketId = asyncHandler(async (req, res) => {
  const { ticketId, gateId, reason } = req.body ?? {}
  const result = await validateTicketIdFallback({ ticketId, gateId, reason })

  res.json({
    status: 'SUCCESS',
    ticketId: result.ticketId,
    visitDate: result.visitDate,
    usedAt: result.usedAt,
    method: 'MANUAL_TICKET_ID',
  })
})
