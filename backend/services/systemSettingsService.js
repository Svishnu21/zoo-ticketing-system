import { ApiError } from '../utils/errors.js'
import { DEFAULT_FREEZE_MESSAGE, SystemSetting } from '../models/SystemSetting.js'

const normalizeFreezeMessage = (value) => {
  if (typeof value !== 'string') return DEFAULT_FREEZE_MESSAGE
  const trimmed = value.trim()
  return trimmed || DEFAULT_FREEZE_MESSAGE
}

const presentSystemSettings = (doc = null) => ({
  freezeOnlineBooking: Boolean(doc?.freezeOnlineBooking),
  freezeMessage: normalizeFreezeMessage(doc?.freezeMessage),
  updatedAt: doc?.updatedAt instanceof Date ? doc.updatedAt.toISOString() : undefined,
})

export const getSystemSettings = async () => {
  const row = await SystemSetting.findOne({})
    .select('freezeOnlineBooking freezeMessage updatedAt')
    .sort({ updatedAt: -1 })
    .lean()

  return presentSystemSettings(row)
}

export const updateFreezeControl = async ({ freezeOnlineBooking, freezeMessage } = {}) => {
  if (typeof freezeOnlineBooking !== 'boolean') {
    throw ApiError.badRequest('freezeOnlineBooking must be a boolean value.')
  }

  const normalizedMessage = normalizeFreezeMessage(freezeMessage)

  await SystemSetting.findOneAndUpdate(
    {},
    {
      $set: {
        freezeOnlineBooking,
        freezeMessage: normalizedMessage,
      },
    },
    {
      upsert: true,
      runValidators: true,
      setDefaultsOnInsert: true,
      returnDocument: 'after',
      sort: { updatedAt: -1 },
    },
  )

  return getSystemSettings()
}
