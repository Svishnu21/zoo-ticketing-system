import express from 'express'
import { asyncHandler, ApiError } from '../utils/errors.js'
import { getBookingDayStatus, getBookingDayStatusesInRange } from '../services/bookingDayOverrideService.js'

const router = express.Router()

router.get(
  '/status',
  asyncHandler(async (req, res) => {
    const date = typeof req.query.date === 'string' ? req.query.date : ''
    if (!date) {
      throw ApiError.badRequest('Date query parameter is required.')
    }

    const status = await getBookingDayStatus(date)

    res.json({
      success: true,
      data: status,
    })
  }),
)

router.get(
  '/calendar',
  asyncHandler(async (req, res) => {
    const fromIso = typeof req.query.from === 'string' ? req.query.from : ''
    const toIso = typeof req.query.to === 'string' ? req.query.to : ''

    if (!fromIso || !toIso) {
      throw ApiError.badRequest('Both from and to query parameters are required.')
    }

    const data = await getBookingDayStatusesInRange({ fromIso, toIso })

    res.json({
      success: true,
      data,
    })
  }),
)

export default router
