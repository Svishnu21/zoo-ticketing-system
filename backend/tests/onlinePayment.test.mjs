// Regression tests for the online payment lifecycle, admin bookings/dashboard/reports, and counter isolation.
//
// Runs against a THROWAWAY database on the LOCAL MongoDB (never the configured app database) and
// mocks every Easebuzz HTTP call. Run with:  npm run test:payments
import 'dotenv/config'
import { after, before, describe, test } from 'node:test'
import assert from 'node:assert/strict'
import crypto from 'node:crypto'
import express from 'express'
import mongoose from 'mongoose'
import axios from 'axios'

// ---------------------------------------------------------------------------
// Safety: local, uniquely named test database only.
// ---------------------------------------------------------------------------
const baseUri = new URL(process.env.TEST_MONGODB_URI || process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017')
if (!['127.0.0.1', 'localhost'].includes(baseUri.hostname)) {
  throw new Error(`Refusing to run tests against non-local MongoDB host "${baseUri.hostname}".`)
}
const TEST_DB = `kzp_payment_test_${process.pid}_${Date.now()}`
baseUri.pathname = `/${TEST_DB}`
if (!baseUri.searchParams.has('authSource') && baseUri.username) baseUri.searchParams.set('authSource', 'admin')

process.env.EASEBUZZ_KEY = 'TESTKEY'
process.env.EASEBUZZ_SALT = 'TESTSALT'
process.env.EASEBUZZ_ENV = 'test'
process.env.BASE_URL = 'http://localhost:5000'
process.env.CLIENT_URL = 'http://localhost:5173'

// ---------------------------------------------------------------------------
// Easebuzz mock — every axios.post goes through `gateway.handler`.
// ---------------------------------------------------------------------------
const gateway = { calls: [], handler: null }
const realAxiosPost = axios.post
axios.post = async (url, body, config) => {
  gateway.calls.push({ url, body })
  if (!gateway.handler) throw new Error(`Unexpected gateway call: ${url}`)
  return gateway.handler(url, body, config)
}
const gatewayOk = () => {
  gateway.handler = async (url) => {
    if (url.includes('/payment/initiateLink')) {
      return { data: { status: 1, data: `ACCESS${crypto.randomBytes(6).toString('hex')}` } }
    }
    throw new Error(`unexpected ${url}`)
  }
}

const { Booking } = await import('../models/Booking.js')
const { Payment } = await import('../models/Payment.js')
const { Ticket } = await import('../models/Ticket.js')
const { OtpSession } = await import('../models/OtpSession.js')
const payment = await import('../controllers/paymentController.js')
const { verifyOtp } = await import('../controllers/otpController.js')
const { createCounterBooking } = await import('../services/counterBookingService.js')
const { todayIsoDate } = await import('../utils/dates.js')
const { errorHandler } = await import('../utils/errors.js')
const bookingsRouter = (await import('../../admin/bookings.controller.js')).default
const analyticsRouter = (await import('../../admin/analytics.controller.js')).default
const reportsRouter = (await import('../../admin/reports.controller.js')).default
const paymentAttemptsRouter = (await import('../../admin/paymentAttempts.controller.js')).default
const bookingRoutes = (await import('../routes/bookingRoutes.js')).default

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const mockRes = () => {
  const res = { statusCode: 200, body: undefined, redirectUrl: undefined }
  res.status = (code) => { res.statusCode = code; return res }
  res.json = (body) => { res.body = body; return res }
  res.send = (body) => { res.body = body; return res }
  res.redirect = (code, url) => { res.statusCode = code; res.redirectUrl = url; return res }
  return res
}

const call = async (handler, { body = {}, params = {}, headers = {} } = {}) => {
  const res = mockRes()
  const req = { body, params, query: {}, get: (name) => headers[name.toLowerCase()] }
  await handler(req, res, (error) => { if (error) throw error })
  return res
}

const nextVisitDate = (offsetDays = 2) => {
  const date = new Date(`${todayIsoDate()}T00:00:00.000Z`)
  date.setUTCDate(date.getUTCDate() + offsetDays)
  while (date.getUTCDay() === 2) date.setUTCDate(date.getUTCDate() + 1) // skip Tuesday closure
  return date.toISOString().slice(0, 10)
}
const VISIT_DATE = nextVisitDate()

const attemptId = () => crypto.randomUUID()

const onlineBody = (overrides = {}) => ({
  customerName: 'Test Visitor',
  customerEmail: 'visitor@example.com',
  customerPhone: '9876543210',
  visitDate: VISIT_DATE,
  items: [{ itemCode: 'adultEntry', label: 'Entry - Adult', quantity: 2 }],
  totalAmount: 100,
  attemptId: attemptId(),
  ...overrides,
})

// Easebuzz reverse hash: salt|status|udf10..udf1|email|firstname|productinfo|amount|txnid|key
const signCallback = (fields) => {
  const payload = {
    key: 'TESTKEY',
    productinfo: 'Zoo Ticket Booking',
    firstname: 'Test Visitor',
    email: 'visitor@example.com',
    udf2: '', udf3: '', udf4: '', udf5: '', udf6: '', udf7: '', udf8: '', udf9: '', udf10: '',
    ...fields,
  }
  const seq = ['TESTSALT', payload.status, payload.udf10, payload.udf9, payload.udf8, payload.udf7, payload.udf6,
    payload.udf5, payload.udf4, payload.udf3, payload.udf2, payload.udf1, payload.email, payload.firstname,
    payload.productinfo, payload.amount, payload.txnid, payload.key].map((v) => (v === undefined || v === null ? '' : String(v).trim()))
  payload.hash = crypto.createHash('sha512').update(seq.join('|')).digest('hex')
  return payload
}

const callbackFor = async (bookingRef, status, extra = {}) => {
  const booking = await Booking.findOne({ bookingId: bookingRef }).lean()
  const pay = await Payment.findOne({ bookingId: booking._id }).lean()
  return signCallback({
    txnid: pay.transactionId,
    status,
    amount: Number(pay.amount).toFixed(2),
    udf1: booking.bookingId,
    easepayid: `E${crypto.randomBytes(5).toString('hex').toUpperCase()}`,
    mode: 'UPI',
    ...extra,
  })
}

const initiateOk = async (overrides) => {
  gatewayOk()
  const res = await call(payment.initiatePayment, { body: onlineBody(overrides) })
  assert.equal(res.statusCode, 200, JSON.stringify(res.body))
  return res.body
}

const waitFor = async (predicate, ms = 3000) => {
  const end = Date.now() + ms
  while (Date.now() < end) {
    if (await predicate()) return
    await new Promise((resolve) => setTimeout(resolve, 25))
  }
  throw new Error('condition not met in time')
}

// Admin API test server (auth is covered by admin.routes.js; routers are mounted directly here).
let server
let baseUrl
const adminGet = async (path) => {
  const response = await fetch(`${baseUrl}/admin${path}`)
  const body = await response.json()
  assert.equal(response.status, 200, JSON.stringify(body))
  return body
}
const adminPost = async (path) => {
  const response = await fetch(`${baseUrl}/admin${path}`, { method: 'POST' })
  return { status: response.status, body: await response.json() }
}

const range = `from=${todayIsoDate()}&to=${VISIT_DATE}`

// Expected confirmed ONLINE totals, accumulated as scenarios confirm bookings.
const expected = { onlineRevenue: 0, onlineTickets: 0, quantities: {} }
const expectConfirmed = (items) => {
  expected.onlineTickets += 1
  for (const item of items) {
    const unit = { adultEntry: 50, childEntry: 10, childBelow5: 0 }[item.itemCode]
    expected.onlineRevenue += unit * item.quantity
    const key = item.itemCode.toLowerCase()
    expected.quantities[key] = (expected.quantities[key] || 0) + item.quantity
  }
}

before(async () => {
  await mongoose.connect(baseUri.toString(), { serverSelectionTimeoutMS: 5000 })
  assert.ok(mongoose.connection.db.databaseName.startsWith('kzp_payment_test_'))
  await Promise.all([Booking.init(), Payment.init(), Ticket.init()])

  const app = express()
  app.use(express.json())
  app.use('/admin', bookingsRouter, analyticsRouter, reportsRouter, paymentAttemptsRouter)
  app.use('/api/bookings', bookingRoutes)
  app.use(errorHandler)
  await new Promise((resolve) => { server = app.listen(0, resolve) })
  baseUrl = `http://127.0.0.1:${server.address().port}`
})

after(async () => {
  axios.post = realAxiosPost
  server?.close()
  if (mongoose.connection.db?.databaseName?.startsWith('kzp_payment_test_')) {
    await mongoose.connection.db.dropDatabase()
  }
  await mongoose.disconnect()
})

// ---------------------------------------------------------------------------
// Scenarios
// ---------------------------------------------------------------------------
describe('online payment lifecycle', () => {
  test('OTP verification only verifies the customer — no booking, payment or ticket', async () => {
    const before = await Promise.all([Booking.countDocuments(), Payment.countDocuments(), Ticket.countDocuments()])
    await OtpSession.create({
      mobile: '9876543210',
      otpHash: crypto.createHash('sha256').update('1234').digest('hex'),
      expiresAt: new Date(Date.now() + 60000),
      lastSentAt: new Date(),
    })
    const res = await call(verifyOtp, { body: { mobile: '9876543210', otp: '1234' } })
    assert.equal(res.body?.verified, true)
    const afterCounts = await Promise.all([Booking.countDocuments(), Payment.countDocuments(), Ticket.countDocuments()])
    assert.deepEqual(afterCounts, before)
  })

  test('1. payment URL generated → PENDING attempt, no ticket, nothing counted', async () => {
    const body = await initiateOk()
    assert.match(body.payment_url, /\/pay\/ACCESS/)
    const booking = await Booking.findOne({ bookingId: body.bookingId }).lean()
    assert.equal(booking.status, 'PENDING')
    assert.equal(booking.paymentStatus, 'PENDING')
    assert.equal(booking.tickets.length, 0)
    assert.equal(await Ticket.countDocuments({ bookingRef: booking._id }), 0)
    const pay = await Payment.findOne({ bookingId: booking._id }).select('+paymentUrl').lean()
    assert.equal(pay.status, 'PENDING')
    assert.equal(pay.paymentUrl, body.payment_url)
  })

  test('2. Easebuzz "Merchant is blocked" → INITIATION_FAILED, no ticket', async () => {
    gateway.handler = async () => ({ data: { status: 0, data: 'Merchant is blocked.' } })
    const res = await call(payment.initiatePayment, { body: onlineBody({ customerPhone: '9000000002' }) })
    assert.equal(res.statusCode, 502)
    assert.equal(res.body.message, 'Payment gateway did not return a valid payment URL.')
    const booking = await Booking.findOne({ visitorMobile: '9000000002' }).lean()
    assert.equal(booking.status, 'INITIATION_FAILED')
    assert.equal(booking.paymentStatus, 'FAILED')
    const pay = await Payment.findOne({ bookingId: booking._id }).lean()
    assert.equal(pay.status, 'INITIATION_FAILED')
    assert.match(pay.failureReason, /Merchant is blocked/)
    assert.equal(await Ticket.countDocuments({ bookingRef: booking._id }), 0)
  })

  test('3. gateway HTTP 502 → INITIATION_FAILED, no ticket', async () => {
    gateway.handler = async () => {
      const error = new Error('Request failed with status code 502')
      error.response = { status: 502, statusText: 'Bad Gateway', data: '<html>502 Bad Gateway</html>' }
      throw error
    }
    const res = await call(payment.initiatePayment, { body: onlineBody({ customerPhone: '9000000003' }) })
    assert.equal(res.statusCode, 502)
    const booking = await Booking.findOne({ visitorMobile: '9000000003' }).lean()
    assert.equal(booking.status, 'INITIATION_FAILED')
    const pay = await Payment.findOne({ bookingId: booking._id }).lean()
    assert.match(pay.failureReason, /HTTP 502/)
    assert.equal(await Ticket.countDocuments({ bookingRef: booking._id }), 0)
  })

  test('4. gateway reports pending → attempt stays PENDING, no ticket', async () => {
    const { bookingId } = await initiateOk({ customerPhone: '9000000004' })
    const res = mockRes()
    await payment.paymentWebhook({ body: await callbackFor(bookingId, 'pending') }, res)
    await new Promise((resolve) => setTimeout(resolve, 150))
    const booking = await Booking.findOne({ bookingId }).lean()
    assert.equal(booking.status, 'PENDING')
    assert.equal(await Ticket.countDocuments({ bookingRef: booking._id }), 0)
  })

  test('5. explicit gateway failure → FAILED; unsigned failure callback changes nothing', async () => {
    const { bookingId } = await initiateOk({ customerPhone: '9000000005' })
    const forged = { ...(await callbackFor(bookingId, 'failure')), hash: 'deadbeef' }
    const forgedRes = await call(payment.paymentFailure, { body: forged })
    assert.match(forgedRes.redirectUrl, /payment-failed/)
    assert.equal((await Booking.findOne({ bookingId }).lean()).status, 'PENDING')

    const res = await call(payment.paymentFailure, { body: await callbackFor(bookingId, 'failure', { error_Message: 'Bank declined' }) })
    assert.match(res.redirectUrl, /payment-failed/)
    const booking = await Booking.findOne({ bookingId }).lean()
    assert.equal(booking.status, 'FAILED')
    assert.equal(booking.paymentStatus, 'FAILED')
    assert.equal((await Payment.findOne({ bookingId: booking._id }).lean()).status, 'FAILED')
    assert.equal(await Ticket.countDocuments({ bookingRef: booking._id }), 0)
  })

  test('6. verified success → CONFIRMED with exactly one ticket and QR', async () => {
    const items = [{ itemCode: 'adultEntry', label: 'Entry - Adult', quantity: 2 }]
    const { bookingId, txnid } = await initiateOk({ customerPhone: '9000000006', items })
    const res = await call(payment.paymentSuccess, { body: await callbackFor(bookingId, 'success') })
    assert.match(res.redirectUrl, /booking-confirmed/)
    expectConfirmed(items)

    const booking = await Booking.findOne({ bookingId }).lean()
    assert.equal(booking.status, 'CONFIRMED')
    assert.equal(booking.tickets.length, 1)
    const tickets = await Ticket.find({ bookingRef: booking._id }).lean()
    assert.equal(tickets.length, 1)
    assert.equal(tickets[0].ticketId, bookingId)
    assert.equal(tickets[0].paymentStatus, 'SUCCESS')
    assert.equal(tickets[0].totalAmount, 100)

    const status = await call(payment.getBookingStatus, { params: { txnid } })
    assert.equal(status.body.confirmed, true)
    assert.equal(status.body.ticketId, bookingId)
    assert.ok(status.body.qrImage?.startsWith('data:image'))
  })

  test('6b. tampered success (bad hash) is rejected; amount mismatch is not confirmed', async () => {
    const { bookingId } = await initiateOk({ customerPhone: '9000000016' })
    const tampered = { ...(await callbackFor(bookingId, 'success')), hash: 'f'.repeat(128) }
    const res = await call(payment.paymentSuccess, { body: tampered })
    assert.equal(res.statusCode, 400)
    assert.equal((await Booking.findOne({ bookingId }).lean()).status, 'PENDING')

    const mismatch = await callbackFor(bookingId, 'success', { amount: '1.00' })
    await call(payment.paymentSuccess, { body: mismatch })
    const booking = await Booking.findOne({ bookingId }).lean()
    assert.equal(booking.status, 'RECOVERY_REQUIRED')
    assert.match(booking.statusReason, /VERIFICATION_MISMATCH/)
    assert.equal(await Ticket.countDocuments({ bookingRef: booking._id }), 0)
    assert.equal((await Payment.findOne({ bookingId: booking._id }).lean()).status, 'PENDING')
  })

  test('7. payment success but ticket generation fails → RECOVERY_REQUIRED, then safe recovery', async () => {
    const items = [{ itemCode: 'adultEntry', label: 'Entry - Adult', quantity: 1 }]
    const { bookingId, txnid } = await initiateOk({ customerPhone: '9000000007', items })
    const realCreate = Ticket.create
    Ticket.create = async () => { throw new Error('simulated ticket store outage') }
    try {
      await call(payment.paymentSuccess, { body: await callbackFor(bookingId, 'success') })
    } finally {
      Ticket.create = realCreate
    }
    let booking = await Booking.findOne({ bookingId }).lean()
    assert.equal(booking.status, 'RECOVERY_REQUIRED')
    assert.equal(booking.paymentStatus, 'SUCCESS')
    assert.equal((await Payment.findOne({ transactionId: txnid }).lean()).status, 'SUCCESS')
    assert.equal(await Ticket.countDocuments({ bookingRef: booking._id }), 0)

    const status = await call(payment.getBookingStatus, { params: { txnid } })
    assert.equal(status.body.confirmed, false)
    assert.equal(status.body.recoveryRequired, true)

    // Not counted while recovery is pending
    const attempts = await adminGet(`/payment-attempts?status=RECOVERY_REQUIRED`)
    assert.ok(attempts.data.some((row) => row.bookingId === bookingId && row.canRecoverTicket))

    const first = await adminPost(`/payment-attempts/${bookingId}/recover-ticket`)
    assert.equal(first.status, 200, JSON.stringify(first.body))
    const second = await adminPost(`/payment-attempts/${bookingId}/recover-ticket`)
    assert.equal(second.body.ticketId, first.body.ticketId)
    expectConfirmed(items)

    booking = await Booking.findOne({ bookingId }).lean()
    assert.equal(booking.status, 'CONFIRMED')
    assert.equal(await Ticket.countDocuments({ bookingRef: booking._id }), 1)
    assert.equal(gateway.calls.filter((c) => !c.url.includes('initiateLink')).length, 0, 'recovery must not call the gateway')
  })

  test('8. duplicate / concurrent callbacks produce exactly one ticket', async () => {
    const items = [{ itemCode: 'childEntry', label: 'Entry - Child', quantity: 3 }]
    const { bookingId } = await initiateOk({ customerPhone: '9000000008', items, totalAmount: 30 })
    const success = await callbackFor(bookingId, 'success')
    await Promise.all([
      call(payment.paymentSuccess, { body: success }),
      call(payment.paymentSuccess, { body: success }),
      payment.paymentWebhook({ body: success }, mockRes()),
      call(payment.paymentFailure, { body: await callbackFor(bookingId, 'failure') }),
    ])
    await payment.paymentWebhook({ body: success }, mockRes())
    await new Promise((resolve) => setTimeout(resolve, 200))
    expectConfirmed(items)
    const booking = await Booking.findOne({ bookingId }).lean()
    assert.equal(booking.status, 'CONFIRMED')
    assert.equal(booking.tickets.length, 1)
    assert.equal(await Ticket.countDocuments({ bookingRef: booking._id }), 1)
    assert.equal((await Payment.findOne({ bookingId: booking._id }).lean()).status, 'SUCCESS')
  })

  test('9. repeated Proceed clicks with one attempt → one booking; new attempt after failure is allowed', async () => {
    gatewayOk()
    const key = attemptId()
    const body = onlineBody({ customerPhone: '9000000009', attemptId: key })
    const results = await Promise.all(Array.from({ length: 6 }, () => call(payment.initiatePayment, { body })))
    assert.equal(await Booking.countDocuments({ visitorMobile: '9000000009' }), 1)
    assert.equal(await Payment.countDocuments({ bookingId: (await Booking.findOne({ visitorMobile: '9000000009' }))._id }), 1)
    for (const res of results) assert.ok([200, 409].includes(res.statusCode), `${res.statusCode} ${JSON.stringify(res.body)}`)

    const replay = await call(payment.initiatePayment, { body })
    assert.equal(replay.statusCode, 200)
    assert.equal(replay.body.replayed, true)
    assert.equal(await Booking.countDocuments({ visitorMobile: '9000000009' }), 1)

    // Failed attempt, then a genuinely new attempt (new key) for the same customer.
    gateway.handler = async () => ({ data: { status: 0, data: 'Merchant is blocked.' } })
    const failedKey = attemptId()
    await call(payment.initiatePayment, { body: onlineBody({ customerPhone: '9000000019', attemptId: failedKey }) })
    const sameKeyAgain = await call(payment.initiatePayment, { body: onlineBody({ customerPhone: '9000000019', attemptId: failedKey }) })
    assert.equal(sameKeyAgain.statusCode, 409)
    assert.equal(sameKeyAgain.body.retryWithNewAttempt, true)
    gatewayOk()
    const retry = await call(payment.initiatePayment, { body: onlineBody({ customerPhone: '9000000019' }) })
    assert.equal(retry.statusCode, 200)
    assert.equal(await Booking.countDocuments({ visitorMobile: '9000000019' }), 2)
  })

  test('10. multiple ticket categories in one booking keep per-category quantities', async () => {
    const items = [
      { itemCode: 'adultEntry', label: 'Entry - Adult', quantity: 2 },
      { itemCode: 'childEntry', label: 'Entry - Child', quantity: 3 },
      { itemCode: 'childBelow5', label: 'Entry - Child (below 5)', quantity: 1 },
    ]
    const { bookingId } = await initiateOk({ customerPhone: '9000000010', items, totalAmount: 130 })
    await call(payment.paymentSuccess, { body: await callbackFor(bookingId, 'success') })
    expectConfirmed(items)
    const ticket = await Ticket.findOne({ ticketId: bookingId }).lean()
    assert.equal(ticket.totalAmount, 130)
    assert.equal(ticket.quantity, 6)
    assert.deepEqual(ticket.items.map((i) => [i.itemCode, i.quantity, i.amount]), [
      ['adultentry', 2, 100],
      ['childentry', 3, 30],
      ['childbelow5', 1, 0],
    ])
  })

  test('gateway Retrieve API: mismatched or missing txnid is never applied; only the exact txnid is', async () => {
    const items = [{ itemCode: 'adultEntry', label: 'Entry - Adult', quantity: 1 }]
    const { bookingId, txnid } = await initiateOk({ customerPhone: '9000000011', items, totalAmount: 50 })
    const booking = await Booking.findOne({ bookingId }).lean()
    const successEntry = (overrides) => ({ status: 'success', amount: '50.00', udf1: bookingId, easepayid: 'EOTHER123', mode: 'UPI', ...overrides })

    const unchanged = async () => {
      assert.equal((await Booking.findById(booking._id).lean()).status, 'PENDING')
      assert.equal((await Payment.findOne({ transactionId: txnid }).lean()).status, 'PENDING')
      assert.equal(await Ticket.countDocuments({ bookingRef: booking._id }), 0)
    }

    const responses = [
      { status: true, msg: successEntry({ txnid: 'SOMEOTHERTXN00000001' }) }, // single object, different txnid
      { status: true, msg: [successEntry({ txnid: 'SOMEOTHERTXN00000002' })] }, // array, no matching entry (old code took [0])
      { status: true, msg: successEntry({}) }, // txnid missing
      { status: true, data: [successEntry({ txnid: ` ${txnid}X` })] }, // near-miss txnid
    ]
    for (const response of responses) {
      gateway.handler = async (url) => {
        assert.match(url, /\/transaction\/v1\/retrieve$/)
        return { data: response }
      }
      const result = await payment.reconcileTransactionWithGateway(txnid)
      assert.equal(result.gatewayStatus, '')
      assert.equal(result.reconciled, false)
      await unchanged()
    }

    // The exact txnid is accepted even when it is not the first entry.
    gateway.handler = async () => ({
      data: { status: true, msg: [successEntry({ txnid: 'SOMEOTHERTXN00000003' }), successEntry({ txnid, easepayid: 'EMATCH1' })] },
    })
    const result = await payment.reconcileTransactionWithGateway(txnid)
    assert.equal(result.gatewayStatus, 'success')
    assert.equal(result.outcome, 'CONFIRMED')
    expectConfirmed(items)
    assert.equal((await Booking.findById(booking._id).lean()).status, 'CONFIRMED')
    assert.equal(await Ticket.countDocuments({ bookingRef: booking._id }), 1)
    const pay = await Payment.findOne({ transactionId: txnid }).lean()
    assert.equal(pay.status, 'SUCCESS')
    assert.equal(pay.providerPaymentId, 'EMATCH1')
  })

  test('public direct ticket creation endpoint is closed', async () => {
    const response = await fetch(`${baseUrl}/api/bookings/create`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ visitorName: 'x', visitorMobile: '9999999999', visitDate: VISIT_DATE, items: [{ itemCode: 'adultEntry', quantity: 1 }] }),
    })
    assert.equal(response.status, 401)
    assert.equal(await Ticket.countDocuments({ visitorMobile: '9999999999' }), 0)
  })
})

