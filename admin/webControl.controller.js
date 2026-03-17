import express from 'express'
import mongoose from 'mongoose'
import { asyncHandler } from '../backend/utils/errors.js'
import {
  listBookingDayOverrides,
  upsertBookingDayOverride,
} from '../backend/services/bookingDayOverrideService.js'
import {
  getSystemSettings,
  updateFreezeControl,
} from '../backend/services/systemSettingsService.js'

const router = express.Router()

const resolveCreatedBy = (req) => {
  const candidate = req?.user?._id || req?.auth?.userId || req?.auth?.sub
  if (!candidate || !mongoose.isValidObjectId(candidate)) return undefined
  return candidate
}

router.get(
  '/web-control/overrides',
  asyncHandler(async (req, res) => {
    const fromIso = typeof req.query.from === 'string' ? req.query.from : undefined
    const toIso = typeof req.query.to === 'string' ? req.query.to : undefined
    const limit = req.query.limit

    const overrides = await listBookingDayOverrides({ fromIso, toIso, limit })

    res.json({
      success: true,
      data: { overrides },
    })
  }),
)

router.post(
  '/web-control/overrides',
  asyncHandler(async (req, res) => {
    const dateIso = typeof req.body?.date === 'string' ? req.body.date : ''
    const status = typeof req.body?.status === 'string' ? req.body.status : ''
    const createdBy = resolveCreatedBy(req)

    const override = await upsertBookingDayOverride({
      dateIso,
      status,
      ...(createdBy ? { createdBy } : {}),
    })

    res.json({
      success: true,
      message: 'Override saved successfully.',
      data: { override },
    })
  }),
)

router.get(
  '/api/system-settings',
  asyncHandler(async (_req, res) => {
    const settings = await getSystemSettings()

    res.json({
      success: true,
      data: settings,
    })
  }),
)

router.post(
  '/api/system-settings/update-freeze',
  asyncHandler(async (req, res) => {
    const freezeOnlineBooking = req.body?.freezeOnlineBooking
    const freezeMessage = req.body?.freezeMessage

    const settings = await updateFreezeControl({
      freezeOnlineBooking,
      freezeMessage,
    })

    res.json({
      success: true,
      message: 'Emergency booking control updated successfully.',
      data: settings,
    })
  }),
)

export default router
