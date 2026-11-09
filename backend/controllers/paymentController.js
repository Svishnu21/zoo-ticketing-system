// ---------------------------------------------------------------------------
// Easebuzz Payment Controller
// ---------------------------------------------------------------------------
// Implements ALL required Easebuzz APIs per official documentation:
//
//   1. Initiate Payment    POST /api/payment/initiate
//      → Calls Easebuzz initiateLink API → returns access_key → frontend redirects
//
//   2. Payment Success     POST /api/payment/success     (surl callback)
//      → Easebuzz POSTs form-urlencoded data on successful payment
//      → Verify reverse hash → update DB → redirect user to confirmation page
//
//   3. Payment Failure     POST /api/payment/failure     (furl callback)
//      → Easebuzz POSTs form-urlencoded data on failed/dropped payment
//      → Update DB → redirect user to failure page
//
//   4. Payment Webhook     POST /api/payment/webhook
//      → Async server-to-server notification from Easebuzz
//      → Verify hash → update DB → respond 200 OK within 10 seconds
//
//   5. Transaction Verify  POST /api/payment/verify/:txnid
//      → Server-side call to Easebuzz Transaction Retrieve API (v1)
//      → Double-checks payment status independent of surl/furl
//
//   6. Booking Status      GET  /api/payment/status/:txnid
//      → Returns booking + payment details for the frontend confirmation page
//
// Easebuzz Environments:
//   Test: https://testpay.easebuzz.in   |  Dashboard: https://testdashboard.easebuzz.in
//   Prod: https://pay.easebuzz.in       |  Dashboard: https://dashboard.easebuzz.in
// ---------------------------------------------------------------------------

import axios from 'axios'
import { customAlphabet } from 'nanoid'

import { Booking } from '../models/Booking.js'
import { Payment } from '../models/Payment.js'
import { Ticket } from '../models/Ticket.js'
import {
  GATEWAY_FAILURE_STATUSES,
  ONLINE_BOOKING_STATUS,
  PAID_STATUSES,
  confirmOnlinePayment,
  markInitiationFailed,
  markOnlinePaymentFailed,
  normaliseAttemptKey,
  prepareOnlineBookingAttempt,
} from '../services/onlinePaymentService.js'
import { ApiError } from '../utils/errors.js'
import { generateHash, generateRetrieveHash, verifyHash } from '../utils/easebuzz.js'
import { generateQrDataUrl } from '../utils/qrImage.js'
import { recordAuditLog } from '../utils/auditTrail.js'

// ---------------------------------------------------------------------------
// Easebuzz environment helpers
// ---------------------------------------------------------------------------
const isProduction = () => {
  const env = (process.env.EASEBUZZ_ENV || 'test').toLowerCase()
  return env === 'production' || env === 'prod'
}

const getPayBaseUrl = () =>
  isProduction() ? 'https://pay.easebuzz.in' : 'https://testpay.easebuzz.in'

const getDashboardBaseUrl = () =>
  isProduction() ? 'https://dashboard.easebuzz.in' : 'https://testdashboard.easebuzz.in'

/**
 * Resolve the backend BASE_URL for Easebuzz surl/furl callbacks.
 * In production, localhost is never acceptable — fail fast.
 */
const getBaseUrl = () => {
  const url = process.env.BASE_URL
  if (!url) {
    throw new Error('[FATAL] BASE_URL environment variable is not configured. Easebuzz callbacks will fail.')
  }
  if (isProduction() && /localhost|127\.0\.0\.1/i.test(url)) {
    throw new Error('[FATAL] BASE_URL contains localhost in production mode. Set a public HTTPS URL.')
  }
  return url
}

/**
 * Resolve the frontend CLIENT_URL for user-facing redirects.
 * Falls back to BASE_URL only in non-production environments.
 */
const getClientUrl = () => {
  if (process.env.CLIENT_URL) {
    const clientUrl = process.env.CLIENT_URL
    if (isProduction() && /localhost|127\.0\.0\.1/i.test(clientUrl)) {
      throw new Error('[FATAL] CLIENT_URL contains localhost in production mode.')
    }
    return clientUrl
  }
  if (!isProduction() && process.env.BASE_URL) return process.env.BASE_URL

  throw new Error('[FATAL] CLIENT_URL must be configured (BASE_URL fallback disabled in production).')
}

// ---------------------------------------------------------------------------
// ID generators
// ---------------------------------------------------------------------------
const generateTxnId = customAlphabet('0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz', 20)

// ---------------------------------------------------------------------------
// Small helpers
// ---------------------------------------------------------------------------
const toNumber = (value) => {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}

