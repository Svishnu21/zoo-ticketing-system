import mongoose from 'mongoose'

const { Schema } = mongoose

const paymentSchema = new Schema(
  {
    // Booking association (1:1). Keep sparse during migration.
    bookingId: { type: Schema.Types.ObjectId, ref: 'Booking', unique: true, sparse: true, index: true },

    // Legacy linkage to a single ticket (historical data)
    ticketId: { type: Schema.Types.ObjectId, ref: 'Ticket', unique: true, sparse: true, index: true },

    // Gateway transaction identifier (business id for reconciliation)
    transactionId: { type: String, required: true, unique: true, trim: true, index: true },

    // Payment method (coerced to uppercase)
    method: {
      type: String,
      enum: ['CARD', 'UPI', 'NETBANKING', 'CASH', 'POS', 'card', 'upi', 'netbanking', 'cash', 'pos'],
      required: true,
      set: (v) => (typeof v === 'string' ? v.toUpperCase() : v),
      index: true,
    },

    // Amount authorized/paid
    amount: { type: Number, required: true, min: 0 },
    currency: { type: String, default: 'INR', minlength: 3, maxlength: 3 },

    // Payment lifecycle (coerced to uppercase; accept PAID for compatibility)
    status: {
      type: String,
      enum: ['PENDING', 'SUCCESS', 'FAILED', 'REFUNDED', 'PAID', 'pending', 'success', 'failed', 'refunded', 'paid'],
      required: true,
      set: (v) => (typeof v === 'string' ? v.toUpperCase() : v),
      index: true,
    },

    // Provider metadata (non-sensitive only)
    provider: { type: String, trim: true },
    providerPaymentId: { type: String, unique: true, sparse: true, trim: true },
    gatewayMeta: { type: Map, of: String },
    maskedAccount: { type: String },

    // Timing details
    requestedAt: { type: Date, default: Date.now },
    completedAt: { type: Date },
    failureReason: { type: String },

    // Soft delete flag
    isActive: { type: Boolean, default: true, index: true },

    // Audit fields
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', index: true },
    source: { type: String, enum: ['ONLINE', 'COUNTER', 'ADMIN'], required: true, default: 'ONLINE', index: true },
  },
  { timestamps: true, versionKey: false },
)

paymentSchema.index({ method: 1, status: 1, createdAt: -1 })
paymentSchema.index({ status: 1, createdAt: -1 })

export const Payment = mongoose.model('Payment', paymentSchema)
