import mongoose from 'mongoose'

const { Schema } = mongoose

// Line items per ticket; stored once per ticket to avoid recomputation
const ticketItemSchema = new Schema(
  {
    // Tariff code or category key
    itemCode: { type: String, required: true, lowercase: true, trim: true },
    // Customer-facing label
    itemLabel: { type: String, required: true, trim: true },
    // Product grouping for reporting
    category: { type: String, required: true, enum: ['zoo', 'parking', 'camera', 'transport'] },
    // Quantity purchased for this line; dynamic upper bound by source
    quantity: {
      type: Number,
      required: true,
      min: 1,
    },
    // Unit price at time of sale
    unitPrice: { type: Number, required: true, min: 0 },
    // Snapshot of line total (unitPrice * quantity)
    amount: { type: Number, required: true, min: 0 },
    // Optional pricing reference (keeps tariff table normalized)
    ticketPricingId: { type: Schema.Types.ObjectId, ref: 'TicketPricing' },
  },
  { _id: false },
)

// Override any legacy max validators so counter-issued tickets are unlimited while
// online bookings still enforce their previous ceiling.
const quantityPath = ticketItemSchema.path('quantity')
if (quantityPath) {
  quantityPath.validators = (quantityPath.validators || []).filter((v) => v.type !== 'max')
  quantityPath.validate({
    validator(value) {
      const ownerDoc = typeof this?.ownerDocument === 'function' ? this.ownerDocument() : undefined
      const parentDoc = typeof this?.parent === 'function' ? this.parent() : undefined
      const source = ownerDoc?.ticketSource || ownerDoc?.source || parentDoc?.ticketSource || parentDoc?.source
      if (source === 'COUNTER') return Number.isInteger(value) && value >= 1
      return Number.isInteger(value) && value >= 1 && value <= 100
    },
    message: 'Quantity exceeds the allowed limit for this ticket source.',
  })
}

const ticketSchema = new Schema(
  {
    // ObjectId reference to parent booking (canonical link)
    bookingRef: { type: Schema.Types.ObjectId, ref: 'Booking', index: true },

    // Human-readable booking identifier copied for reporting
    bookingId: {
      type: String,
      required: true,
      index: true,
      default: function fallbackBookingId() {
        return this.ticketId
      },
    },

    // Pricing reference for single-ticket lookups
    ticketPricingId: { type: Schema.Types.ObjectId, ref: 'TicketPricing', index: true },

    // Human-friendly ticket code shown to guests
    ticketId: { type: String, required: true, unique: true, trim: true, index: true },

    // Alternate code field if a separate QR payload identifier is used
    ticketCode: { type: String, unique: true, sparse: true, trim: true },

    // Secure QR token; stored server-side only
    qrToken: { type: String, required: true, unique: true, select: false },

    // Secure verification token (hashed); stored only as hash for URL-based validation
    verificationTokenHash: { type: String, required: true, unique: true, select: false },

    // Ticket lifecycle state
    status: { type: String, enum: ['ISSUED', 'USED', 'CANCELLED', 'EXPIRED'], default: 'ISSUED', index: true },

    // Entry status for gate reporting
    entryStatus: { type: String, enum: ['NOT_ENTERED', 'ENTERED', 'CANCELLED'], default: 'NOT_ENTERED', index: true },

    // Date of visit (UTC-normalized date-only)
    visitDate: { type: Date, required: true, index: true },
    // When ticket was issued
    issueDate: { type: Date, default: Date.now, required: true, index: true },

    // Payment channel and status (coerced to uppercase)
    paymentMode: {
      type: String,
      required: true,
      enum: ['CASH', 'UPI', 'CARD', 'ONLINE', 'SPLIT', 'NETBANKING', 'POS', 'cash', 'upi', 'card', 'online', 'split', 'netbanking', 'pos'],
      set: (v) => (typeof v === 'string' ? v.toUpperCase() : v),
      index: true,
    },
    paymentStatus: {
      type: String,
      enum: ['PAID', 'PENDING', 'FAILED', 'REFUNDED', 'SUCCESS', 'paid', 'pending', 'failed', 'refunded', 'success'],
      default: 'PAID',
      required: true,
      set: (v) => (typeof v === 'string' ? v.toUpperCase() : v),
      index: true,
    },

    // Channel that issued the ticket (copied from booking)
    ticketSource: { type: String, enum: ['ONLINE', 'COUNTER', 'ADMIN'], default: 'ONLINE', required: true, index: true },

    // Payment breakup for counter flow
    paymentBreakup: {
      type: new Schema(
        {
          cash: { type: Number, min: 0, default: 0 },
          upi: { type: Number, min: 0, default: 0 },
        },
        { _id: false },
      ),
      default: undefined,
    },

    // Price snapshots for reporting (keep tariff table normalized)
    price: { type: Number, min: 0 },
    totalAmount: { type: Number, required: true, min: 0 },
    currency: { type: String, default: 'INR', minlength: 3, maxlength: 3 },

    // Items purchased (required for downstream reconciliation)
    items: { type: [ticketItemSchema], default: [], validate: (items) => items.length > 0 },

    // Flattened summary for reporting (first item snapshot)
    ticketCategory: { type: String, index: true },
    quantity: { type: Number, min: 1, index: true },
    unitPrice: { type: Number, min: 0 },
    lineTotal: { type: Number, min: 0 },

    // Counters used for issuance/scanning
    counterId: { type: Schema.Types.ObjectId, ref: 'Counter', index: true },

    // Usage tracking
    qrUsed: { type: Boolean, default: false, required: true, index: true },
    qrUsedAt: { type: Date },
    usedVia: { type: String, enum: ['QR_TOKEN', 'MANUAL_TICKET_ID'] },
    usedAt: { type: Date },
    scannedAt: { type: Date },
    scannedBy: { type: Schema.Types.ObjectId, ref: 'User', index: true },

    // Visitor contact snapshot captured at booking time
    visitorName: { type: String, required: true, trim: true },
    visitorEmail: { type: String, trim: true },
    visitorMobile: { type: String, required: true, trim: true },

    // Soft delete flag
    isActive: { type: Boolean, default: true, index: true },

    // Audit fields
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', index: true },
    source: {
      type: String,
      enum: ['ONLINE', 'COUNTER', 'ADMIN'],
      required: true,
      default: function resolveSource() {
        return this.ticketSource || 'ONLINE'
      },
      index: true,
    },
  },
  { timestamps: true, versionKey: false },
)

ticketSchema.index({ bookingId: 1, status: 1 })
ticketSchema.index({ bookingId: 1, entryStatus: 1 })
ticketSchema.index({ visitDate: 1, status: 1 })
ticketSchema.index({ counterId: 1, status: 1 })
ticketSchema.index({ ticketPricingId: 1, visitDate: 1 })
ticketSchema.index({ ticketSource: 1, visitDate: 1 })
// Compound indexes for history / reporting queries
ticketSchema.index({ ticketSource: 1, issueDate: -1 })
ticketSchema.index({ ticketSource: 1, paymentMode: 1, issueDate: -1 })
ticketSchema.index({ issueDate: -1, createdAt: -1 })
ticketSchema.index({ visitDate: -1, paymentMode: 1 })

export const Ticket = mongoose.model('Ticket', ticketSchema)
