import mongoose from 'mongoose'

const paymentSchema = new mongoose.Schema(
  {
    ticketId: { type: mongoose.Schema.Types.ObjectId, ref: 'Ticket', required: true, unique: true },
    provider: { type: String },
    providerPaymentId: { type: String, unique: true, sparse: true },
    amount: { type: Number, required: true, min: 0 },
    currency: { type: String, default: 'INR' },
    status: {
      type: String,
      required: true,
      enum: ['initiated', 'authorized', 'captured', 'failed', 'refunded'],
    },
    mode: { type: String, required: true, enum: ['online', 'upi', 'card', 'cash', 'pos'] },
    requestedAt: { type: Date, default: Date.now },
    completedAt: { type: Date },
    failureReason: { type: String },
    metadata: { type: mongoose.Schema.Types.Mixed },
  },
  { timestamps: true },
)

paymentSchema.index({ ticketId: 1 }, { unique: true })
paymentSchema.index({ providerPaymentId: 1 }, { unique: true, sparse: true })
paymentSchema.index({ status: 1 })

export const Payment = mongoose.model('Payment', paymentSchema)