const normalizeItem = (item = {}) => {
  const itemCode = String(item.itemCode || item.code || '').trim()
  const label = String(item.label || item.itemLabel || item.name || '').trim()
  const unitPrice = toNumber(item.unitPrice ?? item.price)
  const quantity = Math.max(0, Math.floor(toNumber(item.quantity)))

  return {
    itemCode,
    label,
    unitPrice,
    quantity,
    lineTotal: Number((unitPrice * quantity).toFixed(2)),
  }
}

// Keys that must NEVER appear in logs (values are masked)
const SENSITIVE_KEYS = new Set(['hash', 'card_no', 'cardnum', 'card_number', 'cvv', 'password', 'salt', 'key'])

/**
 * Normalize gateway callback payload — coerce all values to strings,
 * strip undefined/null, and remove keys with excessively long values
 * that could indicate injection attempts.
 */
const normalizeGatewayMeta = (payload = {}) => {
  const MAX_VALUE_LEN = 2048
  const entries = Object.entries(payload)
    .filter(([, value]) => value !== undefined && value !== null)
    .map(([key, value]) => {
      const strVal = String(value)
      return [key, strVal.length > MAX_VALUE_LEN ? strVal.substring(0, MAX_VALUE_LEN) : strVal]
    })
  return Object.fromEntries(entries)
}

/**
 * Create a log-safe copy of a gateway payload — masks sensitive fields
 * so credentials / card data never appear in logs.
 */
const maskForLog = (payload = {}) => {
  const safe = {}
  for (const [key, value] of Object.entries(payload)) {
    if (SENSITIVE_KEYS.has(key.toLowerCase())) {
      safe[key] = value ? `${String(value).substring(0, 6)}…[MASKED]` : '[EMPTY]'
    } else {
      safe[key] = value
    }
  }
  return safe
}

/**
 * Validate that required callback fields are present in an Easebuzz payload.
 * Returns { valid: boolean, missing: string[] }
 */
const validateCallbackFields = (payload, requiredFields = ['txnid', 'status', 'amount', 'hash']) => {
  const missing = requiredFields.filter((f) => !payload[f] && payload[f] !== 0)
  return { valid: missing.length === 0, missing }
}

/**
 * Idempotency guard: checks if a payment has already reached a terminal
 * SUCCESS state. If so, the callback should be skipped to prevent
 * duplicate booking confirmations.
 */
const isAlreadySuccessful = (payment) => {
  return payment && (payment.status === 'SUCCESS' || payment.status === 'PAID')
}

/**
 * Build a safe redirect URL — only allow redirects to the configured CLIENT_URL
 * origin to prevent open-redirect attacks.
 */
const buildSafeRedirect = (path, params = {}) => {
  const clientUrl = getClientUrl()
  const url = new URL(path, clientUrl)
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null) {
      url.searchParams.set(key, String(value))
    }
  }
  return url.toString()
}


const SYSTEM_ACTOR_ID = '507f1f77bcf86cd799439011'

const gatewayStatusOf = (payload) => String(payload?.status || '').trim().toLowerCase()

/** Extract a short, non-sensitive reason from an Easebuzz initiateLink response body. */
const extractGatewayMessage = (data) => {
  if (!data) return ''
  if (typeof data === 'string') return data.slice(0, 300)
  const candidates = [data.error_desc, data.error, data.message, data.msg, typeof data.data === 'string' ? data.data : '']
  const message = candidates.find((value) => typeof value === 'string' && value.trim())
  return (message || `gateway status ${data.status ?? 'unknown'}`).slice(0, 300)
}

const describeGatewayError = (error) => {
  if (error?.response) {
    return `HTTP ${error.response.status}: ${extractGatewayMessage(error.response.data) || error.response.statusText || 'no body'}`
  }
  return error?.code ? `${error.code}: ${error.message}` : String(error?.message || error)
}

/**
 * Idempotency: answer a repeated submission of the same payment attempt from its stored state
 * instead of creating another booking/payment. Returns null when the attempt is unknown.
 */
