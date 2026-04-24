import express from 'express'
import { getBooking, postBooking } from '../controllers/bookingController.js'
import { getActivePricing } from '../controllers/pricingController.js'
import { validate, bookingCreateRules, bookingIdRules } from '../middleware/requestValidation.js'

const router = express.Router()

router.post('/create', validate(bookingCreateRules), postBooking)
router.post('/', validate(bookingCreateRules), postBooking) // legacy fallback
router.get('/pricing', getActivePricing)
router.get('/:id', validate(bookingIdRules), getBooking)

export default router
