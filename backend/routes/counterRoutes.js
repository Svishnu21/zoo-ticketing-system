import express from 'express'
import {
  getCounterHistoryController,
  getCounterPricingController,
  getCounterRecent,
  getCounterTicketController,
  postCounterBooking,
  getCounterMissingItemsController,
} from '../controllers/counterBookingController.js'
import { postCounterLogin } from '../controllers/counterAuthController.js'
import { requireAuth, requireRole } from '../middleware/authMiddleware.js'
import {
  validate,
  counterLoginRules,
  counterBookingRules,
  counterTicketIdRules,
} from '../middleware/requestValidation.js'

const router = express.Router()

router.post('/login', validate(counterLoginRules), postCounterLogin)

router.use(requireAuth, requireRole('ADMIN', 'COUNTER', 'SCANNER'))

router.get('/pricing', getCounterPricingController)
router.post('/bookings', validate(counterBookingRules), postCounterBooking)
router.get('/recent', getCounterRecent)
router.get('/history', getCounterHistoryController)
router.get('/tickets/:id', validate(counterTicketIdRules), getCounterTicketController)
router.get('/health/missing-items', getCounterMissingItemsController)

export default router
