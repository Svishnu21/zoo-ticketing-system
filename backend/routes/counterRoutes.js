import express from 'express'
import {
  getCounterHistoryController,
  getCounterPricingController,
  getCounterRecent,
  getCounterTicketController,
  postCounterBooking,
} from '../controllers/counterBookingController.js'

const router = express.Router()

router.get('/pricing', getCounterPricingController)
router.post('/bookings', postCounterBooking)
router.get('/recent', getCounterRecent)
router.get('/history', getCounterHistoryController)
router.get('/tickets/:id', getCounterTicketController)

export default router
