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

const router = express.Router()

router.post('/login', postCounterLogin)

router.use(requireAuth, requireRole('ADMIN', 'COUNTER'))

router.get('/pricing', getCounterPricingController)
router.post('/bookings', postCounterBooking)
router.get('/recent', getCounterRecent)
router.get('/history', getCounterHistoryController)
router.get('/tickets/:id', getCounterTicketController)
router.get('/health/missing-items', getCounterMissingItemsController)

export default router
