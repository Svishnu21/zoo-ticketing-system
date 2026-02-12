import crypto from 'crypto'
import { Ticket } from '../models/Ticket.js'
import { Booking } from '../models/Booking.js'
import { ApiError } from '../utils/errors.js'
import { assertPaymentModeAllowed, coerceQuantity, validateQuantity } from '../utils/pricing.js'
import { assertVisitDateBounds, normaliseVisitDate } from '../utils/dates.js'
import { generateQrToken, generateVerificationToken, hashVerificationToken } from '../utils/qr.js'
import { loadActivePricingMap, resolveCategoryCodeForItem } from './pricingService.js'
import { normaliseVisitorDetails } from '../utils/validation.js'
import { generateQrDataUrl } from '../utils/qrImage.js'

const formatTicketDate = (date) => {
  const dd = String(date.getUTCDate()).padStart(2, '0')
  const mm = String(date.getUTCMonth() + 1).padStart(2, '0')
  const yy = String(date.getUTCFullYear()).slice(-2)
  return `${dd}${mm}${yy}`
}

const generateTicketId = (now = new Date()) => {
  // Embeds issue date for traceability while keeping randomness non-sequential
  const datePart = formatTicketDate(now)
  const randomPart = crypto.randomBytes(3).toString('hex').toUpperCase() // 6 hex chars, 24 bits entropy
  return `KZP-${datePart}-${randomPart}`
}

const allocateTicketId = async (requestedId) => {
  if (requestedId) {
    const exists = await Ticket.exists({ ticketId: requestedId })
    if (exists) {
      throw ApiError.conflict('Ticket ID already exists. Please try again.')
    }
    return requestedId
  }

  // Avoid sequential IDs to prevent guessing; retry a few times to handle rare collisions
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const candidate = generateTicketId()
    const exists = await Ticket.exists({ ticketId: candidate })
    if (!exists) return candidate
  }
  throw ApiError.internal('Unable to allocate a ticket ID. Please retry.')
}

const normalisePaymentBreakup = (value) => {
  if (!value) return undefined
  const cash = Number(value.cash) || 0
  const upi = Number(value.upi) || 0

  if (cash < 0 || upi < 0) {
    throw ApiError.badRequest('Payment breakup values cannot be negative.')
  }

  return { cash, upi }
}

export const createBooking = async (payload = {}) => {
  console.log('[booking] incoming payload', payload)

  const visitDateInput = payload.visitDate
  const paymentMode = typeof payload.paymentMode === 'string' ? payload.paymentMode.toUpperCase() : 'ONLINE'
  const paymentStatus = typeof payload.paymentStatus === 'string' ? payload.paymentStatus.toUpperCase() : 'PAID'
  const requestItems = payload.selectedItems ?? payload.items ?? []
  const ticketSourceInput = typeof payload.ticketSource === 'string' ? payload.ticketSource.toUpperCase() : 'ONLINE'
  const ticketSource = ticketSourceInput === 'COUNTER' ? 'COUNTER' : 'ONLINE'
  const paymentBreakup = normalisePaymentBreakup(payload.paymentBreakup)

  const { isoDate: visitDateIso, dateOnly: visitDate } = normaliseVisitDate(visitDateInput)
  assertVisitDateBounds(visitDateIso)
  assertPaymentModeAllowed(paymentMode)

  // Backend owns validation and pricing; client sends minimal item details (code/name/qty)
  const pricingMap = await loadActivePricingMap()

  let totalAmount = 0
  const resolvedItems = []

  for (const item of requestItems) {
    const itemCode = typeof item?.itemCode === 'string' ? item.itemCode.trim() : ''
    const categoryCode = resolveCategoryCodeForItem(itemCode, pricingMap)

    console.log('ITEM CODE:', itemCode)
    console.log('MAPPED CATEGORY:', categoryCode)
    console.log('AVAILABLE PRICING KEYS:', typeof pricingMap.keys === 'function' ? Array.from(pricingMap.keys()) : Object.keys(pricingMap))

    const isFreeCategory = categoryCode === 'differentlyAbled' || categoryCode === 'childBelow5'
    const pricing = typeof pricingMap.get === 'function' ? pricingMap.get(categoryCode) : pricingMap[categoryCode]

    if (!pricing && !isFreeCategory) {
      throw ApiError.badRequest(`Ticket pricing not configured for ${categoryCode}`)
    }

    const unitPrice = isFreeCategory ? 0 : pricing.price
    if (typeof unitPrice !== 'number') {
      throw ApiError.internal(`Invalid price value for ${categoryCode}`)
    }

    const quantity = coerceQuantity(item?.quantity ?? item?.qty)
    validateQuantity(quantity, categoryCode)

    const lineTotal = unitPrice * quantity

    resolvedItems.push({
      ...item,
      itemCode,
      categoryCode,
      category: pricing?.category ?? 'zoo',
      itemLabel: pricing?.label ?? item?.itemLabel ?? itemCode,
      unitPrice,
      amount: lineTotal,
      quantity,
    })

    totalAmount += lineTotal
  }

  const primaryItem = resolvedItems[0]
  const quantityTotal = resolvedItems.reduce((sum, current) => sum + Number(current?.quantity || 0), 0)

  if (resolvedItems.length === 0) {
    throw ApiError.badRequest('At least one ticket item with quantity greater than zero is required.')
  }

  console.log('[booking] totals', {
    backendTotal: totalAmount,
    itemsCount: resolvedItems.length,
  })

  const ticketId = await allocateTicketId(payload.ticketId)

  // QR token remains opaque to clients; stored server-side and never derived from client input
  const qrToken = generateQrToken()
  const verificationToken = generateVerificationToken()
  const verificationTokenHash = hashVerificationToken(verificationToken)

  const visitor = normaliseVisitorDetails({
    name: payload.visitorName,
    email: payload.visitorEmail,
    mobile: payload.visitorMobile,
  })

  const ticket = await Ticket.create({
    ticketId,
    visitDate,
    issueDate: new Date(),
    paymentMode,
    paymentStatus,
    ticketSource,
    paymentBreakup,
    items: resolvedItems,
    ticketCategory: primaryItem?.itemCode || primaryItem?.categoryCode || 'MIXED',
    quantity: quantityTotal,
    unitPrice: primaryItem?.unitPrice,
    lineTotal: totalAmount,
    totalAmount,
    qrToken,
    verificationTokenHash,
    qrUsed: false,
    qrUsedAt: undefined,
    visitorName: visitor.visitorName,
    visitorEmail: visitor.visitorEmail,
    visitorMobile: visitor.visitorMobile,
  })

  // Ensure a parent booking exists for all tickets
  const bookingId = payload.bookingId || ticketId
  const bookingType = ticketSource === 'ONLINE' ? 'PREBOOK' : 'WALKIN'

  const bookingDoc = await Booking.create({
    bookingId,
    bookingCode: bookingId,
    ticketSource,
    bookingType,
    issuedAt: new Date(),
    issuedBy: payload.issuedBy,
    visitDate,
    totalAmount,
    paymentStatus,
    paymentMode,
    status: 'CONFIRMED',
    entryStatus: 'NOT_ENTERED',
    items: resolvedItems.map((item) => ({
      itemCode: item.itemCode,
      ticketPricingId: item.ticketPricingId,
      label: item.itemLabel || item.label,
      unitPrice: item.unitPrice,
      quantity: item.quantity,
      lineTotal: item.amount,
    })),
    tickets: [ticket._id],
    customerName: visitor.visitorName,
    customerEmail: visitor.visitorEmail,
    customerPhone: visitor.visitorMobile,
    visitorName: visitor.visitorName,
    visitorEmail: visitor.visitorEmail,
    visitorMobile: visitor.visitorMobile,
    isActive: true,
  })

  // Backfill ticket with booking linkage for reporting
  ticket.bookingRef = bookingDoc._id
  ticket.bookingId = bookingId
  await ticket.save()

  const qrImage = await generateQrDataUrl(qrToken)

  return {
    ticket,
    booking: bookingDoc,
    qrImage,
    verificationToken,
    totalAmount,
    visitDateIso,
    pricedItems: resolvedItems,
  }
}