const resolveExistingAttempt = async (attemptKey) => {
  const existing = await Booking.findOne({ paymentAttemptKey: attemptKey }).lean()
  if (!existing) return null

  const payment = await Payment.findOne(existing.paymentId ? { _id: existing.paymentId } : { bookingId: existing._id })
    .select('+paymentUrl')
    .lean()

  const isPaid = PAID_STATUSES.includes(String(existing.paymentStatus || '').toUpperCase())
    || PAID_STATUSES.includes(String(payment?.status || '').toUpperCase())

  if (isPaid || existing.status === ONLINE_BOOKING_STATUS.CONFIRMED || existing.status === ONLINE_BOOKING_STATUS.RECOVERY_REQUIRED) {
    return {
      httpStatus: 409,
      body: {
        success: false,
        alreadyPaid: true,
        message: 'This booking has already been paid.',
        txnid: payment?.transactionId,
        bookingId: existing.bookingId,
      },
    }
  }

  if (existing.status === ONLINE_BOOKING_STATUS.PENDING) {
    if (payment?.paymentUrl) {
      console.info('[payment] duplicate initiation — replaying existing payment link', {
        bookingId: existing.bookingId,
        txnid: payment.transactionId,
      })
      return {
        httpStatus: 200,
        body: {
          success: true,
          payment_url: payment.paymentUrl,
          txnid: payment.transactionId,
          bookingId: existing.bookingId,
          replayed: true,
        },
      }
    }
    return {
      httpStatus: 409,
      body: {
        success: false,
        inProgress: true,
        message: 'This payment is already being processed. Please wait a moment.',
      },
    }
  }

  return {
    httpStatus: 409,
    body: {
      success: false,
      retryWithNewAttempt: true,
      message: 'This payment attempt has already ended. Please try again.',
    },
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// 1. INITIATE PAYMENT
//    POST /api/payment/initiate
//    Records a PENDING payment attempt (booking + payment, NO ticket), then calls
//    Easebuzz initiateLink. Tickets are generated only after verified payment.
// ═══════════════════════════════════════════════════════════════════════════
export const initiatePayment = async (req, res) => {
  let bookingDoc = null
  let payment = null

  try {
    const {
      customerName,
      customerEmail,
      customerPhone,
      visitDate,
      items = [],
      totalAmount,
      attemptId,
    } = req.body || {}

    // --- Input validation ---
    if (!customerName || !customerPhone || !visitDate || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ success: false, message: 'customerName, customerPhone, visitDate, items[] are required.' })
    }

    const amount = Number(totalAmount)
    if (!Number.isFinite(amount) || amount <= 0) {
      return res.status(400).json({ success: false, message: 'totalAmount must be a positive number.' })
    }

    // --- Easebuzz credentials & environment (checked before anything is written) ---
    const key = process.env.EASEBUZZ_KEY
    const salt = process.env.EASEBUZZ_SALT

    if (!key || !salt) {
      console.error('[payment] EASEBUZZ_KEY or EASEBUZZ_SALT not configured')
      return res.status(500).json({ success: false, message: 'Payment gateway credentials are not configured.' })
    }

    let baseUrl
    try {
      baseUrl = getBaseUrl()
    } catch (envErr) {
      console.error('[payment]', envErr.message)
      return res.status(500).json({ success: false, message: 'Server environment is not configured for payments.' })
    }

    // --- Idempotency: one attempt key = at most one booking + one payment ---
    const attemptKey = normaliseAttemptKey(attemptId ?? req.get?.('Idempotency-Key'))
    if (attemptKey) {
      const replay = await resolveExistingAttempt(attemptKey)
      if (replay) return res.status(replay.httpStatus).json(replay.body)
    }

    // --- Record the PENDING payment attempt (no ticket, no QR) ---
    // Only whitelisted fields are passed — the client can no longer set ticketId, bookingId,
    // ticketSource, status or paymentStatus.
    try {
      ;({ booking: bookingDoc } = await prepareOnlineBookingAttempt({
        customerName,
        customerEmail,
        customerPhone,
        visitDate,
        items,
        attemptKey,
      }))
    } catch (error) {
      // Two identical submissions raced past the lookup above — answer from the winner.
      if (error?.code === 11000 && attemptKey && /paymentAttemptKey/.test(String(error?.message))) {
        const replay = await resolveExistingAttempt(attemptKey)
        if (replay) return res.status(replay.httpStatus).json(replay.body)
      }
      throw error
    }

    const bookingId = bookingDoc.bookingId
    const backendTotalAmount = Number(bookingDoc.totalAmount)
    if (Math.abs(backendTotalAmount - amount) > 0.01) {
      console.warn('[payment] client total differs from backend tariff total — charging backend total', {
        bookingId,
        clientTotal: amount,
        backendTotal: backendTotalAmount,
      })
    }

    const txnid = generateTxnId()

    payment = await Payment.create({
      bookingId: bookingDoc._id,
      transactionId: txnid,
      method: 'UPI',
      amount: Number(backendTotalAmount.toFixed(2)),
      currency: 'INR',
      status: 'PENDING',
      provider: 'EASEBUZZ',
      requestedAt: new Date(),
      source: 'ONLINE',
    })

    await Booking.updateOne({ _id: bookingDoc._id }, { $set: { paymentId: payment._id } })

    // Email is optional on the frontend form. Easebuzz requires a valid email,
    // so fall back to a phone-based placeholder when none is supplied.
    const resolvedEmail = (customerEmail && String(customerEmail).trim())
      ? String(customerEmail).trim().toLowerCase()
      : `${String(customerPhone).replace(/\D/g, '')}@guest.zoo.local`

    // --- Build Easebuzz payload ---
    // Hash sequence: key|txnid|amount|productinfo|firstname|email|udf1|...|udf10|salt
    const easebuzzPayload = {
      key,
      txnid,
      amount: Number(backendTotalAmount.toFixed(2)).toFixed(2),
      productinfo: 'Zoo Ticket Booking',
      firstname: String(customerName).trim(),
      email: resolvedEmail,
      phone: String(customerPhone).trim(),
      surl: `${baseUrl}/api/payment/success`,
      furl: `${baseUrl}/api/payment/failure`,
      udf1: bookingId,
      // udf2–udf10 are empty (not sent, hash uses empty strings)
    }

    const hash = generateHash(easebuzzPayload, salt)
    const body = new URLSearchParams({ ...easebuzzPayload, hash })

    // --- Call Easebuzz initiateLink API ---
    const payBaseUrl = getPayBaseUrl()
    console.log('[payment] calling Easebuzz initiateLink', {
      url: `${payBaseUrl}/payment/initiateLink`,
      txnid,
      bookingId,
      amount: easebuzzPayload.amount,
    })

    let paymentUrl = ''
    let gatewayFailureReason = ''

    try {
      const gatewayResponse = await axios.post(
        `${payBaseUrl}/payment/initiateLink`,
        body.toString(),
        {
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          timeout: 15000,
        },
      )

      // Expected: { status: 1, data: "<access_key>" }
      const rawData = gatewayResponse.data
      const gatewayData = typeof rawData === 'string' ? (() => { try { return JSON.parse(rawData) } catch { return { data: rawData } } })() : rawData || {}

      console.log('[payment] Easebuzz initiateLink response', {
        status: gatewayData.status,
        hasData: !!gatewayData.data,
        dataPreview: typeof gatewayData.data === 'string' ? gatewayData.data.substring(0, 40) + '...' : typeof gatewayData.data,
      })

      if (gatewayData.status === 1 && gatewayData.data) {
        // Standard response: { status: 1, data: "access_key_string" }
        const accessKey = String(gatewayData.data).trim()
        paymentUrl = `${payBaseUrl}/pay/${accessKey}`
      } else if (gatewayData.payment_url || gatewayData.paymentUrl || gatewayData.payment_link) {
        // Fallback: some versions return a direct URL
        paymentUrl = gatewayData.payment_url || gatewayData.paymentUrl || gatewayData.payment_link
      } else {
        // e.g. { status: 0, data: "Merchant is blocked." }
        gatewayFailureReason = extractGatewayMessage(gatewayData)
        console.error('[payment] Easebuzz did not return a valid payment URL', maskForLog(gatewayData))
      }
    } catch (gatewayError) {
      // e.g. HTTP 502 from the gateway, network error or timeout
      gatewayFailureReason = describeGatewayError(gatewayError)
      console.error('[payment] Easebuzz initiateLink request failed', { txnid, bookingId, reason: gatewayFailureReason })
    }

    if (!paymentUrl) {
      await markInitiationFailed({
        bookingId: bookingDoc._id,
        paymentId: payment._id,
        reason: gatewayFailureReason || 'Payment gateway did not return a valid payment URL.',
      })

      recordAuditLog({
        actorId: SYSTEM_ACTOR_ID,
        action: 'PAYMENT_INITIATION_FAILED',
        entity: 'Payment',
        entityId: payment._id,
        after: { status: 'INITIATION_FAILED', txnid },
        context: { txnid, bookingId, reason: gatewayFailureReason },
      }).catch(() => {})

      return res.status(502).json({
        success: false,
        retryable: true,
        message: 'Payment gateway did not return a valid payment URL.',
      })
    }

    await Payment.updateOne({ _id: payment._id }, { $set: { paymentUrl } })

    console.log('[payment] payment URL generated', { txnid, paymentUrl: paymentUrl.substring(0, 60) + '...' })

    return res.status(200).json({
      success: true,
      payment_url: paymentUrl,
      txnid,
      bookingId,
    })
  } catch (error) {
    // Never leave a half-created attempt looking like an open/pending booking.
    if (bookingDoc?._id) {
      await markInitiationFailed({
        bookingId: bookingDoc._id,
        paymentId: payment?._id,
        reason: `Server error during initiation: ${error?.message || error}`,
      }).catch((markError) => console.error('[payment] failed to mark initiation failure', markError?.message))
    }

    if (error instanceof ApiError) {
      return res.status(error.statusCode).json({ success: false, message: error.message })
    }

    console.error('[payment] initiatePayment ERROR', error?.response?.data || error.message || error)
    return res.status(500).json({ success: false, message: 'Failed to initiate payment.' })
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// 2. PAYMENT SUCCESS CALLBACK (surl)
//    POST /api/payment/success
//    Easebuzz POSTs form-urlencoded data here after successful payment.
//    The reverse hash (signed with our SALT) is verified before anything is trusted;
//    the transaction is then matched to its booking (txnid, amount, udf1) and only
//    then is the booking confirmed and the ticket generated.
// ═══════════════════════════════════════════════════════════════════════════
export const paymentSuccess = async (req, res) => {
  const payload = req.body || {}
  const salt = process.env.EASEBUZZ_SALT

  console.log('[payment] surl callback received', {
    txnid: payload.txnid,
    status: payload.status,
    easepayid: payload.easepayid,
    amount: payload.amount,
  })

  // --- Validate required callback fields ---
  const { valid, missing } = validateCallbackFields(payload)
  if (!valid) {
    console.error('[payment] surl callback missing required fields', { missing })
    return res.status(400).send('Invalid callback: missing required fields.')
  }

  if (!salt) {
    console.error('[payment] EASEBUZZ_SALT not configured — cannot verify callback hash')
    return res.status(500).json({ success: false, message: 'Payment gateway salt is not configured.' })
  }

  // --- MANDATORY: Verify reverse hash to prevent tampering ---
  const isValidHash = verifyHash(payload, salt)
  if (!isValidHash) {
    console.error('[payment] HASH MISMATCH on surl callback — possible tampering!', {
      txnid: payload.txnid,
      receivedHash: String(payload.hash || '').substring(0, 20) + '...',
    })
    return res.status(400).send('Invalid hash received from payment gateway.')
  }

  console.log('[payment] surl hash verified ✓', { txnid: payload.txnid })

  const txnid = String(payload.txnid || '').trim()
  const gatewayStatus = gatewayStatusOf(payload)

  try {
    // surl must never confirm a payment the gateway itself does not report as successful.
    if (gatewayStatus !== 'success') {
      console.warn('[payment] surl received non-success status — not confirming', { txnid, gatewayStatus })
      if (GATEWAY_FAILURE_STATUSES.includes(gatewayStatus)) {
        await markOnlinePaymentFailed({ txnid, payload, source: 'SURL', gatewayMeta: normalizeGatewayMeta(payload) })
        return res.redirect(302, buildSafeRedirect('/payment-failed', { txnid }))
      }
      return res.redirect(302, buildSafeRedirect('/booking-confirmed', { txnid, bookingId: String(payload.udf1 || '').trim() }))
    }

    const result = await confirmOnlinePayment({
      txnid,
      payload,
      source: 'SURL',
      gatewayMeta: normalizeGatewayMeta(payload),
    })

    await recordAuditLog({
      actorId: result.booking?.issuedBy || SYSTEM_ACTOR_ID,
      action: result.outcome === 'CONFIRMED' ? 'PAYMENT_SUCCESS_SURL' : `PAYMENT_SUCCESS_SURL_${result.outcome}`,
      entity: 'Payment',
      entityId: result.payment?._id,
      after: { status: 'SUCCESS', txnid, easepayid: payload.easepayid, outcome: result.outcome },
      context: {
        txnid,
        bookingId: result.booking?.bookingId,
        amount: payload.amount,
        raw: JSON.stringify(maskForLog(payload)),
      },
    })

    const bookingCode = result.booking?.bookingId || String(payload.udf1 || '').trim()
    const redirectUrl = buildSafeRedirect('/booking-confirmed', { txnid, bookingId: bookingCode })

    console.log('[payment] surl → redirecting to', redirectUrl, { outcome: result.outcome })
    return res.redirect(302, redirectUrl)
  } catch (error) {
    console.error('[payment] paymentSuccess ERROR', error.message || error)

    recordAuditLog({
      actorId: SYSTEM_ACTOR_ID,
      action: 'PAYMENT_SUCCESS_FAILURE',
      entity: 'Payment',
      entityId: SYSTEM_ACTOR_ID, // Placeholder
      context: { txnid, error: error.message },
    }).catch(() => {})

    return res.status(500).send('Payment success handler failed.')
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// 3. PAYMENT FAILURE CALLBACK (furl)
//    POST /api/payment/failure
//    Easebuzz POSTs form-urlencoded data here when payment fails or is dropped.
//    The attempt is marked FAILED only when the hash-verified gateway status says so.
// ═══════════════════════════════════════════════════════════════════════════
export const paymentFailure = async (req, res) => {
  const payload = req.body || {}
  const txnid = String(payload.txnid || '').trim()
  const salt = process.env.EASEBUZZ_SALT

  console.log('[payment] furl callback received', {
    txnid,
    status: payload.status,
    error: payload.error_Message || payload.error,
  })

  const failedRedirect = () => res.redirect(302, buildSafeRedirect('/payment-failed', { txnid }))

  try {
    const { valid } = validateCallbackFields(payload)
    const isValidHash = Boolean(valid && salt && verifyHash(payload, salt))

    if (!isValidHash) {
      // Unverified data must not change payment state. The attempt stays PENDING (excluded from
      // confirmed figures) until a verified callback, webhook or Retrieve API check resolves it.
      console.warn('[payment] furl callback could not be verified — no status change', { txnid, fieldsValid: valid })
      return failedRedirect()
    }

    const gatewayStatus = gatewayStatusOf(payload)

    if (gatewayStatus === 'success') {
      const result = await confirmOnlinePayment({ txnid, payload, source: 'FURL', gatewayMeta: normalizeGatewayMeta(payload) })
      const bookingCode = result.booking?.bookingId || String(payload.udf1 || '').trim()
      return res.redirect(302, buildSafeRedirect('/booking-confirmed', { txnid, bookingId: bookingCode }))
    }

    if (!GATEWAY_FAILURE_STATUSES.includes(gatewayStatus)) {
      console.warn('[payment] furl with non-terminal status — leaving attempt PENDING', { txnid, gatewayStatus })
      return failedRedirect()
    }

    const result = await markOnlinePaymentFailed({
      txnid,
      payload,
      source: 'FURL',
      reason: payload.error_Message ? String(payload.error_Message) : 'Payment failed or was dropped by user.',
      gatewayMeta: normalizeGatewayMeta(payload),
    })

    // --- Guard: never downgrade a SUCCESS payment to FAILED (race with webhook) ---
    if (result.outcome === 'ALREADY_SUCCESS') {
      console.log('[payment] furl received but payment already SUCCESS — ignoring failure callback', { txnid })
      const existingBooking = result.payment?.bookingId ? await Booking.findById(result.payment.bookingId).lean() : null
      const bookingCode = existingBooking?.bookingId || String(payload.udf1 || '').trim()
      return res.redirect(302, buildSafeRedirect('/booking-confirmed', { txnid, bookingId: bookingCode }))
    }

    await recordAuditLog({
      actorId: SYSTEM_ACTOR_ID,
      action: 'PAYMENT_FAILURE_FURL',
      entity: 'Payment',
      entityId: result.payment?._id,
      after: { status: 'FAILED', txnid },
      context: { txnid, error: payload.error_Message, raw: JSON.stringify(maskForLog(payload)) },
    })

    console.log('[payment] furl → redirecting to payment-failed', { txnid })
    return failedRedirect()
  } catch (error) {
    console.error('[payment] paymentFailure ERROR', error.message || error)
    return res.status(500).send('Payment failure handler failed.')
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// 4. PAYMENT WEBHOOK (async server-to-server notification)
//    POST /api/payment/webhook
//    Easebuzz pushes payment status updates here asynchronously.
//    MUST respond with 200 OK within 10 seconds.
//    This is the MOST RELIABLE way to confirm payments — surl/furl can be
//    missed if the user closes the browser or has network issues.
// ═══════════════════════════════════════════════════════════════════════════
export const paymentWebhook = async (req, res) => {
  const payload = req.body || {}
  const salt = process.env.EASEBUZZ_SALT

  console.log('[webhook] received', {
    txnid: payload.txnid,
    status: payload.status,
    easepayid: payload.easepayid,
    amount: payload.amount,
  })

  // Respond 200 immediately (Easebuzz requires this within 10 seconds)
  res.status(200).json({ received: true })

  try {
    // --- Validate required fields ---
    const { valid, missing } = validateCallbackFields(payload)
    if (!valid) {
      throw new Error(`[webhook] missing required fields: ${missing.join(', ')}`)
    }

    // --- Verify hash ---
    if (!salt) {
      throw new Error('[webhook] EASEBUZZ_SALT not configured')
    }

    const isValidHash = verifyHash(payload, salt)
    if (!isValidHash) {
      throw new Error('[webhook] HASH MISMATCH')
    }

    console.log('[webhook] hash verified ✓', { txnid: payload.txnid, status: payload.status })

    const txnid = String(payload.txnid || '').trim()
    const gatewayStatus = gatewayStatusOf(payload)

    if (gatewayStatus === 'success') {
      // Duplicate webhooks are safe: confirmation and ticket issuance are idempotent.
      const result = await confirmOnlinePayment({ txnid, payload, source: 'WEBHOOK', gatewayMeta: normalizeGatewayMeta(payload) })

      await recordAuditLog({
        actorId: SYSTEM_ACTOR_ID,
        action: result.outcome === 'CONFIRMED' ? 'PAYMENT_WEBHOOK_SUCCESS' : `PAYMENT_WEBHOOK_SUCCESS_${result.outcome}`,
        entity: 'Payment',
        entityId: result.payment?._id,
        context: { txnid, bookingId: result.booking?.bookingId, amount: payload.amount, raw: JSON.stringify(maskForLog(payload)) },
      })

      console.log('[webhook] success processed', { txnid, outcome: result.outcome })
      return
    }

    if (!GATEWAY_FAILURE_STATUSES.includes(gatewayStatus)) {
      console.log('[webhook] non-terminal status — attempt stays PENDING', { txnid, gatewayStatus })
      return
    }

    const result = await markOnlinePaymentFailed({
      txnid,
      payload,
      source: 'WEBHOOK',
      reason: payload.error_Message ? String(payload.error_Message) : `Payment ${gatewayStatus}`,
      gatewayMeta: normalizeGatewayMeta(payload),
    })

    if (result.outcome === 'ALREADY_SUCCESS') {
      console.log('[webhook] ignoring non-success webhook for already-successful payment', { txnid, gatewayStatus })
      return
    }

    await recordAuditLog({
      actorId: SYSTEM_ACTOR_ID,
      action: 'PAYMENT_WEBHOOK_FAILURE',
      entity: 'Payment',
      entityId: result.payment?._id,
      context: { txnid, status: gatewayStatus, raw: JSON.stringify(maskForLog(payload)) },
    })

    console.log('[webhook] booking FAILED via webhook', { txnid, status: gatewayStatus })
  } catch (error) {
    console.error('[webhook] processing ERROR', error.message || error)

    // Fail-safe audit log for lost webhooks
    recordAuditLog({
      actorId: SYSTEM_ACTOR_ID,
      action: 'PAYMENT_WEBHOOK_CRITICAL_ERROR',
      entity: 'Payment',
      entityId: SYSTEM_ACTOR_ID,
      context: { error: error.message, txnid: payload.txnid },
    }).catch(() => {})
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// 5. TRANSACTION VERIFY (server-side verification via Easebuzz API)
//    POST /api/payment/verify/:txnid
//    Calls Easebuzz Transaction Retrieve API to double-check payment status.
//    Also used by admin recovery to resolve PENDING attempts.
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Pick the transaction object for `txnid` out of a Retrieve API response.
 * Only an entry whose txnid exactly matches the requested one is accepted — never a fallback
 * entry. A missing or mismatched txnid yields {} (no status), so no state change is made.
 */
const extractRetrievedTransaction = (verifyData, txnid) => {
  const matchesTxnid = (entry) => Boolean(entry) && typeof entry === 'object' && String(entry.txnid ?? '').trim() === txnid
  const containers = [verifyData?.msg, verifyData?.data]
  for (const container of containers) {
    const match = Array.isArray(container) ? container.find(matchesTxnid) : (matchesTxnid(container) ? container : null)
    if (match) return match
  }
  return {}
}

export const reconcileTransactionWithGateway = async (txnid, { source = 'RETRIEVE_API' } = {}) => {
  const key = process.env.EASEBUZZ_KEY
  const salt = process.env.EASEBUZZ_SALT

  if (!key || !salt) {
    throw ApiError.internal('Payment gateway credentials not configured.')
  }

  // Look up the payment to get amount, email, phone for the hash
  const payment = await Payment.findOne({ transactionId: txnid }).lean()
  if (!payment) {
    throw ApiError.notFound('No payment found for this transaction ID.')
  }

  const booking = payment.bookingId ? await Booking.findById(payment.bookingId).lean() : null

  // --- Build Transaction Retrieve API request ---
  // Hash sequence: key|txnid|amount|email|phone|salt
  const retrieveData = {
    key,
    txnid,
    amount: Number(payment.amount).toFixed(2),
    email: booking?.customerEmail || '',
    phone: booking?.customerPhone || '',
  }

  const hash = generateRetrieveHash(retrieveData, salt)

  const dashboardUrl = getDashboardBaseUrl()
  console.log('[payment] calling Transaction Retrieve API', {
    url: `${dashboardUrl}/transaction/v1/retrieve`,
    txnid,
  })

  const verifyResponse = await axios.post(
    `${dashboardUrl}/transaction/v1/retrieve`,
    new URLSearchParams({ ...retrieveData, hash }).toString(),
    {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      timeout: 15000,
    },
  )

  const verifyData = verifyResponse.data
  const transaction = extractRetrievedTransaction(verifyData, txnid)
  const txnStatus = gatewayStatusOf(transaction)

  console.log('[payment] Transaction Retrieve response', { status: verifyData?.status, txnStatus })

  let reconciled = false
  let outcome = null

  if (txnStatus === 'success') {
    // Server-to-server answer from Easebuzz — trusted. Idempotent: also re-issues a missing
    // ticket for an already-successful payment (RECOVERY_REQUIRED) without charging again.
    const result = await confirmOnlinePayment({
      txnid,
      source,
      payload: {
        amount: transaction.amount ?? transaction.net_amount_debit,
        udf1: transaction.udf1,
        easepayid: transaction.easepayid,
        mode: transaction.mode,
      },
    })
    outcome = result.outcome
    reconciled = !PAID_STATUSES.includes(String(payment.status).toUpperCase())

    recordAuditLog({
      actorId: SYSTEM_ACTOR_ID,
      action: 'PAYMENT_RECONCILED_SUCCESS',
      entity: 'Payment',
      entityId: payment._id,
      context: { txnid, previousStatus: payment.status, gatewayStatus: txnStatus, outcome },
    }).catch(() => {})
  } else if (GATEWAY_FAILURE_STATUSES.includes(txnStatus) && payment.status === 'PENDING') {
    console.log('[payment] reconciling missed failure for', txnid)
    const result = await markOnlinePaymentFailed({
      txnid,
      source,
      payload: { status: txnStatus },
      reason: `Payment ${txnStatus} (verified via API)`,
    })
    outcome = result.outcome
    reconciled = result.outcome === 'FAILED'

    recordAuditLog({
      actorId: SYSTEM_ACTOR_ID,
      action: 'PAYMENT_RECONCILED_FAILURE',
      entity: 'Payment',
      entityId: payment._id,
      context: { txnid, previousStatus: payment.status, gatewayStatus: txnStatus },
    }).catch(() => {})
  }

  const current = await Payment.findById(payment._id).select('status').lean()

  return {
    txnid,
    gatewayStatus: txnStatus,
    localStatus: current?.status || payment.status,
    previousStatus: payment.status,
    reconciled,
    outcome,
    verifyData: isProduction() ? undefined : verifyData,
  }
}

export const verifyTransaction = async (req, res) => {
  try {
    const txnid = String(req.params.txnid || '').trim()
    if (!txnid) {
      return res.status(400).json({ success: false, message: 'txnid is required.' })
    }

    const result = await reconcileTransactionWithGateway(txnid)
    return res.status(200).json({ success: true, ...result })
  } catch (error) {
    if (error instanceof ApiError) {
      return res.status(error.statusCode).json({ success: false, message: error.message })
    }
    console.error('[payment] verifyTransaction ERROR', error?.response?.data || error.message || error)
    return res.status(500).json({ success: false, message: 'Failed to verify transaction with payment gateway.' })
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// 6. BOOKING STATUS (for frontend confirmation page)
//    GET /api/payment/status/:txnid
//    The confirmation page renders a ticket ONLY when `confirmed` is true —
//    a redirect to /booking-confirmed is never treated as proof of payment.
// ═══════════════════════════════════════════════════════════════════════════
export const getBookingStatus = async (req, res) => {
  try {
    const txnid = String(req.params.txnid || '').trim()
    if (!txnid) {
      return res.status(400).json({ success: false, message: 'txnid is required.' })
    }

    const payment = await Payment.findOne({ transactionId: txnid }).lean()
    if (!payment) {
      return res.status(404).json({ success: false, message: 'Payment not found for txnid.' })
    }

    const bookingDoc = payment.bookingId ? await Booking.findById(payment.bookingId).lean() : null
    if (!bookingDoc) {
      return res.status(404).json({ success: false, message: 'Booking not found for txnid.' })
    }
    // Internal bookkeeping fields are not needed by the customer page.
    const { paymentAttemptKey: _attemptKey, statusReason: _statusReason, ...booking } = bookingDoc

    const isPaid = PAID_STATUSES.includes(String(payment.status || '').toUpperCase())
    const isPending = payment.status === 'PENDING'
    let ticket = null
    let qrImage = null

    if (isPaid && booking.tickets && booking.tickets.length > 0) {
      // qrToken has select:false in the schema, so we must explicitly include it
      ticket = await Ticket.findById(booking.tickets[0]).select('+qrToken').lean()
      if (ticket && ticket.qrToken) {
        try {
          qrImage = await generateQrDataUrl(ticket.qrToken)
        } catch (e) {
          console.error('[payment] failed to generate qr image for ticket', e.message || e)
        }
      } else {
        console.warn('[payment] getBookingStatus: ticket found but qrToken is missing', {
          ticketId: ticket?.ticketId,
          bookingId: booking.bookingId,
        })
      }
    }

    const confirmed = Boolean(isPaid && ticket)

    return res.status(200).json({
      success: true,
      txnid,
      booking,
      confirmed,
      bookingStatus: booking.status,
      // Paid but no ticket yet: the payment is safe; the ticket is being (re)generated.
      recoveryRequired: Boolean(isPaid && !ticket),
      ticketId: confirmed ? ticket.ticketId : 'Payment Pending',
      qrImage: confirmed ? qrImage : null,
      payment: {
        transactionId: payment.transactionId,
        providerPaymentId: payment.providerPaymentId,
        status: payment.status,
        method: payment.method,
        amount: payment.amount,
        currency: payment.currency,
        failureReason: payment.failureReason,
        completedAt: payment.completedAt,
      },
      // Polling support: frontend can check this flag to decide whether to retry
      pending: isPending,
    })
  } catch (error) {
    console.error('[payment] getBookingStatus ERROR', error.message || error)
    return res.status(500).json({ success: false, message: 'Failed to fetch booking status.' })
  }
}
