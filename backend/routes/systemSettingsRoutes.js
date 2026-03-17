import express from 'express'
import { asyncHandler } from '../utils/errors.js'
import { requireAuth, requireRole } from '../middleware/authMiddleware.js'
import { getSystemSettings, updateFreezeControl } from '../services/systemSettingsService.js'

const router = express.Router()

router.get(
  '/',
  asyncHandler(async (_req, res) => {
    const settings = await getSystemSettings()

    res.json({
      success: true,
      data: settings,
    })
  }),
)

router.post(
  '/update-freeze',
  requireAuth,
  requireRole('ADMIN'),
  asyncHandler(async (req, res) => {
    const freezeOnlineBooking = req.body?.freezeOnlineBooking
    const freezeMessage = req.body?.freezeMessage

    const settings = await updateFreezeControl({
      freezeOnlineBooking,
      freezeMessage,
    })

    res.json({
      success: true,
      message: 'Settings updated successfully.',
      data: settings,
    })
  }),
)

export default router
