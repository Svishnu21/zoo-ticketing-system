import mongoose from 'mongoose'

const scanLogSchema = new mongoose.Schema(
  {
    ticketId: { type: String },
    qrTokenHash: { type: String, default: null },
    method: { type: String, enum: ['QR_TOKEN', 'MANUAL_TICKET_ID'], default: 'QR_TOKEN', required: true },
    reason: { type: String, trim: true, maxlength: 500 },
    result: {
      type: String,
      required: true,
      enum: ['success', 'already_used', 'invalid_token', 'invalid_date', 'not_found', 'error'],
    },
    gateId: { type: String },
    scannedAt: { type: Date, required: true, default: Date.now },
    clientInfo: {
      ip: { type: String },
      userAgent: { type: String },
      deviceId: { type: String },
    },
  },
  { timestamps: true },
)

scanLogSchema.index({ ticketId: 1 })
scanLogSchema.index({ qrTokenHash: 1 })
scanLogSchema.index({ scannedAt: 1 })

export const ScanLog = mongoose.model('ScanLog', scanLogSchema)
