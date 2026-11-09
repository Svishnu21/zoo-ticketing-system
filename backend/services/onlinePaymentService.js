// ---------------------------------------------------------------------------
// Online payment lifecycle service (ONLINE bookings only — counter flow does not use this file)
// ---------------------------------------------------------------------------
//
//   OTP verified ──► Proceed ──► prepareOnlineBookingAttempt()  Booking: PENDING (no ticket, no QR)
//                                        │
//                         gateway link?  ├── no ──► markInitiationFailed()   Booking: INITIATION_FAILED
//                                        │
//                                        └── yes ─► customer pays on Easebuzz
//                                                      │
//        hash-verified failure callback ◄──────────────┤
//        markOnlinePaymentFailed()   Booking: FAILED   │
//                                                      ▼
//                       hash-verified success callback / Retrieve API
//                       confirmOnlinePayment()
//                          ├── txnid + amount + booking reference match?  no ─► RECOVERY_REQUIRED (manual review)
//                          └── issueTicketForConfirmedBooking()
//                                 ├── ok ──► Booking: CONFIRMED, exactly one Ticket (SUCCESS) + QR
//                                 └── error ► Booking: RECOVERY_REQUIRED (payment kept as SUCCESS;
//                                             re-running issuance is safe and never duplicates)
//
// Only CONFIRMED bookings have tickets, so only they reach admin bookings, dashboard and reports.
// ---------------------------------------------------------------------------

import { Booking } from '../models/Booking.js'
import { Payment } from '../models/Payment.js'
import { Ticket } from '../models/Ticket.js'
import { ApiError } from '../utils/errors.js'
import { assertPaymentModeAllowed, coerceQuantity, validateQuantity } from '../utils/pricing.js'
import { assertVisitDateBounds, normaliseVisitDate } from '../utils/dates.js'
import { generateQrToken, generateVerificationToken, hashVerificationToken } from '../utils/qr.js'
import { normaliseVisitorDetails } from '../utils/validation.js'
import { assertOnlineBookingDateOpen } from './bookingDayOverrideService.js'
import { loadActivePricingMap, resolveCategoryCodeForItem } from './pricingService.js'
import { generateTicketId } from './bookingService.js'

export const ONLINE_BOOKING_STATUS = Object.freeze({
  PENDING: 'PENDING',
  INITIATION_FAILED: 'INITIATION_FAILED',
  FAILED: 'FAILED',
  CONFIRMED: 'CONFIRMED',
  RECOVERY_REQUIRED: 'RECOVERY_REQUIRED',
})

export const PAID_STATUSES = Object.freeze(['PAID', 'SUCCESS'])

// Easebuzz statuses that mean the customer was NOT charged. Anything else that is not
// "success" (e.g. "pending", "initiated") leaves the attempt PENDING.
export const GATEWAY_FAILURE_STATUSES = Object.freeze(['failure', 'failed', 'usercancelled', 'dropped', 'bounced'])

const isPaidStatus = (value) => PAID_STATUSES.includes(String(value || '').toUpperCase())

const truncate = (value, max = 300) => {
  const str = String(value ?? '').trim()
  return str.length > max ? `${str.slice(0, max)}…` : str
}

const ATTEMPT_KEY_PATTERN = /^[A-Za-z0-9_-]{16,64}$/
// Same format as bookingService ticket IDs (KZP-DDMMYY-XXXXXX)
const TICKET_ID_PATTERN = /^KZP-[0-9]{6}-[A-Z0-9]{6}$/

export const normaliseAttemptKey = (value) => {
  if (value === undefined || value === null || value === '') return undefined
  const key = String(value).trim()
  if (!ATTEMPT_KEY_PATTERN.test(key)) {
    throw ApiError.badRequest('Invalid payment attempt reference.')
  }
  return key
}

const inferCategoryFromCode = (itemCode) => {
  const code = String(itemCode || '').toLowerCase()
  if (code.startsWith('parking')) return 'parking'
  if (code.startsWith('battery') || code.startsWith('transport')) return 'transport'
  if (code.startsWith('camera')) return 'camera'
  return 'zoo'
}

