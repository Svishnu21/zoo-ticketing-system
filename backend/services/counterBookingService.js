import { Ticket } from '../models/Ticket.js'
import { TicketIssue } from '../models/TicketIssue.js'
import { ApiError } from '../utils/errors.js'
import { todayIsoDate } from '../utils/dates.js'
import { assertPaymentModeAllowed, coerceQuantity } from '../utils/pricing.js'
import { loadActivePricingMap } from './pricingService.js'
import { createBooking, getTicketForDisplay } from './bookingService.js'

const isAmountEqual = (a = 0, b = 0, tolerance = 0.01) => Math.abs(Number(a) - Number(b)) <= tolerance

const sanitizeCounterItems = (rawItems = []) => {
  if (!Array.isArray(rawItems)) return []

  return rawItems
    .map((item) => {
      const itemCode = typeof item?.itemCode === 'string' ? item.itemCode.trim() : ''
      const quantity = coerceQuantity(item?.quantity ?? item?.qty)
      return { ...item, itemCode, quantity }
    })
    .filter((item) => item.itemCode && Number.isFinite(item.quantity) && item.quantity > 0)
}

const presentCounterTicket = (ticket = {}) => {
  const items = Array.isArray(ticket.items)
    ? ticket.items.map((item) => {
        // Preserve stored snapshot: no recomputation, no label mutation.
        const quantity = Number(item?.quantity ?? item?.qty ?? 0) || 0
        const unitPrice = Number(item?.unitPrice ?? item?.price ?? 0)
        const amount = Number(item?.amount ?? 0)
        return {
          itemCode: item?.itemCode || item?.code || item?.categoryCode,
          label: item?.itemLabel || item?.label || item?.categoryName || item?.itemCode || item?.categoryCode || 'Item',
          category: item?.category || 'zoo',
          quantity,
          unitPrice,
          amount,
        }
      })
    : []

  const quantityTotal = items.reduce((sum, item) => sum + Number(item.quantity || 0), 0)
  const ticketTypeSummary = items.length ? items.map((i) => `${i.label} ×${i.quantity}`).join(', ') : 'No breakdown (legacy record)'
  const visitDateIso = ticket.visitDate instanceof Date ? ticket.visitDate.toISOString().slice(0, 10) : ticket.visitDate

  return {
    ticketId: ticket.ticketId,
    visitDate: ticket.visitDate,
    date: visitDateIso,
    issueDate: ticket.issueDate,
    totalAmount: ticket.totalAmount,
    paymentMode: ticket.paymentMode,
    paymentStatus: ticket.paymentStatus,
    ticketSource: ticket.ticketSource,
    paymentBreakup: ticket.paymentBreakup,
    qrUsed: ticket.qrUsed,
    qrUsedAt: ticket.qrUsedAt,
    issuedBy: ticket.visitorName || 'COUNTER',
    items,
    quantityTotal,
    ticketTypeSummary,
    hasBreakdown: items.length > 0,
  }
}

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

// Validate that the persisted counter ticket matches what was computed.
const assertCounterTicketIntegrity = async ({ ticket, pricedItems, expectedItemCount, expectedTotal }) => {
  const itemCount = Array.isArray(ticket?.items) ? ticket.items.length : 0
  const pricedCount = Array.isArray(pricedItems) ? pricedItems.length : 0

  if (!itemCount || !pricedCount) {
    await Ticket.deleteOne({ _id: ticket?._id })
    throw ApiError.internal('Counter ticket is missing line items after save.')
  }

  if (itemCount !== expectedItemCount || itemCount !== pricedCount) {
    await Ticket.deleteOne({ _id: ticket?._id })
    throw ApiError.internal('Counter ticket item count mismatch; ticket not saved.')
  }

  const summed = ticket.items.reduce((sum, it) => sum + Number(it?.amount ?? 0), 0)
  const storedTotal = Number(ticket?.totalAmount ?? 0)

  if (!Number.isFinite(storedTotal) || storedTotal < 0) {
    await Ticket.deleteOne({ _id: ticket?._id })
    throw ApiError.internal('Counter ticket total invalid after save.')
  }

  if (Math.abs(summed - storedTotal) > 0.01 || Math.abs(summed - expectedTotal) > 0.01) {
    await Ticket.deleteOne({ _id: ticket?._id })
    throw ApiError.internal('Counter ticket total mismatch; ticket not saved.')
  }
}

