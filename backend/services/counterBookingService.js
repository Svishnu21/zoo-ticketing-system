import { Ticket } from '../models/Ticket.js'
import { ApiError } from '../utils/errors.js'
import { todayIsoDate } from '../utils/dates.js'
import { assertPaymentModeAllowed } from '../utils/pricing.js'
import { loadActivePricingMap } from './pricingService.js'
import { createBooking, getTicketForDisplay } from './bookingService.js'

const isAmountEqual = (a = 0, b = 0, tolerance = 0.01) => Math.abs(Number(a) - Number(b)) <= tolerance

const normalisePaymentBreakup = (paymentMode, payload) => {
  const cashAmount = Number(payload.cashAmount ?? payload.cash ?? payload.paymentBreakup?.cash ?? 0) || 0
  const upiAmount = Number(payload.upiAmount ?? payload.upi ?? payload.paymentBreakup?.upi ?? 0) || 0

  if (cashAmount < 0 || upiAmount < 0) {
    throw ApiError.badRequest('Payment amounts cannot be negative.')
  }

  if (paymentMode === 'CASH') return { cash: cashAmount, upi: 0 }
  if (paymentMode === 'UPI') return { cash: 0, upi: upiAmount }
  if (paymentMode === 'SPLIT') return { cash: cashAmount, upi: upiAmount }

  throw ApiError.badRequest('Payment mode not supported for counter booking.')
}

const assertCounterPaymentMode = (paymentMode) => {
  const allowed = ['CASH', 'UPI', 'SPLIT']
  if (!allowed.includes(paymentMode)) {
    throw ApiError.badRequest('Payment mode must be Cash, UPI, or Split for counter bookings.')
  }
}

export const createCounterBooking = async (payload = {}) => {
  const visitDate = payload.visitDate ?? todayIsoDate()
  const paymentMode = typeof payload.paymentMode === 'string' ? payload.paymentMode.toUpperCase() : 'CASH'
  assertPaymentModeAllowed(paymentMode)
  assertCounterPaymentMode(paymentMode)

  const paymentBreakup = normalisePaymentBreakup(paymentMode, payload)

  const bookingPayload = {
    ...payload,
    visitDate,
    paymentMode,
    paymentStatus: 'PAID',
    ticketSource: 'COUNTER',
    paymentBreakup,
    // Counter flow omits visitor details; use neutral placeholders to satisfy existing validation
    visitorName: payload.visitorName || 'COUNTER',
    visitorMobile: payload.visitorMobile || '0000000000',
    visitorEmail: payload.visitorEmail || '',
  }

  const { ticket, qrImage, visitDateIso, totalAmount, pricedItems } = await createBooking(bookingPayload)

  // Validate payment amounts after server-side pricing to avoid diverging from online logic
  if (paymentMode === 'CASH' && !isAmountEqual(paymentBreakup.cash, totalAmount)) {
    await Ticket.deleteOne({ _id: ticket._id })
    throw ApiError.badRequest('Cash amount must match the total amount.')
  }

  if (paymentMode === 'UPI' && !isAmountEqual(paymentBreakup.upi, totalAmount)) {
    await Ticket.deleteOne({ _id: ticket._id })
    throw ApiError.badRequest('UPI amount must match the total amount.')
  }

  if (paymentMode === 'SPLIT') {
    if (paymentBreakup.cash <= 0 || paymentBreakup.upi <= 0) {
      await Ticket.deleteOne({ _id: ticket._id })
      throw ApiError.badRequest('Split payment requires both cash and UPI amounts.')
    }
    if (!isAmountEqual(paymentBreakup.cash + paymentBreakup.upi, totalAmount)) {
      await Ticket.deleteOne({ _id: ticket._id })
      throw ApiError.badRequest('Cash + UPI amount must equal the total amount.')
    }
  }

  return {
    ticket,
    qrImage,
    totalAmount,
    visitDateIso,
    pricedItems,
    paymentBreakup,
  }
}

export const getCounterTicket = async (ticketId) => {
  const ticket = await getTicketForDisplay(ticketId)
  if (ticket.ticketSource !== 'COUNTER') {
    throw ApiError.notFound('Counter ticket not found.')
  }
  return ticket
}

export const getRecentCounterTickets = async () => {
  const startOfToday = new Date(todayIsoDate())
  return Ticket.find({
    ticketSource: 'COUNTER',
    issueDate: { $gte: startOfToday },
  })
    .select('ticketId visitDate issueDate totalAmount paymentMode paymentStatus ticketSource paymentBreakup qrUsed qrUsedAt')
    .sort({ issueDate: -1 })
    .limit(50)
    .lean()
}

export const getCounterHistory = async ({ date, paymentMode } = {}) => {
  const match = { ticketSource: 'COUNTER' }

  if (typeof paymentMode === 'string' && paymentMode.toUpperCase() !== 'ALL') {
    match.paymentMode = paymentMode.toUpperCase()
  }

  if (date) {
    const parsed = new Date(date)
    if (Number.isNaN(parsed.getTime())) {
      throw ApiError.badRequest('History date is invalid.')
    }
    const start = new Date(Date.UTC(parsed.getUTCFullYear(), parsed.getUTCMonth(), parsed.getUTCDate()))
    const end = new Date(start)
    end.setUTCDate(end.getUTCDate() + 1)
    match.issueDate = { $gte: start, $lt: end }
  }

  return Ticket.find(match)
    .select('ticketId visitDate issueDate totalAmount paymentMode paymentStatus ticketSource paymentBreakup qrUsed qrUsedAt')
    .sort({ issueDate: -1 })
    .limit(200)
    .lean()
}

export const getCounterPricing = async () => {
  const pricingMap = await loadActivePricingMap()
  return Object.values(pricingMap)
}
