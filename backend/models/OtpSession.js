// OTP session model — stores hashed OTPs with expiry and attempt tracking
import mongoose from 'mongoose'

const { Schema } = mongoose

const otpSessionSchema = new Schema(
  {
    mobile: { type: String, required: true, index: true, trim: true },
    otpHash: { type: String, required: true },
    expiresAt: { type: Date, required: true, index: { expires: 0 } },
    lastSentAt: { type: Date, required: true, default: Date.now },
    attempts: { type: Number, default: 0 },
    verified: { type: Boolean, default: false },
    smsStatus: { type: String, enum: ['SENT', 'FAILED', 'FALLBACK'], default: 'SENT' },
  },
  { timestamps: true, versionKey: false },
)

otpSessionSchema.index({ mobile: 1, verified: 1 })

export const OtpSession = mongoose.model('OtpSession', otpSessionSchema)
