import crypto from 'crypto'
import mongoose from 'mongoose'
import { Ticket } from '../models/Ticket.js'
import { Booking } from '../models/Booking.js'
import { ApiError } from '../utils/errors.js'
import { assertPaymentModeAllowed, coerceQuantity, validateQuantity } from '../utils/pricing.js'
import { assertVisitDateBounds, normaliseVisitDate } from '../utils/dates.js'
import { assertOnlineBookingDateOpen } from './bookingDayOverrideService.js'
import { generateQrToken, generateVerificationToken, hashVerificationToken } from '../utils/qr.js'
import { loadActivePricingMap, resolveCategoryCodeForItem } from './pricingService.js'
import { normaliseVisitorDetails } from '../utils/validation.js'
import { generateQrDataUrl } from '../utils/qrImage.js'

const BOOKING_FLOW_STATE = {
  OTP_PENDING: 'OTP_PENDING',
  COMPLETED: 'COMPLETED',
}

const TICKET_ID_PATTERN = /^KZP-[0-9]{6}-[A-Z0-9]{6}$/

const verificationFlowStateByTokenHash = new Map()

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
  console.info('[booking] create_booking_requested')

  const visitDateInput = payload.visitDate
  const paymentMode = typeof payload.paymentMode === 'string' ? payload.paymentMode.toUpperCase() : 'ONLINE'
  const paymentStatus = typeof payload.paymentStatus === 'string' ? payload.paymentStatus.toUpperCase() : 'PAID'
  const requestItems = payload.selectedItems ?? payload.items ?? []
  const ticketSourceInput = typeof payload.ticketSource === 'string' ? payload.ticketSource.toUpperCase() : 'ONLINE'
  const ticketSource = ticketSourceInput === 'COUNTER' ? 'COUNTER' : 'ONLINE'
  const paymentBreakup = normalisePaymentBreakup(payload.paymentBreakup)

  const { isoDate: visitDateIso, dateOnly: visitDate } = normaliseVisitDate(visitDateInput)
  assertVisitDateBounds(visitDateIso, { enforceTuesdayClosure: ticketSource !== 'ONLINE' })
  if (ticketSource === 'ONLINE') {
    await assertOnlineBookingDateOpen(visitDateIso)
  }
  assertPaymentModeAllowed(paymentMode)

  // Backend owns validation and pricing; client sends minimal item details (code/name/qty)
  const pricingMap = await loadActivePricingMap({ includeCounterOnly: ticketSource === 'COUNTER' })

  let totalAmount = 0
  const resolvedItems = []

  for (const item of requestItems) {
    const itemCode = typeof item?.itemCode === 'string' ? item.itemCode.trim() : ''
    const categoryCode = resolveCategoryCodeForItem(itemCode, pricingMap)

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

  console.info('[booking] totals', {
    backendTotal: totalAmount,
    itemsCount: resolvedItems.length,
  })

  const ticketId = await allocateTicketId(payload.ticketId)

  // QR token remains opaque to clients; stored server-side and never derived from client input
  const qrToken = generateQrToken()
  const verificationToken = generateVerificationToken()
  const verificationTokenHash = hashVerificationToken(verificationToken)
  verificationFlowStateByTokenHash.set(verificationTokenHash, BOOKING_FLOW_STATE.OTP_PENDING)

  const visitor = normaliseVisitorDetails({
    name: payload.visitorName,
    email: payload.visitorEmail,
    mobile: payload.visitorMobile,
  })

  try {
    const ticketResults = await Ticket.create([{
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
    }])
    const ticket = ticketResults[0]

    // Ensure a parent booking exists for all tickets
    const bookingId = payload.bookingId || ticketId
    const bookingType = ticketSource === 'ONLINE' ? 'PREBOOK' : 'WALKIN'

    const bookingResults = await Booking.create([{
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
      status: payload.status || 'CONFIRMED',
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
    }])
    const bookingDoc = bookingResults[0]

    // Backfill ticket with booking linkage for reporting
    await Ticket.updateOne(
      { _id: ticket._id },
      { $set: { bookingRef: bookingDoc._id, bookingId: bookingId } }
    )

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
  } catch (error) {
    console.error('[booking] createBooking FAILED', error)
    throw error
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


const DEFAULT_VERIFICATION_TOKEN_TTL_MINUTES = 30

const resolveVerificationTokenTtlMs = () => {
  const configuredMinutes = Number.parseInt(process.env.TICKET_VERIFICATION_TOKEN_TTL_MINUTES ?? '', 10)
  const minutes = Number.isFinite(configuredMinutes) && configuredMinutes > 0
    ? configuredMinutes
    : DEFAULT_VERIFICATION_TOKEN_TTL_MINUTES
  return minutes * 60 * 1000
}

const constantTimeHexCompare = (leftHex, rightHex) => {
  if (typeof leftHex !== 'string' || typeof rightHex !== 'string') return false
  if (leftHex.length !== rightHex.length) return false

  try {
    const leftBuffer = Buffer.from(leftHex, 'hex')
    const rightBuffer = Buffer.from(rightHex, 'hex')
    if (leftBuffer.length !== rightBuffer.length || leftBuffer.length === 0) return false
    return crypto.timingSafeEqual(leftBuffer, rightBuffer)
  } catch {
    return false
  }
}

const isVerificationTokenExpired = (ticket) => {
  const issuedAtValue = ticket?.createdAt ?? ticket?.issueDate
  if (!issuedAtValue) return false

  const issuedAt = issuedAtValue instanceof Date ? issuedAtValue : new Date(issuedAtValue)
  if (Number.isNaN(issuedAt.getTime())) return false

  const expiresAt = issuedAt.getTime() + resolveVerificationTokenTtlMs()
  return Date.now() > expiresAt
}

const logTicketAccessAttempt = ({ ticketId, status, reason, accessContext, allowTokenBypass }) => {
  const ip = accessContext?.ip || 'unknown'
  const userAgent = accessContext?.userAgent || 'unknown'
  console.info('[ticket-access]', {
    ticketId,
    status,
    reason,
    bypass: Boolean(allowTokenBypass),
    ip,
    userAgent,
    at: new Date().toISOString(),
  })
}

export const getTicketForDisplay = async (ticketId, { verificationToken, allowTokenBypass = false, accessContext } = {}) => {
  if (!ticketId || typeof ticketId !== 'string' || !TICKET_ID_PATTERN.test(ticketId)) {
    throw ApiError.badRequest('Ticket ID is invalid.')
  }

  const ticket = await Ticket.findOne({ ticketId })
    .select('ticketId visitDate issueDate createdAt paymentMode paymentStatus ticketSource paymentBreakup items totalAmount visitorName visitorMobile qrToken verificationTokenHash')
    .lean()

  if (!ticket) {
    throw ApiError.notFound('Ticket not found.')
  }

  // --- Post-Audit Fix: Block QR visibility for pending/failed payments ---
  if (!['PAID', 'SUCCESS'].includes(ticket.paymentStatus)) {
    throw ApiError.forbidden('Ticket is not yet confirmed. QR is not available.')
  }

  // Enforce verification token if stored.
  if (ticket.verificationTokenHash && !allowTokenBypass) {
    if (!verificationToken) {
      logTicketAccessAttempt({
        ticketId,
        status: 'denied',
        reason: 'missing_token',
        accessContext,
        allowTokenBypass,
      })
      throw ApiError.forbidden('Invalid ticket link.')
    }

    if (isVerificationTokenExpired(ticket)) {
      logTicketAccessAttempt({
        ticketId,
        status: 'denied',
        reason: 'expired_token',
        accessContext,
        allowTokenBypass,
      })
      throw ApiError.forbidden('Session expired. Please rebook or contact support.')
    }

    const incomingHash = hashVerificationToken(verificationToken)
    if (!constantTimeHexCompare(incomingHash, ticket.verificationTokenHash)) {
      logTicketAccessAttempt({
        ticketId,
        status: 'denied',
        reason: 'token_mismatch',
        accessContext,
        allowTokenBypass,
      })
      throw ApiError.forbidden('Invalid ticket link.')
    }

    const tokenFlowState = verificationFlowStateByTokenHash.get(ticket.verificationTokenHash) ?? BOOKING_FLOW_STATE.OTP_PENDING
    if (tokenFlowState !== BOOKING_FLOW_STATE.OTP_PENDING) {
      logTicketAccessAttempt({
        ticketId,
        status: 'denied',
        reason: 'token_reuse_blocked',
        accessContext,
        allowTokenBypass,
      })
      throw ApiError.forbidden('Invalid ticket link.')
    }

    verificationFlowStateByTokenHash.set(ticket.verificationTokenHash, BOOKING_FLOW_STATE.COMPLETED)

    // Soft one-time-access fallback: access is allowed, but every successful token validation is logged.
    logTicketAccessAttempt({
      ticketId,
      status: 'allowed',
      reason: 'validated_token',
      accessContext,
      allowTokenBypass,
    })
  } else {
    logTicketAccessAttempt({
      ticketId,
      status: 'allowed',
      reason: allowTokenBypass ? 'admin_bypass' : 'legacy_no_token_hash',
      accessContext,
      allowTokenBypass,
    })
  }

  let qrImage
  try {
    qrImage = await generateQrDataUrl(ticket.qrToken)
  } catch (error) {
    // Log server-side for operators; do not leak token or stack traces to clients
    console.error('Failed to generate QR image for ticket', { ticketId, reason: error?.message })
    throw ApiError.internal('Unable to generate QR image for this ticket.')
  }

  const ticketCount = Array.isArray(ticket.items)
    ? ticket.items.reduce((sum, item) => sum + Number(item?.quantity || 0), 0)
    : 0

  return {
    ticketId: ticket.ticketId,
    visitDate: ticket.visitDate instanceof Date ? ticket.visitDate.toISOString().slice(0, 10) : ticket.visitDate,
    issueDate: ticket.issueDate instanceof Date ? ticket.issueDate.toISOString() : ticket.issueDate,
    bookedAt: ticket.createdAt instanceof Date ? ticket.createdAt.toISOString() : ticket.createdAt,
    paymentMode: ticket.paymentMode,
    paymentStatus: ticket.paymentStatus,
    ticketSource: ticket.ticketSource || 'ONLINE',
    paymentBreakup: ticket.paymentBreakup,
    visitorName: ticket.visitorName,
    visitorMobile: ticket.visitorMobile,
    ticketCount,
    items: ticket.items,
    totalAmount: ticket.totalAmount,
    qrImage,
  }
}