const assertCounterPaymentMode = (paymentMode) => {
  const allowed = ['CASH', 'UPI', 'SPLIT']
  if (!allowed.includes(paymentMode)) {
    throw ApiError.badRequest('Payment mode must be Cash, UPI, or Split for counter bookings.')
  }
}

const toIssuePaymentMethod = (paymentMode) => {
  const mode = typeof paymentMode === 'string' ? paymentMode.toUpperCase() : ''
  if (mode === 'SPLIT') return 'MIXED'
  if (['CASH', 'UPI', 'CARD', 'MIXED'].includes(mode)) return mode
  return 'CASH'
}

const normalizeIssueItems = (pricedItems = [], rawItems = []) => {
  const source = Array.isArray(pricedItems) && pricedItems.length ? pricedItems : rawItems
  if (!Array.isArray(source)) return []

  return source
    .map((item) => {
      const quantity = Math.max(0, Number(item?.quantity ?? item?.qty ?? 0) || 0)
      const unitPriceRaw = Number(item?.unitPrice ?? item?.price ?? 0)
      const unitPrice = Number.isFinite(unitPriceRaw) && unitPriceRaw >= 0 ? unitPriceRaw : 0
      const subtotalRaw = Number(item?.amount ?? unitPrice * quantity) || 0
      const subtotal = subtotalRaw >= 0 ? subtotalRaw : 0
      return {
        category: item?.category || item?.categoryName || item?.categoryCode || 'Ticket',
        subType: item?.subType || item?.label || item?.itemLabel || item?.itemCode || 'Item',
        label: item?.label || item?.itemLabel || item?.subType || item?.itemCode || '',
        unitPrice,
        quantity,
        subtotal,
      }
    })
    .filter((it) => Number.isFinite(it.quantity))
}

const recordTicketIssue = async ({ ticket, pricedItems, payload }) => {
  const items = normalizeIssueItems(pricedItems, payload.items || payload.selectedItems)
  const totalQuantity = items.reduce((sum, it) => sum + Number(it.quantity || 0), 0)

  const doc = {
    issueId: ticket.ticketId,
    counterCode: payload.counterCode || payload.counterName || payload.counterId || payload.counter,
    counterName: payload.counterName || payload.counterCode,
    issuedAt: ticket.issueDate || new Date(),
    items,
    totalQuantity,
    totalAmount: Number(ticket.totalAmount || 0),
    paymentMethod: toIssuePaymentMethod(ticket.paymentMode),
    status: 'ISSUED',
    remarks: payload.remarks || payload.notes || payload.comment || payload.note,
  }

  // Persist without blocking issuance; log and continue on error
  try {
    await TicketIssue.createSafe(doc)
  } catch (err) {
    console.error('Failed to record ticket issue', err?.message || err)
  }
}

