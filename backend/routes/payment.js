// Defines payment API endpoints for Easebuzz integration.
//
// Routes:
//   POST /api/payment/initiate         → Initiate a payment (frontend calls this)
//   POST /api/payment/success          → surl callback from Easebuzz (on successful payment)
//   POST /api/payment/failure          → furl callback from Easebuzz (on failed payment)
//   POST /api/payment/webhook          → Async webhook from Easebuzz (server-to-server)
//   POST /api/payment/verify/:txnid    → Server-side verification via Easebuzz Transaction API
//   GET  /api/payment/status/:txnid    → Get booking + payment status for frontend
//
import express from 'express'

import {
  getBookingStatus,
  initiatePayment,
  paymentFailure,
  paymentSuccess,
  paymentWebhook,
  verifyTransaction,
} from '../controllers/paymentController.js'

const router = express.Router()

// Frontend-initiated
router.post('/initiate', initiatePayment)

// Easebuzz callbacks (surl / furl) — Easebuzz POSTs form-urlencoded data
router.post('/success', paymentSuccess)
router.post('/failure', paymentFailure)

// Easebuzz async webhook — server-to-server push notification
router.post('/webhook', paymentWebhook)

// Server-side verification — calls Easebuzz Transaction Retrieve API
router.post('/verify/:txnid', verifyTransaction)

// Frontend query — booking confirmation page uses this
router.get('/status/:txnid', getBookingStatus)

export default router
