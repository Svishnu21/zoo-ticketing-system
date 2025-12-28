import express from 'express'
import { getBooking, postBooking } from '../controllers/bookingController.js'

const router = express.Router()

router.post('/create', postBooking)
router.post('/', postBooking) // legacy fallback
router.get('/:id', getBooking)

export default router
