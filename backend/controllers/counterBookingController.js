import {
  createCounterBooking,
  getCounterTicket,
  getRecentCounterTickets,
  getCounterHistory,
  getCounterPricing,
} from '../services/counterBookingService.js'
import { asyncHandler } from '../utils/errors.js'

export const postCounterBooking = asyncHandler(async (req, res) => {
  const { ticket, qrImage, totalAmount, visitDateIso, pricedItems, paymentBreakup } = await createCounterBooking(req.body)

  const responseObject = {
    success: true,
    ticketId: ticket.ticketId,
    bookingId: ticket.ticketId, // alias for frontend compatibility
    visitDate: visitDateIso,
    issueDate: ticket.issueDate instanceof Date ? ticket.issueDate.toISOString() : ticket.issueDate,
    totalAmount,
    items: pricedItems,
    paymentMode: ticket.paymentMode,
    paymentStatus: ticket.paymentStatus,
    ticketSource: ticket.ticketSource,
    paymentBreakup,
    qrImage,
  }

  return res.status(201).json(responseObject)
})

export const getCounterRecent = asyncHandler(async (_req, res) => {
  const tickets = await getRecentCounterTickets()
  res.json({ success: true, tickets })
})

export const getCounterHistoryController = asyncHandler(async (req, res) => {
  const { date, paymentMode } = req.query
  const tickets = await getCounterHistory({ date, paymentMode })
  res.json({ success: true, tickets })
})

export const getCounterTicketController = asyncHandler(async (req, res) => {
  const ticket = await getCounterTicket(req.params.id)
  res.json({ success: true, ticket })
})

export const getCounterPricingController = asyncHandler(async (_req, res) => {
  const pricing = await getCounterPricing()
  res.json({ success: true, pricing })
})