// ---------------------------------------------------------------------------
// Pricing — mirrors createBooking() for ONLINE tickets (createBooking is left untouched
// because the counter flow depends on it). Prices always come from the backend tariff table.
// ---------------------------------------------------------------------------
const resolveOnlineItems = async (requestItems = []) => {
  const pricingMap = await loadActivePricingMap({ includeCounterOnly: false })

  let totalAmount = 0
  const resolvedItems = []

  for (const item of Array.isArray(requestItems) ? requestItems : []) {
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
    const clientLabel = typeof item?.label === 'string' ? item.label : item?.itemLabel

    resolvedItems.push({
      itemCode,
      categoryCode,
      category: pricing?.category ?? 'zoo',
      label: pricing?.label ?? clientLabel ?? itemCode,
      // ticketPricingId is intentionally not stored: built-in tariffs have synthetic string ids
      // (e.g. "protected-zoo_adult"), and createBooking() does not store it either.
      unitPrice,
      quantity,
      lineTotal,
    })

    totalAmount += lineTotal
  }

  if (resolvedItems.length === 0) {
    throw ApiError.badRequest('At least one ticket item with quantity greater than zero is required.')
  }

  return { resolvedItems, totalAmount }
}

// The online booking ID doubles as the future ticket ID (same KZP-DDMMYY-XXXXXX format as before),
// reserved now so that ticket issuance after payment is idempotent on the unique ticketId index.
const allocateOnlineBookingId = async () => {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const candidate = generateTicketId()
    const [ticketExists, bookingExists] = await Promise.all([
      Ticket.exists({ ticketId: candidate }),
      Booking.exists({ bookingId: candidate }),
    ])
    if (!ticketExists && !bookingExists) return candidate
  }
  throw ApiError.internal('Unable to allocate a booking reference. Please retry.')
}

// ---------------------------------------------------------------------------
// 1. Payment initiation — creates a PENDING booking attempt. No ticket, no QR.
// ---------------------------------------------------------------------------
export const prepareOnlineBookingAttempt = async ({
  customerName,
  customerEmail,
  customerPhone,
  visitDate: visitDateInput,
  items,
  attemptKey,
}) => {
  const { isoDate: visitDateIso, dateOnly: visitDate } = normaliseVisitDate(visitDateInput)
  assertVisitDateBounds(visitDateIso, { enforceTuesdayClosure: false })
  await assertOnlineBookingDateOpen(visitDateIso)
  assertPaymentModeAllowed('ONLINE')

  const { resolvedItems, totalAmount } = await resolveOnlineItems(items)

  const visitor = normaliseVisitorDetails({
    name: customerName,
    email: customerEmail,
    mobile: customerPhone,
  })

  const bookingId = await allocateOnlineBookingId()

  const booking = await Booking.create({
    bookingId,
    bookingCode: bookingId,
    ticketSource: 'ONLINE',
    bookingType: 'PREBOOK',
    source: 'ONLINE',
    issuedAt: new Date(),
    visitDate,
    totalAmount,
    paymentStatus: 'PENDING',
    paymentMode: 'ONLINE',
    status: ONLINE_BOOKING_STATUS.PENDING,
    entryStatus: 'NOT_ENTERED',
    items: resolvedItems,
    tickets: [],
    customerName: visitor.visitorName,
    customerEmail: visitor.visitorEmail,
    customerPhone: visitor.visitorMobile,
    visitorName: visitor.visitorName,
    visitorEmail: visitor.visitorEmail,
    visitorMobile: visitor.visitorMobile,
    isActive: true,
    ...(attemptKey ? { paymentAttemptKey: attemptKey } : {}),
  })

  return { booking, totalAmount, visitDateIso }
}

// ---------------------------------------------------------------------------
// 2. Gateway did not return a payment link — the customer could not pay.
// ---------------------------------------------------------------------------
export const markInitiationFailed = async ({ bookingId, paymentId, reason }) => {
  const failureReason = `INITIATION_FAILED: ${truncate(reason) || 'Payment gateway did not return a payment URL.'}`
  const now = new Date()

  if (paymentId) {
    await Payment.updateOne(
      { _id: paymentId, status: 'PENDING' },
      { $set: { status: 'INITIATION_FAILED', failureReason, completedAt: now } },
    )
  }

  if (bookingId) {
    await Booking.updateOne(
      { _id: bookingId, status: ONLINE_BOOKING_STATUS.PENDING },
      { $set: { status: ONLINE_BOOKING_STATUS.INITIATION_FAILED, paymentStatus: 'FAILED', statusReason: failureReason } },
    )
  }
}