export const getTicketSummary = async (ticketId) => {
  const ticket = await Ticket.findOne({
    $or: [{ _id: ticketId }, { ticketId }],
  })
    .select('-qrToken')
    .lean()

  if (!ticket) {
    throw ApiError.notFound('Ticket not found.')
  }

  return ticket
}

const TICKET_ID_PATTERN = /^KZP-[0-9]{6}-[A-Z0-9]{6}$/

export const getTicketForDisplay = async (ticketId, { verificationToken } = {}) => {
  if (!ticketId || typeof ticketId !== 'string' || !TICKET_ID_PATTERN.test(ticketId)) {
    throw ApiError.badRequest('Ticket ID is invalid.')
  }

  const ticket = await Ticket.findOne({ ticketId })
    .select('ticketId visitDate issueDate paymentMode paymentStatus ticketSource paymentBreakup items totalAmount qrToken verificationTokenHash')
    .lean()

  if (!ticket) {
    throw ApiError.notFound('Ticket not found.')
  }
  // Debug logs for tracing why QR might not render
  console.log('Ticket found in DB for display:', !!ticket)
  console.log('QR token (server-side only):', ticket.qrToken)

  // Enforce verification token if stored
  if (ticket.verificationTokenHash) {
    if (!verificationToken) {
      throw ApiError.unauthorized('Verification token is required for this ticket.')
    }
    const incomingHash = hashVerificationToken(verificationToken)
    if (incomingHash !== ticket.verificationTokenHash) {
      throw ApiError.unauthorized('Invalid verification token.')
    }
  }

  let qrImage
  try {
    qrImage = await generateQrDataUrl(ticket.qrToken)
    console.log('QR image generated:', typeof qrImage === 'string' && qrImage.startsWith('data:image'))
  } catch (error) {
    // Log server-side for operators; do not leak token or stack traces to clients
    console.error('Failed to generate QR image for ticket', { ticketId, reason: error?.message })
    throw ApiError.internal('Unable to generate QR image for this ticket.')
  }

  return {
    ticketId: ticket.ticketId,
    visitDate: ticket.visitDate instanceof Date ? ticket.visitDate.toISOString().slice(0, 10) : ticket.visitDate,
    issueDate: ticket.issueDate instanceof Date ? ticket.issueDate.toISOString() : ticket.issueDate,
    paymentMode: ticket.paymentMode,
    paymentStatus: ticket.paymentStatus,
    ticketSource: ticket.ticketSource || 'ONLINE',
    paymentBreakup: ticket.paymentBreakup,
    items: ticket.items,
    totalAmount: ticket.totalAmount,
    qrImage,
  }
}
