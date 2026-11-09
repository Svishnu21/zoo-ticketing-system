import mongoose from 'mongoose'

const { Schema } = mongoose

// Subdocument for each priced line item captured at booking time
const bookingItemSchema = new Schema(
  {
    // Canonical item or tariff code for aggregation
    itemCode: { type: String, required: true, trim: true },
    // Optional pricing reference to avoid denormalization
    ticketPricingId: { type: Schema.Types.ObjectId, ref: 'TicketPricing' },
    // Display label shown to customers
    label: { type: String, required: true, trim: true },
    // Unit rate at the time of booking
    unitPrice: { type: Number, required: true, min: 0 },
    // Quantity purchased
    quantity: { type: Number, required: true, min: 1 },
    // Line total snapshot (unitPrice * quantity)
    lineTotal: { type: Number, required: true, min: 0 },
    // Product grouping snapshot (zoo/parking/camera/transport). Online bookings store this at
    // payment initiation so the ticket can be generated later, after payment is verified.
    category: { type: String, trim: true },
    // Canonical pricing category resolved by the backend at initiation time
    categoryCode: { type: String, trim: true },
  },
  { _id: false },
)

const bookingSchema = new Schema(
  {
    // Human-readable booking identifier (primary business key)
    bookingId: { type: String, required: true, trim: true },

    // Legacy field retained for compatibility; mirrors bookingId
    bookingCode: { type: String, trim: true, index: true },

    // Channel that created the booking (online vs counter)
    ticketSource: { type: String, enum: ['ONLINE', 'COUNTER'], required: true, default: 'ONLINE', index: true },

    // Booking intent: advance booking or walk-in
    bookingType: { type: String, enum: ['PREBOOK', 'WALKIN'], required: true, default: 'PREBOOK', index: true },

    // Issuance metadata
    issuedAt: { type: Date, required: true, default: Date.now, index: true },
    issuedBy: { type: Schema.Types.ObjectId, ref: 'User' },

    // Customer identity (kept minimal; no sensitive data stored)
    customerName: { type: String, trim: true, maxlength: 120 },
    customerEmail: { type: String, trim: true, lowercase: true },
    customerPhone: { type: String, trim: true },

    // Legacy aliases retained for compatibility with existing flows
    visitorName: { type: String, trim: true },
    visitorEmail: { type: String, trim: true },
    visitorMobile: { type: String, trim: true },

    // Counter that issued this booking (for counter flow)
    counterId: { type: Schema.Types.ObjectId, ref: 'Counter', index: true },

    // Booking lifecycle state.
    // Online payment lifecycle: PENDING → CONFIRMED | FAILED | INITIATION_FAILED | RECOVERY_REQUIRED.
    // Only CONFIRMED online bookings have a ticket and count towards bookings, visitors and revenue.
    status: {
      type: String,
      enum: ['PENDING', 'CONFIRMED', 'CANCELLED', 'EXPIRED', 'INITIATION_FAILED', 'FAILED', 'RECOVERY_REQUIRED'],
      default: 'CONFIRMED',
      index: true,
    },

    // Why the booking is in its current (non-confirmed) state, for audit/troubleshooting
    statusReason: { type: String, trim: true, maxlength: 500 },

    // Client-generated idempotency key for one online payment attempt (one Proceed confirmation).
    // Prevents duplicate bookings/payments when the same attempt is submitted more than once.
    paymentAttemptKey: { type: String, trim: true },

    // Online payment lifecycle timestamps
    confirmedAt: { type: Date },
    recoveryRequiredAt: { type: Date },
    // Per-booking lock used only when recovering a ticket for a legacy booking reference
    ticketIssueLockedAt: { type: Date },

    // Entry state derived from tickets (NOT_ENTERED, PARTIAL, FULLY_ENTERED)
    entryStatus: { type: String, enum: ['NOT_ENTERED', 'PARTIAL', 'FULLY_ENTERED'], default: 'NOT_ENTERED', index: true },

    // Date the visitor is allowed to enter (date-only, UTC normalised)
    visitDate: { type: Date, required: true, index: true },

    // Totals (one per booking; tickets carry their own price snapshots)
    totalAmount: { type: Number, required: true, min: 0 },
    currency: { type: String, default: 'INR', minlength: 3, maxlength: 3 },

    // Payment association (1:1)
    paymentId: { type: Schema.Types.ObjectId, ref: 'Payment', index: true },
    // Mirror ticket payment modes to avoid validation failures (counter uses SPLIT); coercion uppercases input
    paymentMode: {
      type: String,
      enum: ['CASH', 'UPI', 'CARD', 'ONLINE', 'SPLIT', 'NETBANKING', 'POS', 'cash', 'upi', 'card', 'online', 'split', 'netbanking', 'pos'],
      set: (v) => (typeof v === 'string' ? v.toUpperCase() : v),
      index: true,
    },
    // Accept PAID for backward compatibility; SUCCESS is preferred canonical. Coerces to uppercase before validation.
    paymentStatus: {
      type: String,
      enum: ['PENDING', 'PAID', 'SUCCESS', 'FAILED', 'REFUNDED', 'NOT_REQUIRED', 'pending', 'paid', 'success', 'failed', 'refunded', 'not_required'],
      default: 'PENDING',
      set: (v) => (typeof v === 'string' ? v.toUpperCase() : v),
      index: true,
    },

    // Tickets belonging to this booking
    tickets: { type: [Schema.Types.ObjectId], ref: 'Ticket', default: [] },

    // Snapshot of items requested at booking
    items: { type: [bookingItemSchema], default: [] },

    // Optional QR token hash if bookings are QR-addressable
    qrTokenHash: { type: String, unique: true, sparse: true, select: false },

    // Soft delete support
    isActive: { type: Boolean, default: true, index: true },

    // Audit fields
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', index: true },
    source: { type: String, enum: ['ONLINE', 'COUNTER', 'ADMIN'], required: true, default: 'ONLINE', index: true },
  },
  { timestamps: true, versionKey: false },
)

bookingSchema.index({ bookingId: 1 }, { unique: true })
// Sparse: existing bookings (and all counter bookings) have no attempt key.
bookingSchema.index({ paymentAttemptKey: 1 }, { unique: true, sparse: true })
bookingSchema.index({ visitorMobile: 1 })
bookingSchema.index({ createdAt: -1 })
bookingSchema.index({ visitDate: 1, ticketSource: 1, paymentStatus: 1 })
bookingSchema.index({ ticketSource: 1, entryStatus: 1 })
bookingSchema.index({ counterId: 1, visitDate: 1 })

export const Booking = mongoose.model('Booking', bookingSchema)
