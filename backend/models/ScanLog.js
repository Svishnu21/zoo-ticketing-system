import mongoose from 'mongoose'

const { Schema } = mongoose

const scanLogSchema = new Schema(
  {
    // Reference to the ticket document (ObjectId) for joins
    ticketRef: { type: Schema.Types.ObjectId, ref: 'Ticket', index: true },

    // Human-readable ticket code (legacy KZP- format) for quick lookups
    ticketId: { type: String, trim: true, index: true },

    // Optional booking reference
    bookingId: { type: Schema.Types.ObjectId, ref: 'Booking', index: true },

    // Hash or opaque QR token (never store raw sensitive details)
    qrTokenHash: { type: String, default: null, index: true },

    // Scan channel used
    method: { type: String, enum: ['QR_TOKEN', 'MANUAL_TICKET_ID'], default: 'QR_TOKEN', required: true },

    // Free-text reason for manual overrides
    reason: { type: String, trim: true, maxlength: 500 },

    // Outcome of the scan attempt (append-only)
    result: {
      type: String,
      required: true,
      enum: ['success', 'already_used', 'invalid_token', 'invalid_date', 'not_found', 'error'],
      index: true,
    },

    // Gate/counter identifier
    gateId: { type: String, trim: true },

    // Physical counter (if known)
    counterId: { type: Schema.Types.ObjectId, ref: 'Counter', index: true },

    // Scanner user performing the action
    scannerId: { type: Schema.Types.ObjectId, ref: 'User', index: true },

    // Timestamp of scan (explicit for aggregations)
    scannedAt: { type: Date, required: true, default: Date.now, index: true },

    // Client context (non-sensitive)
    clientInfo: {
      ip: { type: String },
      userAgent: { type: String },
      deviceId: { type: String },
    },

    // Soft delete flag
    isActive: { type: Boolean, default: true, index: true },

    // Audit fields
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', index: true },
    source: { type: String, enum: ['ONLINE', 'COUNTER', 'ADMIN'], required: true, default: 'COUNTER', index: true },
  },
  { timestamps: true, versionKey: false },
)

scanLogSchema.index({ result: 1, scannedAt: -1 })
scanLogSchema.index({ gateId: 1, scannedAt: -1 })

// Enforce append-only behavior
scanLogSchema.pre(['updateOne', 'findOneAndUpdate', 'findByIdAndUpdate'], function preventUpdates() {
  throw new Error('ScanLog is append-only and cannot be updated.')
})
scanLogSchema.pre(['deleteOne', 'findOneAndDelete', 'findByIdAndDelete'], function preventDeletes() {
  throw new Error('ScanLog is append-only and cannot be deleted.')
})

export const ScanLog = mongoose.model('ScanLog', scanLogSchema)
