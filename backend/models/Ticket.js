import mongoose from 'mongoose'

const ticketItemSchema = new mongoose.Schema(
  {
    itemCode: { type: String, required: true, lowercase: true, trim: true },
    itemLabel: { type: String, required: true, trim: true },
    category: { type: String, required: true, enum: ['zoo', 'parking', 'camera', 'transport'] },
    quantity: { type: Number, required: true, min: 1, max: 100 },
    unitPrice: { type: Number, required: true, min: 0 },
    amount: { type: Number, required: true, min: 0 },
  },
  { _id: false },
)

const ticketSchema = new mongoose.Schema(
  {
    // Human-readable ticket identifier; generated server-side to avoid client spoofing or guessing
    ticketId: { type: String, required: true, unique: true, trim: true },

    // Secure QR token hash; the raw token never gets persisted or indexed to avoid leakage
    qrToken: { type: String, required: true, unique: true, select: false },

    // Store visit date as a date-only value to prevent timezone drift during validation
    visitDate: { type: Date, required: true },
    issueDate: { type: Date, default: Date.now, required: true },

    paymentMode: {
      type: String,
      required: true,
      enum: ['CASH', 'UPI', 'CARD', 'ONLINE', 'SPLIT'],
    },
    paymentStatus: {
      type: String,
      enum: ['PAID'],
      default: 'PAID',
      required: true,
    },

    ticketSource: {
      type: String,
      enum: ['ONLINE', 'COUNTER'],
      default: 'ONLINE',
      required: true,
    },

    paymentBreakup: {
      type: new mongoose.Schema(
        {
          cash: { type: Number, min: 0, default: 0 },
          upi: { type: Number, min: 0, default: 0 },
        },
        { _id: false },
      ),
      default: undefined,
    },

    items: { type: [ticketItemSchema], default: [], validate: (items) => items.length > 0 },
    totalAmount: { type: Number, required: true, min: 0 },

    qrUsed: { type: Boolean, default: false, required: true },
    qrUsedAt: { type: Date },
  usedVia: { type: String, enum: ['QR_TOKEN', 'MANUAL_TICKET_ID'] },
  usedAt: { type: Date },
    // Visitor contact details captured at booking time. Stored for record-keeping and support.
    visitorName: { type: String, required: true, trim: true },
    visitorEmail: { type: String, trim: true },
    visitorMobile: { type: String, required: true, trim: true },
  },
  { timestamps: true },
)

// Index visitDate to speed up gate-side validations while keeping QR hash unique
ticketSchema.index({ visitDate: 1, qrUsed: 1 })

export const Ticket = mongoose.model('Ticket', ticketSchema)
