import express from 'express'
import { asyncHandler } from '../utils/errors.js'
import { SystemSetting } from '../models/SystemSetting.js'
import { validate, freezeControlRules } from '../middleware/requestValidation.js'

const router = express.Router()

const normalizeSettings = (doc) => ({
  freezeOnlineBooking: Boolean(doc?.freezeOnlineBooking),
  freezeMessage: typeof doc?.freezeMessage === 'string' ? doc.freezeMessage : '',
})

router.get(
  '/system-settings',
  asyncHandler(async (_req, res) => {
    const settings = await SystemSetting.findOne({})
      .sort({ updatedAt: -1 })
      .lean()

    if (!settings) {
      const fallback = {
        freezeOnlineBooking: false,
        freezeMessage: '',
      }

      return res.json({
        ...fallback,
        success: true,
        data: fallback,
      })
    }

    const payload = normalizeSettings(settings)

    return res.json({
      ...payload,
      success: true,
      data: payload,
    })
  }),
)

router.post(
  '/system-settings/update-freeze',
  validate(freezeControlRules),
  asyncHandler(async (req, res) => {
    const freezeOnlineBooking = req.body?.freezeOnlineBooking
    const freezeMessage = req.body?.freezeMessage

    if (typeof freezeOnlineBooking !== 'boolean') {
      return res.status(400).json({
        message: 'freezeOnlineBooking must be a boolean value.',
      })
    }

    const settings = await SystemSetting.findOneAndUpdate(
      {},
      {
        freezeOnlineBooking,
        freezeMessage: typeof freezeMessage === 'string' ? freezeMessage : '',
        updatedAt: new Date(),
      },
      {
        upsert: true,
        runValidators: true,
        setDefaultsOnInsert: true,
        returnDocument: 'after',
      },
    ).lean()

    const payload = normalizeSettings(settings)

    return res.json({
      ...payload,
      success: true,
      message: 'Emergency booking control updated successfully.',
      data: payload,
    })
  }),
)

export default router
