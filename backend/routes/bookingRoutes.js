import express from 'express'
import { getBooking, postBooking } from '../controllers/bookingController.js'
import { getActivePricing } from '../controllers/pricingController.js'
import { validate, bookingCreateRules, bookingIdRules } from '../middleware/requestValidation.js'
import { requireAuth, requireRole } from '../middleware/authMiddleware.js'

const router = express.Router()

// Direct ticket creation bypasses the payment gateway (createBooking defaults to paymentStatus PAID),
// so it is restricted to authenticated admins. Public online bookings must go through
// /api/payment/initiate, where tickets are issued only after verified payment.
// The counter flow uses /api/counter and is not affected.
router.post('/create', requireAuth, requireRole('ADMIN'), validate(bookingCreateRules), postBooking)
router.post('/', requireAuth, requireRole('ADMIN'), validate(bookingCreateRules), postBooking) // legacy fallback
router.get('/pricing', getActivePricing)
router.get('/:id', validate(bookingIdRules), getBooking)

export default router
