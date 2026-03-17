import mongoose from 'mongoose'

const { Schema } = mongoose

const DEFAULT_FREEZE_MESSAGE = ''

const systemSettingSchema = new Schema(
  {
    freezeOnlineBooking: { type: Boolean, default: false },
    freezeMessage: { type: String, default: DEFAULT_FREEZE_MESSAGE },
    updatedAt: { type: Date, default: Date.now },
  },
  {
    collection: 'system_settings',
    versionKey: false,
  },
)

export const SystemSetting = mongoose.models.SystemSetting || mongoose.model('SystemSetting', systemSettingSchema)
export { DEFAULT_FREEZE_MESSAGE }