// ---------------------------------------------------------------------------
// 3. Ticket issuance — idempotent; safe to call any number of times for a paid booking.
// ---------------------------------------------------------------------------
const buildTicketItems = (bookingItems = []) =>
  bookingItems.map((item) => ({
    itemCode: item.itemCode,
    itemLabel: item.label || item.itemCode,
    category: item.category || inferCategoryFromCode(item.itemCode),
    quantity: item.quantity,
    unitPrice: item.unitPrice,
    amount: item.lineTotal,
    ticketPricingId: item.ticketPricingId,
  }))

const markBookingConfirmed = async (bookingObjectId, ticketObjectId) => {
  await Booking.updateOne(
    { _id: bookingObjectId },
    {
      ...(ticketObjectId ? { $addToSet: { tickets: ticketObjectId } } : {}),
      $set: { status: ONLINE_BOOKING_STATUS.CONFIRMED, paymentStatus: 'SUCCESS', confirmedAt: new Date() },
      $unset: { statusReason: 1 },
    },
  )
}

export const issueTicketForConfirmedBooking = async (bookingObjectId) => {
  const booking = await Booking.findById(bookingObjectId)
  if (!booking) throw ApiError.notFound('Booking not found for ticket issuance.')
  if (booking.ticketSource !== 'ONLINE') throw ApiError.badRequest('Only online bookings can be issued here.')
  if (!isPaidStatus(booking.paymentStatus)) {
    throw ApiError.conflict('Payment is not verified for this booking; ticket cannot be issued.')
  }

  // Bookings created before this release already have a ticket document (created at initiation).
  // Reuse it — never create a second ticket.
  if (Array.isArray(booking.tickets) && booking.tickets.length > 0) {
    await Ticket.updateMany(
      { _id: { $in: booking.tickets }, paymentStatus: { $nin: PAID_STATUSES } },
      { $set: { paymentStatus: 'SUCCESS', paymentMode: 'ONLINE' } },
    )
    if (booking.status !== ONLINE_BOOKING_STATUS.CONFIRMED) await markBookingConfirmed(booking._id)
    const ticket = await Ticket.findById(booking.tickets[0]).lean()
    return { ticket, created: false }
  }

  // New bookings reserve their ticket ID at initiation (ticketId === bookingId) and ticketId is unique,
  // so concurrent success callbacks / webhooks can never produce two tickets for one booking.
  // Older bookings with a legacy reference (e.g. ZOO-YYYYMMDD-XXXX) get a fresh KZP ticket ID, guarded
  // by an atomic per-booking lock instead.
  const reservedTicketId = TICKET_ID_PATTERN.test(booking.bookingId) ? booking.bookingId : null
  let ticket = await Ticket.findOne(reservedTicketId ? { ticketId: reservedTicketId } : { bookingRef: booking._id }).lean()
  let created = false
  let heldLegacyLock = false

  if (!ticket) {
    let ticketId = reservedTicketId
    if (!ticketId) {
      const locked = await Booking.findOneAndUpdate(
        { _id: booking._id, ticketIssueLockedAt: { $exists: false } },
        { $set: { ticketIssueLockedAt: new Date() } },
      )
      if (!locked) {
        ticket = await Ticket.findOne({ bookingRef: booking._id }).lean()
        if (!ticket) throw ApiError.conflict('Ticket issuance is already in progress for this booking.')
      } else {
        heldLegacyLock = true
        ticketId = await allocateOnlineBookingId()
      }
    }

    if (!ticket) {
      const items = buildTicketItems(booking.items)
      const firstItem = items[0]
      const quantity = items.reduce((sum, item) => sum + Number(item.quantity || 0), 0)

      try {
        const doc = await Ticket.create({
          ticketId,
          bookingId: booking.bookingId,
          bookingRef: booking._id,
          visitDate: booking.visitDate,
          issueDate: new Date(),
          paymentMode: 'ONLINE',
          paymentStatus: 'SUCCESS',
          ticketSource: 'ONLINE',
          source: 'ONLINE',
          items,
          ticketCategory: firstItem?.itemCode || 'MIXED',
          quantity,
          unitPrice: firstItem?.unitPrice,
          lineTotal: booking.totalAmount,
          totalAmount: booking.totalAmount,
          qrToken: generateQrToken(),
          verificationTokenHash: hashVerificationToken(generateVerificationToken()),
          qrUsed: false,
          visitorName: booking.visitorName || booking.customerName,
          visitorEmail: booking.visitorEmail || booking.customerEmail,
          visitorMobile: booking.visitorMobile || booking.customerPhone,
        })
        ticket = doc.toObject()
        created = true
      } catch (error) {
        if (heldLegacyLock) {
          // Release so a later recovery attempt can retry.
          await Booking.updateOne({ _id: booking._id }, { $unset: { ticketIssueLockedAt: 1 } }).catch(() => {})
        }
        if (error?.code !== 11000 || !reservedTicketId) throw error
        // Another callback issued it concurrently — use that ticket.
        ticket = await Ticket.findOne({ ticketId: reservedTicketId }).lean()
        if (!ticket) throw error
      }
    }
  }

  if (String(ticket.bookingRef || '') !== String(booking._id)) {
    throw ApiError.conflict(`Ticket ID ${booking.bookingId} belongs to a different booking.`)
  }

  await markBookingConfirmed(booking._id, ticket._id)
  return { ticket, created }
}