export const createCounterBooking = async (payload = {}) => {
  const visitDate = payload.visitDate ?? todayIsoDate()
  const paymentMode = typeof payload.paymentMode === 'string' ? payload.paymentMode.toUpperCase() : 'CASH'
  assertPaymentModeAllowed(paymentMode)
  assertCounterPaymentMode(paymentMode)

  const paymentBreakup = normalisePaymentBreakup(paymentMode, payload)

  if (payload.ticketSource && payload.ticketSource.toString().toUpperCase() === 'ONLINE') {
    throw ApiError.badRequest('Counter API does not accept online booking payloads.')
  }

  const items = sanitizeCounterItems(payload.selectedItems ?? payload.items)
  if (!items.length) {
    throw ApiError.badRequest('At least one item with quantity greater than zero is required for counter booking.')
  }

  const issuedBy = typeof payload.issuedBy === 'string' && payload.issuedBy.trim() ? payload.issuedBy.trim() : 'COUNTER'

  const bookingPayload = {
    ...payload,
    visitDate,
    paymentMode,
    paymentStatus: 'PAID',
    ticketSource: 'COUNTER',
    bookingType: 'WALKIN',
    paymentBreakup,
    items,
    selectedItems: undefined,
    // Counter flow omits visitor details; use neutral placeholders to satisfy existing validation
    visitorName: payload.visitorName || issuedBy,
    visitorMobile: payload.visitorMobile || '0000000000',
    visitorEmail: payload.visitorEmail || '',
  }

  const { ticket, qrImage, visitDateIso, totalAmount, pricedItems } = await createBooking(bookingPayload)

  await assertCounterTicketIntegrity({
    ticket,
    pricedItems,
    expectedItemCount: items.length,
    expectedTotal: totalAmount,
  })

  if (!Number.isFinite(totalAmount) || totalAmount < 0) {
    await Ticket.deleteOne({ _id: ticket._id })
    throw ApiError.badRequest('Counter ticket total is invalid.')
  }

  const isFreeTicket = Number.isFinite(totalAmount) && totalAmount === 0

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
    const cash = Number(paymentBreakup.cash || 0)
    const upi = Number(paymentBreakup.upi || 0)

    if (!isFreeTicket) {
      if (cash <= 0 || upi <= 0) {
        await Ticket.deleteOne({ _id: ticket._id })
        throw ApiError.badRequest('Split payment requires both cash and UPI amounts.')
      }
    }

    if (!isAmountEqual(cash + upi, totalAmount)) {
      await Ticket.deleteOne({ _id: ticket._id })
      throw ApiError.badRequest('Cash + UPI amount must equal the total amount.')
    }
  }

  await recordTicketIssue({ ticket, pricedItems, payload })

  return {
    ticket,
    qrImage,
    totalAmount,
    visitDateIso,
    pricedItems,
    paymentBreakup,
    issuedBy: bookingPayload.visitorName,
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
    .select('ticketId visitDate issueDate totalAmount paymentMode paymentStatus ticketSource paymentBreakup qrUsed qrUsedAt items visitorName')
    .sort({ issueDate: -1 })
    .limit(50)
    .lean()
    .then((tickets) => tickets.map(presentCounterTicket))
}

export const getCounterHistory = async ({ date, paymentMode, page = 1, limit = 100 } = {}) => {
  const match = { ticketSource: 'COUNTER' }

  if (typeof paymentMode === 'string' && paymentMode.toUpperCase() !== 'ALL') {
    match.paymentMode = paymentMode.toUpperCase()
  }

  const normalizedPage = Math.max(1, parseInt(page, 10) || 1)
  const normalizedLimit = Math.min(200, Math.max(1, parseInt(limit, 10) || 100))
  const skip = (normalizedPage - 1) * normalizedLimit

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

  const query = Ticket.find(match)
    .select('ticketId visitDate issueDate totalAmount paymentMode paymentStatus ticketSource paymentBreakup qrUsed qrUsedAt items visitorName')
    .sort({ issueDate: -1 })
    .skip(skip)
    .limit(normalizedLimit)
    .lean()

  const [tickets, total] = await Promise.all([query, Ticket.countDocuments(match)])

  return {
    tickets: tickets.map(presentCounterTicket),
    pagination: {
      page: normalizedPage,
      limit: normalizedLimit,
      total,
      hasNext: skip + tickets.length < total,
    },
  }
}

export const findCounterTicketsMissingItems = async ({ limit = 100 } = {}) => {
  // Find counter tickets where `items` is missing or empty to help ops identify legacy records.
  const match = {
    ticketSource: 'COUNTER',
    $or: [{ items: { $exists: false } }, { items: { $size: 0 } }, { items: null }],
  }

  return Ticket.find(match)
    .select('ticketId visitDate issueDate totalAmount paymentMode paymentStatus visitorName')
    .sort({ issueDate: -1 })
    .limit(Math.min(1000, Number(limit) || 100))
    .lean()
}

export const getCounterPricing = async () => {
  const pricingMap = await loadActivePricingMap()
  return typeof pricingMap.values === 'function' ? Array.from(pricingMap.values()) : Object.values(pricingMap)
}
