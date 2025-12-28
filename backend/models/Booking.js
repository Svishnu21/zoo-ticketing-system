import mongoose from 'mongoose'

const bookingItemSchema = new mongoose.Schema(
  {
    id: { type: String, required: true },
    label: { type: String, required: true },
    unitPrice: { type: Number, required: true, min: 0 },
    quantity: { type: Number, required: true, min: 1 },
    lineTotal: { type: Number, required: true, min: 0 },
  },
  { _id: false },
)

const bookingSchema = new mongoose.Schema(
  {
    bookingCode: { type: String, required: true, unique: true },
    visitDate: { type: String, required: true },
    ticketType: { type: String, required: true },
    paymentMode: { type: String, required: true },
    items: { type: [bookingItemSchema], default: [], validate: (items) => items.length > 0 },
    calculatedTotalAmount: { type: Number, required: true, min: 0 },
    submittedTotalAmount: { type: Number, min: 0 },
    visitorName: { type: String, required: true, trim: true },
    visitorEmail: { type: String, trim: true },
    visitorMobile: { type: String, required: true, trim: true },
    submittedOtp: { type: String, trim: true },
    qrTokenHash: { type: String, required: true, unique: true },
    qrStatus: {
      type: String,
      enum: ['unused', 'used', 'expired'],
      default: 'unused',
      required: true,
    },
    qrIssuedAt: { type: Date, default: Date.now },
    qrUsedAt: { type: Date },
    gateId: { type: String },
  },
  { timestamps: true },
)

bookingSchema.index({ qrTokenHash: 1 }, { unique: true })
bookingSchema.index({ bookingCode: 1 }, { unique: true })
bookingSchema.index({ visitDate: 1, qrStatus: 1 })

export const Booking = mongoose.model('Booking', bookingSchema)