const markRecoveryRequired = async (bookingObjectId, reason) => {
  await Booking.updateOne(
    { _id: bookingObjectId, status: { $ne: ONLINE_BOOKING_STATUS.CONFIRMED } },
    {
      $set: {
        status: ONLINE_BOOKING_STATUS.RECOVERY_REQUIRED,
        statusReason: truncate(reason, 500),
        recoveryRequiredAt: new Date(),
      },
    },
  )
}

// ---------------------------------------------------------------------------
// 4. Verified gateway success → confirm booking → issue ticket.
//    `payload` MUST already be trusted: either a reverse-hash-verified Easebuzz callback
//    or the response of the server-to-server Transaction Retrieve API.
// ---------------------------------------------------------------------------
export const confirmOnlinePayment = async ({ txnid, payload = {}, source, gatewayMeta }) => {
  const payment = await Payment.findOne({ transactionId: txnid })
  if (!payment) {
    console.error('[online-payment] success for unknown txnid', { txnid, source })
    return { outcome: 'PAYMENT_NOT_FOUND' }
  }

  const booking = payment.bookingId ? await Booking.findById(payment.bookingId) : null

  // --- Match the verified transaction to the booking it was created for ---
  const mismatches = []
  if (!booking) mismatches.push('booking missing')
  if (payload.amount !== undefined && payload.amount !== null && payload.amount !== '') {
    const paidAmount = Number(payload.amount)
    if (!Number.isFinite(paidAmount) || Math.abs(paidAmount - Number(payment.amount)) > 0.01) {
      mismatches.push(`amount ${payload.amount} != expected ${payment.amount}`)
    }
  }
  const reference = String(payload.udf1 || '').trim()
  if (booking && reference && reference !== booking.bookingId) {
    mismatches.push(`booking reference ${reference} != ${booking.bookingId}`)
  }

  if (mismatches.length) {
    const reason = `VERIFICATION_MISMATCH (${source}): ${mismatches.join('; ')}`
    console.error('[online-payment] verified success does not match booking — manual review required', { txnid, reason })
    await Payment.updateOne({ _id: payment._id, status: { $nin: PAID_STATUSES } }, { $set: { failureReason: reason } })
    if (booking) await markRecoveryRequired(booking._id, reason)
    return { outcome: 'MISMATCH', payment, booking }
  }

  // --- Record the successful payment exactly once ---
  const paymentSet = {
    status: 'SUCCESS',
    completedAt: new Date(),
    ...(payload.easepayid ? { providerPaymentId: String(payload.easepayid) } : {}),
    ...(payload.mode ? { method: String(payload.mode).toUpperCase() } : {}),
    ...(gatewayMeta ? { gatewayMeta } : {}),
    ...(source === 'WEBHOOK' ? { webhookReceivedAt: new Date() } : {}),
  }
  const transition = await Payment.updateOne(
    { _id: payment._id, status: { $nin: PAID_STATUSES } },
    { $set: paymentSet, $unset: { failureReason: 1 } },
  )
  const firstConfirmation = transition.modifiedCount === 1

  await Booking.updateOne(
    { _id: booking._id, paymentStatus: { $nin: PAID_STATUSES } },
    { $set: { paymentStatus: 'SUCCESS', paymentMode: 'ONLINE', paymentId: payment._id } },
  )

  // --- Issue the ticket (idempotent; also completes a previous RECOVERY_REQUIRED) ---
  try {
    const { ticket, created } = await issueTicketForConfirmedBooking(booking._id)
    console.info('[online-payment] booking confirmed', {
      txnid,
      source,
      bookingId: booking.bookingId,
      ticketId: ticket?.ticketId,
      ticketCreated: created,
      duplicateCallback: !firstConfirmation,
    })
    return { outcome: 'CONFIRMED', payment, booking, ticket, firstConfirmation }
  } catch (error) {
    const reason = `TICKET_GENERATION_FAILED (${source}): ${error?.message || error}`
    console.error('[online-payment] payment verified but ticket generation failed — RECOVERY_REQUIRED', { txnid, reason })
    await markRecoveryRequired(booking._id, reason)
    return { outcome: 'RECOVERY_REQUIRED', payment, booking, error }
  }
}