describe('counter isolation and historical records', () => {
  let counterCash
  let counterSplit
  const legacy = {}

  test('11. counter cash booking unchanged', async () => {
    counterCash = await createCounterBooking({
      visitDate: VISIT_DATE,
      paymentMode: 'CASH',
      issuedBy: new mongoose.Types.ObjectId().toString(),
      items: [{ itemCode: 'adultEntry', quantity: 3 }],
      cashAmount: 150,
      totalAmount: 150,
    })
    const ticket = await Ticket.findOne({ ticketId: counterCash.ticket.ticketId }).lean()
    assert.equal(ticket.ticketSource, 'COUNTER')
    assert.equal(ticket.paymentStatus, 'PAID')
    assert.equal(ticket.paymentMode, 'CASH')
    assert.equal(ticket.totalAmount, 150)
    assert.match(ticket.ticketId, /^KZP-\d{6}-[A-Z0-9]{6}$/)
  })

  test('12. counter split-payment booking unchanged', async () => {
    counterSplit = await createCounterBooking({
      visitDate: VISIT_DATE,
      paymentMode: 'SPLIT',
      issuedBy: new mongoose.Types.ObjectId().toString(),
      items: [{ itemCode: 'adultEntry', quantity: 2 }, { itemCode: 'childEntry', quantity: 1 }],
      cashAmount: 60,
      upiAmount: 50,
      totalAmount: 110,
    })
    const ticket = await Ticket.findOne({ ticketId: counterSplit.ticket.ticketId }).lean()
    assert.equal(ticket.paymentMode, 'SPLIT')
    assert.deepEqual({ cash: ticket.paymentBreakup.cash, upi: ticket.paymentBreakup.upi }, { cash: 60, upi: 50 })
    assert.equal(ticket.totalAmount, 110)
  })

  test('13. existing records: historical successes counted, historical orphans excluded, nothing modified', async () => {
    const visitDate = new Date(`${VISIT_DATE}T00:00:00.000Z`)
    const mk = async ({ ticketId, ticketStatus, bookingStatus, bookingPaymentStatus, paymentStatus, amount }) => {
      const booking = await Booking.create({
        bookingId: ticketId, bookingCode: ticketId, ticketSource: 'ONLINE', bookingType: 'PREBOOK',
        visitDate, totalAmount: amount, paymentStatus: bookingPaymentStatus, paymentMode: 'ONLINE', status: bookingStatus,
        items: [{ itemCode: 'adultEntry', label: 'Entry - Adult', unitPrice: 50, quantity: amount / 50, lineTotal: amount }],
        visitorName: 'Legacy', visitorMobile: '9111111111', customerPhone: '9111111111',
      })
      const ticket = await Ticket.create({
        ticketId, bookingId: ticketId, bookingRef: booking._id, visitDate, paymentMode: 'ONLINE', paymentStatus: ticketStatus,
        ticketSource: 'ONLINE', items: [{ itemCode: 'adultEntry', itemLabel: 'Entry - Adult', category: 'zoo', quantity: amount / 50, unitPrice: 50, amount }],
        totalAmount: amount, qrToken: crypto.randomBytes(16).toString('hex'), verificationTokenHash: crypto.randomBytes(32).toString('hex'),
        visitorName: 'Legacy', visitorMobile: '9111111111',
      })
      await Booking.updateOne({ _id: booking._id }, { $set: { tickets: [ticket._id] } })
      if (paymentStatus) {
        await Payment.create({ bookingId: booking._id, transactionId: `LEGACY${ticketId}`, method: 'UPI', amount, status: paymentStatus, provider: 'EASEBUZZ', providerPaymentId: paymentStatus === 'SUCCESS' ? `E${ticketId}` : undefined })
      }
      return { booking, ticket }
    }
    legacy.paidNoPayment = await mk({ ticketId: 'KZP-010126-LEG001', ticketStatus: 'PAID', bookingStatus: 'CONFIRMED', bookingPaymentStatus: 'PAID', amount: 50 })
    legacy.successTicketPending = await mk({ ticketId: 'KZP-010126-LEG002', ticketStatus: 'PENDING', bookingStatus: 'CONFIRMED', bookingPaymentStatus: 'SUCCESS', paymentStatus: 'SUCCESS', amount: 100 })
    legacy.orphanPending = await mk({ ticketId: 'KZP-010126-LEG003', ticketStatus: 'PENDING', bookingStatus: 'PENDING', bookingPaymentStatus: 'PENDING', paymentStatus: 'PENDING', amount: 500 })
    legacy.orphanNoPayment = await mk({ ticketId: 'KZP-010126-LEG004', ticketStatus: 'PENDING', bookingStatus: 'PENDING', bookingPaymentStatus: 'PENDING', amount: 250 })
    expectConfirmed([{ itemCode: 'adultEntry', quantity: 1 }])
    expectConfirmed([{ itemCode: 'adultEntry', quantity: 2 }])

    const snapshot = JSON.stringify(await Ticket.find({ ticketId: /LEG/ }).sort({ ticketId: 1 }).lean())

    const list = await adminGet(`/bookings?visitDate=${VISIT_DATE}`)
    const ids = list.data.map((row) => row.ticketId)
    assert.ok(ids.includes('KZP-010126-LEG001'))
    assert.ok(ids.includes('KZP-010126-LEG002'))
    assert.ok(!ids.includes('KZP-010126-LEG003'), 'unpaid legacy attempt must not be listed')
    assert.ok(!ids.includes('KZP-010126-LEG004'), 'legacy attempt without payment must not be listed')
    assert.equal(list.pagination.total, expected.onlineTickets)
    assert.ok(list.data.every((row) => ['PAID', 'SUCCESS'].includes(row.paymentStatus)))

    // Reads never modify historical records
    assert.equal(JSON.stringify(await Ticket.find({ ticketId: /LEG/ }).sort({ ticketId: 1 }).lean()), snapshot)
  })

  test('dashboard: confirmed online counts/revenue exact; failed attempts contribute zero; counter unchanged', async () => {
    const dashboard = await adminGet(`/dashboard?${range}`)
    assert.equal(dashboard.summary.onlineCount, expected.onlineTickets)
    assert.equal(dashboard.summary.onlineRevenue, expected.onlineRevenue)
    assert.equal(dashboard.summary.counterCount, 2)
    assert.equal(dashboard.summary.counterRevenue, 260)
    assert.equal(dashboard.summary.totalRevenue, expected.onlineRevenue + 260)

    const qty = Object.fromEntries(dashboard.ticketTypes.map((row) => [row._id, row.quantity]))
    // counter: adult 3 + 2, child 1
    assert.equal(qty.adultentry, (expected.quantities.adultentry || 0) + 5)
    assert.equal(qty.childentry, (expected.quantities.childentry || 0) + 1)

    const attempts = dashboard.onlinePaymentAttempts
    assert.ok(attempts.initiationFailed.count >= 3)
    assert.ok(attempts.failed.count >= 1)
    assert.ok(attempts.pending.count >= 1)
  })

  test('reports: online amounts from verified payments only; counter rows unchanged', async () => {
    const online = await adminGet(`/reports?type=ticket-wise&source=ONLINE&${range}`)
    const onlineQty = Object.fromEntries(online.rows.map((row) => [row._id, row.quantity]))
    const onlineAmount = online.rows.reduce((sum, row) => sum + row.amount, 0)
    assert.equal(onlineAmount, expected.onlineRevenue)
    assert.equal(online.reconciliation.ticketTotal, expected.onlineRevenue)
    assert.equal(online.reconciliation.matches, true)
    for (const [code, quantity] of Object.entries(expected.quantities)) assert.equal(onlineQty[code], quantity, code)
    assert.ok(online.onlinePaymentAttempts.initiationFailed.count >= 3)

    const counter = await adminGet(`/reports?type=ticket-wise&source=COUNTER&${range}`)
    const counterQty = Object.fromEntries(counter.rows.map((row) => [row._id, row.quantity]))
    assert.deepEqual(counterQty, { adultentry: 5, childentry: 1 })
    assert.equal(counter.reconciliation.ticketTotal, 260)

    const daily = await adminGet(`/reports?type=daily-summary&${range}`)
    const day = daily.rows.find((row) => row._id === VISIT_DATE)
    assert.equal(day.onlineTickets, expected.onlineTickets)
    assert.equal(day.onlineRevenue, expected.onlineRevenue)
    assert.equal(day.counterTickets, 2)
    assert.equal(day.counterRevenue, 260)
  })

  test('legacy pending booking that already has a ticket reuses it on verified success', async () => {
    const { booking, ticket } = legacy.orphanPending
    await call(payment.paymentSuccess, {
      body: signCallback({ txnid: `LEGACY${booking.bookingId}`, status: 'success', amount: '500.00', udf1: booking.bookingId, easepayid: 'ELEGACY3' }),
    })
    const tickets = await Ticket.find({ bookingRef: booking._id }).lean()
    assert.equal(tickets.length, 1)
    assert.equal(String(tickets[0]._id), String(ticket._id))
    assert.equal(tickets[0].paymentStatus, 'SUCCESS')
    assert.equal((await Booking.findById(booking._id).lean()).status, 'CONFIRMED')
  })

  test('legacy ZOO- booking paid without ticket: recovery issues one KZP ticket', async () => {
    const booking = await Booking.create({
      bookingId: 'ZOO-20260423-TST1', bookingCode: 'ZOO-20260423-TST1', ticketSource: 'ONLINE', bookingType: 'PREBOOK',
      visitDate: new Date(`${VISIT_DATE}T00:00:00.000Z`), totalAmount: 50, paymentStatus: 'SUCCESS', paymentMode: 'ONLINE', status: 'CONFIRMED',
      items: [{ itemCode: 'adultEntry', label: 'Entry - Adult', unitPrice: 50, quantity: 1, lineTotal: 50 }],
      visitorName: 'Legacy Zoo', visitorMobile: '9222222222',
    })
    await Payment.create({ bookingId: booking._id, transactionId: 'LEGACYZOO1', method: 'UPI', amount: 50, status: 'SUCCESS', providerPaymentId: 'EZOO1' })
    const [a, b] = await Promise.all([
      adminPost(`/payment-attempts/${booking.bookingId}/recover-ticket`),
      adminPost(`/payment-attempts/${booking.bookingId}/recover-ticket`),
    ])
    const ok = [a, b].filter((r) => r.status === 200)
    assert.ok(ok.length >= 1)
    assert.equal(await Ticket.countDocuments({ bookingRef: booking._id }), 1)
    const ticket = await Ticket.findOne({ bookingRef: booking._id }).lean()
    assert.match(ticket.ticketId, /^KZP-\d{6}-[A-Z0-9]{6}$/)
    assert.equal(ticket.bookingId, 'ZOO-20260423-TST1')
  })

  test('payment attempts audit view preserves every attempt', async () => {
    const all = await adminGet('/payment-attempts')
    const s = all.summary
    assert.ok(s.CONFIRMED.count >= 5)
    assert.ok(s.INITIATION_FAILED.count >= 3)
    assert.ok(s.FAILED.count >= 1)
    assert.ok(s.PENDING.count >= 1)
    const failed = await adminGet('/payment-attempts?status=INITIATION_FAILED&search=9000000002')
    assert.equal(failed.data.length, 1)
    assert.match(failed.data[0].statusReason, /Merchant is blocked/)
  })
})
