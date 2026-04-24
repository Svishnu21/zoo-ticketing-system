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
import mongoose from 'mongoose'
import { customAlphabet } from 'nanoid'

import { Booking } from '../models/Booking.js'
import { Payment } from '../models/Payment.js'
import { Ticket } from '../models/Ticket.js'
import { createBooking } from '../services/bookingService.js'
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

const getClientUrl = () =>
  process.env.CLIENT_URL || process.env.BASE_URL || 'http://localhost:5000'

// ---------------------------------------------------------------------------
// ID generators
// ---------------------------------------------------------------------------
const generateTxnId = customAlphabet('0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz', 20)
const generateBookingSuffix = customAlphabet('ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789', 4)

const createBookingId = (baseDate = new Date()) => {
  const date = new Date(baseDate)
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `ZOO-${y}${m}${d}-${generateBookingSuffix()}`
}

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

const normalizeGatewayMeta = (payload = {}) => {
  const entries = Object.entries(payload).map(([key, value]) => [key, value === undefined || value === null ? '' : String(value)])
  return Object.fromEntries(entries)
}

// ═══════════════════════════════════════════════════════════════════════════
// 1. INITIATE PAYMENT
//    POST /api/payment/initiate
//    Frontend calls this → we call Easebuzz initiateLink → return payment URL
// ═══════════════════════════════════════════════════════════════════════════
export const initiatePayment = async (req, res) => {
  try {
    const {
      customerName,
      customerEmail,
      customerPhone,
      visitDate,
      items = [],
      totalAmount,
    } = req.body || {}

    // --- Input validation ---
    if (!customerName || !customerPhone || !visitDate || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ success: false, message: 'customerName, customerPhone, visitDate, items[] are required.' })
    }

    const amount = Number(totalAmount)
    if (!Number.isFinite(amount) || amount <= 0) {
      return res.status(400).json({ success: false, message: 'totalAmount must be a positive number.' })
    }

    // --- Easebuzz credentials ---
    const key = process.env.EASEBUZZ_KEY
    const salt = process.env.EASEBUZZ_SALT
    const baseUrl = process.env.BASE_URL

    if (!key || !salt) {
      console.error('[payment] EASEBUZZ_KEY or EASEBUZZ_SALT not configured')
      return res.status(500).json({ success: false, message: 'Payment gateway credentials are not configured.' })
    }

    if (!baseUrl) {
      console.error('[payment] BASE_URL not configured — Easebuzz callbacks will fail')
      return res.status(500).json({ success: false, message: 'BASE_URL is not configured.' })
    }

    // --- Create PENDING booking using standard booking service so tickets/QR tokens are generated ---
    const { ticket, booking: bookingDoc, totalAmount: backendTotalAmount } = await createBooking({
      ...req.body,
      visitorName: customerName,
      visitorEmail: customerEmail,
      visitorMobile: customerPhone,
      status: 'PENDING',
      paymentStatus: 'PENDING',
      paymentMode: 'ONLINE',
    })

    const bookingId = bookingDoc.bookingId
    const txnid = generateTxnId()

    // --- Create PENDING payment ---
    const payment = await Payment.create({
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

    bookingDoc.paymentId = payment._id
    await bookingDoc.save()

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

    const body = new URLSearchParams({
      ...easebuzzPayload,
      hash,
    })

    // --- Call Easebuzz initiateLink API ---
    const payBaseUrl = getPayBaseUrl()
    console.log('[payment] calling Easebuzz initiateLink', {
      url: `${payBaseUrl}/payment/initiateLink`,
      txnid,
      bookingId,
      amount: easebuzzPayload.amount,
    })

    const gatewayResponse = await axios.post(
      `${payBaseUrl}/payment/initiateLink`,
      body.toString(),
      {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        timeout: 15000,
      },
    )

    // --- Parse Easebuzz response ---
    // Expected: { status: 1, data: "<access_key>" }
    const rawData = gatewayResponse.data
    const gatewayData = typeof rawData === 'string' ? (() => { try { return JSON.parse(rawData) } catch { return { data: rawData } } })() : rawData || {}

    console.log('[payment] Easebuzz initiateLink response', {
      status: gatewayData.status,
      hasData: !!gatewayData.data,
      dataPreview: typeof gatewayData.data === 'string' ? gatewayData.data.substring(0, 40) + '...' : typeof gatewayData.data,
    })

    // Easebuzz returns status=1 on success with an access_key in data field
    // The payment URL is: https://testpay.easebuzz.in/pay/<access_key>
    let paymentUrl = ''

    if (gatewayData.status === 1 && gatewayData.data) {
      // Standard response: { status: 1, data: "access_key_string" }
      const accessKey = String(gatewayData.data).trim()
      paymentUrl = `${payBaseUrl}/pay/${accessKey}`
    } else if (gatewayData.payment_url || gatewayData.paymentUrl || gatewayData.payment_link) {
      // Fallback: some versions return a direct URL
      paymentUrl = gatewayData.payment_url || gatewayData.paymentUrl || gatewayData.payment_link
    }

    if (!paymentUrl) {
      console.error('[payment] Easebuzz did not return a valid payment URL', gatewayData)
      return res.status(502).json({
        success: false,
        message: 'Payment gateway did not return a valid payment URL.',
        gateway: gatewayData,
      })
    }

    console.log('[payment] payment URL generated', { txnid, paymentUrl: paymentUrl.substring(0, 60) + '...' })

    return res.status(200).json({
      success: true,
      payment_url: paymentUrl,
      txnid,
      bookingId,
    })
  } catch (error) {
    console.error('[payment] initiatePayment ERROR', error?.response?.data || error.message || error)
    return res.status(500).json({ success: false, message: 'Failed to initiate payment.' })
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// 2. PAYMENT SUCCESS CALLBACK (surl)
//    POST /api/payment/success
//    Easebuzz POSTs form-urlencoded data here after successful payment.
//    We verify the reverse hash, update DB, and redirect user.
// ═══════════════════════════════════════════════════════════════════════════
export const paymentSuccess = async (req, res) => {
  const payload = req.body || {}
  const salt = process.env.EASEBUZZ_SALT
  const clientUrl = getClientUrl()

  console.log('[payment] surl callback received', {
    txnid: payload.txnid,
    status: payload.status,
    easepayid: payload.easepayid,
    amount: payload.amount,
  })

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
  let booking = null

  try {
    // --- Update Payment record ---
    const payment = await Payment.findOneAndUpdate(
      { transactionId: txnid },
      {
        $set: {
          status: 'SUCCESS',
          providerPaymentId: payload.easepayid ? String(payload.easepayid) : undefined,
          method: payload.mode ? String(payload.mode).toUpperCase() : 'UPI',
          gatewayMeta: normalizeGatewayMeta(payload),
          completedAt: new Date(),
          failureReason: undefined,
        }
      },
      { new: true },
    )

    // --- Update Booking to CONFIRMED ---
    if (payment?.bookingId) {
      booking = await Booking.findByIdAndUpdate(
        payment.bookingId,
        {
          $set: {
            status: 'CONFIRMED',
            paymentStatus: 'SUCCESS',
            paymentMode: 'ONLINE',
          }
        },
        { new: true },
      )
    }

    // --- Fix 5: Audit Log ---
    await recordAuditLog({
      actorId: booking?.issuedBy || '507f1f77bcf86cd799439011', // System placeholder if no actor
      action: 'PAYMENT_SUCCESS_SURL',
      entity: 'Payment',
      entityId: payment?._id,
      after: { status: 'SUCCESS', txnid, easepayid: payload.easepayid },
      context: { 
        txnid, 
        bookingId: booking?.bookingId, 
        amount: payload.amount, 
        raw: JSON.stringify(payload) 
      }
    })


    const bookingCode = booking?.bookingId || String(payload.udf1 || '').trim()
    const redirectUrl = `${clientUrl}/booking-confirmed?txnid=${encodeURIComponent(txnid)}&bookingId=${encodeURIComponent(bookingCode)}`

    console.log('[payment] surl → redirecting to', redirectUrl)
    return res.redirect(302, redirectUrl)
  } catch (error) {
    console.error('[payment] paymentSuccess ERROR', error)
    
    // Fallback log if transaction failed
    recordAuditLog({
      actorId: '507f1f77bcf86cd799439011',
      action: 'PAYMENT_SUCCESS_FAILURE',
      entity: 'Payment',
      entityId: '507f1f77bcf86cd799439011', // Placeholder
      context: { txnid, error: error.message, raw: JSON.stringify(payload) }
    }).catch(() => {})

    return res.status(500).send('Payment success handler failed.')
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// 3. PAYMENT FAILURE CALLBACK (furl)
//    POST /api/payment/failure
//    Easebuzz POSTs form-urlencoded data here when payment fails or is dropped.
// ═══════════════════════════════════════════════════════════════════════════
export const paymentFailure = async (req, res) => {
  const payload = req.body || {}
  const clientUrl = getClientUrl()
  const txnid = String(payload.txnid || '').trim()

  console.log('[payment] furl callback received', {
    txnid,
    status: payload.status,
    error: payload.error_Message || payload.error,
  })

  try {
    // --- Update Payment record ---
    const payment = await Payment.findOneAndUpdate(
      { transactionId: txnid },
      {
        status: 'FAILED',
        providerPaymentId: payload.easepayid ? String(payload.easepayid) : undefined,
        method: payload.mode ? String(payload.mode).toUpperCase() : 'UPI',
        gatewayMeta: normalizeGatewayMeta(payload),
        failureReason: payload.error_Message ? String(payload.error_Message) : 'Payment failed or was dropped by user.',
        completedAt: new Date(),
      },
      { new: true },
    )

    // --- Update Booking status ---
    if (payment?.bookingId) {
      await Booking.findByIdAndUpdate(payment.bookingId, {
        status: 'PENDING',
        paymentStatus: 'FAILED',
        paymentMode: 'ONLINE',
      })
    }

    // --- Fix 5: Audit Log ---
    await recordAuditLog({
      actorId: '507f1f77bcf86cd799439011',
      action: 'PAYMENT_FAILURE_FURL',
      entity: 'Payment',
      entityId: payment?._id,
      after: { status: 'FAILED', txnid },
      context: { txnid, error: payload.error_Message, raw: JSON.stringify(payload) }
    })

    const redirectUrl = `${clientUrl}/payment-failed?txnid=${encodeURIComponent(txnid)}`
    console.log('[payment] furl → redirecting to', redirectUrl)
    return res.redirect(302, redirectUrl)
  } catch (error) {
    console.error('[payment] paymentFailure ERROR', error)
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
    const gatewayStatus = String(payload.status || '').toLowerCase()

    if (gatewayStatus === 'success') {
      // --- Payment successful ---
      const payment = await Payment.findOneAndUpdate(
        { transactionId: txnid },
        {
          $set: {
            status: 'SUCCESS',
            providerPaymentId: payload.easepayid ? String(payload.easepayid) : undefined,
            method: payload.mode ? String(payload.mode).toUpperCase() : 'UPI',
            gatewayMeta: normalizeGatewayMeta(payload),
            completedAt: new Date(),
            failureReason: undefined,
            webhookReceivedAt: new Date(),
          }
        },
        { new: true },
      )

      if (payment?.bookingId) {
        await Booking.findByIdAndUpdate(payment.bookingId, {
          $set: {
            status: 'CONFIRMED',
            paymentStatus: 'SUCCESS',
            paymentMode: 'ONLINE',
          }
        })
      }

      // --- Fix 5: Audit Log ---
      await recordAuditLog({
        actorId: '507f1f77bcf86cd799439011',
        action: 'PAYMENT_WEBHOOK_SUCCESS',
        entity: 'Payment',
        entityId: payment?._id,
        context: { txnid, bookingId: payment?.bookingId, amount: payload.amount, raw: JSON.stringify(payload) }
      })

      console.log('[webhook] booking CONFIRMED via webhook', { txnid, bookingId: payment?.bookingId })
    } else {
      // --- Payment failed/dropped/bounced ---
      const payment = await Payment.findOneAndUpdate(
        { transactionId: txnid },
        {
          $set: {
            status: 'FAILED',
            providerPaymentId: payload.easepayid ? String(payload.easepayid) : undefined,
            method: payload.mode ? String(payload.mode).toUpperCase() : 'UPI',
            gatewayMeta: normalizeGatewayMeta(payload),
            failureReason: payload.error_Message ? String(payload.error_Message) : `Payment ${gatewayStatus}`,
            completedAt: new Date(),
            webhookReceivedAt: new Date(),
          }
        },
        { new: true },
      )

      if (payment?.bookingId) {
        await Booking.findByIdAndUpdate(payment.bookingId, {
          $set: {
            status: 'PENDING',
            paymentStatus: 'FAILED',
            paymentMode: 'ONLINE',
          }
        })
      }

      // --- Fix 5: Audit Log ---
      await recordAuditLog({
        actorId: '507f1f77bcf86cd799439011',
        action: 'PAYMENT_WEBHOOK_FAILURE',
        entity: 'Payment',
        entityId: payment?._id,
        context: { txnid, status: gatewayStatus, raw: JSON.stringify(payload) }
      })

      console.log('[webhook] booking FAILED via webhook', { txnid, status: gatewayStatus })
    }
  } catch (error) {
    console.error('[webhook] processing ERROR', error)
    
    // Fail-safe audit log for lost webhooks
    recordAuditLog({
      actorId: '507f1f77bcf86cd799439011',
      action: 'PAYMENT_WEBHOOK_CRITICAL_ERROR',
      entity: 'Payment',
      entityId: '507f1f77bcf86cd799439011',
      context: { error: error.message, raw: JSON.stringify(payload) }
    }).catch(() => {})
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// 5. TRANSACTION VERIFY (server-side verification via Easebuzz API)
//    POST /api/payment/verify/:txnid
//    Calls Easebuzz Transaction Retrieve API to double-check payment status.
//    This is MANDATORY per Easebuzz docs for production reliability.
// ═══════════════════════════════════════════════════════════════════════════
export const verifyTransaction = async (req, res) => {
  try {
    const txnid = String(req.params.txnid || '').trim()
    if (!txnid) {
      return res.status(400).json({ success: false, message: 'txnid is required.' })
    }

    const key = process.env.EASEBUZZ_KEY
    const salt = process.env.EASEBUZZ_SALT

    if (!key || !salt) {
      return res.status(500).json({ success: false, message: 'Payment gateway credentials not configured.' })
    }

    // Look up the payment to get amount, email, phone for the hash
    const payment = await Payment.findOne({ transactionId: txnid }).lean()
    if (!payment) {
      return res.status(404).json({ success: false, message: 'No payment found for this transaction ID.' })
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
    console.log('[payment] Transaction Retrieve response', {
      status: verifyData?.status,
      txnStatus: verifyData?.msg?.status || verifyData?.data?.status,
    })

    // --- Reconcile: update local DB if gateway says something different ---
    const txnStatus = String(
      verifyData?.msg?.status || verifyData?.data?.status || ''
    ).toLowerCase()

    if (txnStatus === 'success' && payment.status !== 'SUCCESS') {
      // Gateway says success but our DB didn't record it (missed callback)
      console.log('[payment] reconciling missed success for', txnid)
      await Payment.findByIdAndUpdate(payment._id, {
        status: 'SUCCESS',
        completedAt: new Date(),
        failureReason: undefined,
      })
      if (booking) {
        await Booking.findByIdAndUpdate(booking._id, {
          status: 'CONFIRMED',
          paymentStatus: 'SUCCESS',
        })
      }
    } else if ((txnStatus === 'failure' || txnStatus === 'dropped') && payment.status === 'PENDING') {
      console.log('[payment] reconciling missed failure for', txnid)
      await Payment.findByIdAndUpdate(payment._id, {
        status: 'FAILED',
        completedAt: new Date(),
        failureReason: `Payment ${txnStatus} (verified via API)`,
      })
      if (booking) {
        await Booking.findByIdAndUpdate(booking._id, {
          status: 'PENDING',
          paymentStatus: 'FAILED',
        })
      }
    }

    return res.status(200).json({
      success: true,
      txnid,
      gatewayStatus: txnStatus,
      localStatus: payment.status,
      verifyData,
    })
  } catch (error) {
    console.error('[payment] verifyTransaction ERROR', error?.response?.data || error.message || error)
    return res.status(500).json({ success: false, message: 'Failed to verify transaction with payment gateway.' })
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// 6. BOOKING STATUS (for frontend confirmation page)
//    GET /api/payment/status/:txnid
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

    const booking = payment.bookingId ? await Booking.findById(payment.bookingId).lean() : null
    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking not found for txnid.' })
    }

    const isPaid = payment.status === 'SUCCESS' || payment.status === 'PAID'
    let ticket = null
    let qrImage = null
    
    if (isPaid && booking.tickets && booking.tickets.length > 0) {
      ticket = await Ticket.findById(booking.tickets[0]).lean()
      if (ticket && ticket.qrToken) {
        try {
          qrImage = await generateQrDataUrl(ticket.qrToken)
        } catch (e) {
          console.error('[payment] failed to generate qr image for ticket', e)
        }
      }
    }

    return res.status(200).json({
      success: true,
      txnid,
      booking,
      ticketId: (isPaid && ticket) ? ticket.ticketId : 'Payment Pending',
      qrImage: isPaid ? qrImage : null,
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
    })
  } catch (error) {
    console.error('[payment] getBookingStatus ERROR', error)
    return res.status(500).json({ success: false, message: 'Failed to fetch booking status.' })
  }
}