// ---------------------------------------------------------------------------
// 5. Verified gateway failure. Never downgrades a successful payment.
// ---------------------------------------------------------------------------
export const markOnlinePaymentFailed = async ({ txnid, payload = {}, reason, source, gatewayMeta }) => {
  const set = {
    status: 'FAILED',
    failureReason: truncate(reason || payload.error_Message || payload.error || `Payment ${payload.status || 'failed'}`, 500),
    completedAt: new Date(),
    ...(payload.easepayid ? { providerPaymentId: String(payload.easepayid) } : {}),
    ...(gatewayMeta ? { gatewayMeta } : {}),
    ...(source === 'WEBHOOK' ? { webhookReceivedAt: new Date() } : {}),
  }

  const payment = await Payment.findOneAndUpdate(
    { transactionId: txnid, status: { $nin: PAID_STATUSES } },
    { $set: set },
    { returnDocument: 'after' },
  )

  if (!payment) {
    const existing = await Payment.findOne({ transactionId: txnid }).lean()
    return { outcome: existing ? 'ALREADY_SUCCESS' : 'PAYMENT_NOT_FOUND', payment: existing }
  }

  if (payment.bookingId) {
    await Booking.updateOne(
      {
        _id: payment.bookingId,
        paymentStatus: { $nin: PAID_STATUSES },
        status: { $nin: [ONLINE_BOOKING_STATUS.CONFIRMED, ONLINE_BOOKING_STATUS.RECOVERY_REQUIRED] },
      },
      { $set: { status: ONLINE_BOOKING_STATUS.FAILED, paymentStatus: 'FAILED', paymentMode: 'ONLINE', statusReason: set.failureReason } },
    )
  }

  return { outcome: 'FAILED', payment }
}

// ---------------------------------------------------------------------------
// 6. Reporting guard — online tickets that must NOT count as confirmed.
// ---------------------------------------------------------------------------
// Before this release, an ONLINE ticket document was created at payment initiation. Those
// documents stay in the database untouched (audit trail), so every admin read excludes the
// ones whose payment was never verified. A ticket still counts if the ticket, its booking, or
// its payment record shows a verified success (older successful bookings sometimes have a
// ticket left at PENDING even though the payment succeeded — those are real, paid customers).
// Counter / admin tickets are never excluded.
export const getUnconfirmedOnlineTicketIds = async () => {
  const candidates = await Ticket.find({
    ticketSource: 'ONLINE',
    paymentStatus: { $nin: PAID_STATUSES },
  })
    .select('_id bookingRef')
    .lean()

  if (!candidates.length) return []

  const bookingRefs = candidates.map((ticket) => ticket.bookingRef).filter(Boolean)
  const [paidBookings, paidPayments] = bookingRefs.length
    ? await Promise.all([
        Booking.find({ _id: { $in: bookingRefs }, paymentStatus: { $in: PAID_STATUSES } }).select('_id').lean(),
        Payment.find({ bookingId: { $in: bookingRefs }, status: { $in: PAID_STATUSES } }).select('bookingId').lean(),
      ])
    : [[], []]

  const verifiedBookingRefs = new Set([
    ...paidBookings.map((booking) => String(booking._id)),
    ...paidPayments.map((payment) => String(payment.bookingId)),
  ])

  return candidates
    .filter((ticket) => !ticket.bookingRef || !verifiedBookingRefs.has(String(ticket.bookingRef)))
    .map((ticket) => ticket._id)
}

/** Mongo filter fragment that removes unconfirmed online tickets (empty object when none exist). */
export const buildConfirmedTicketFilter = async () => {
  const excludedIds = await getUnconfirmedOnlineTicketIds()
  return excludedIds.length ? { _id: { $nin: excludedIds } } : {}
}
