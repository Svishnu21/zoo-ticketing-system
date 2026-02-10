import mongoose from 'mongoose'

const { Schema } = mongoose

const dailyStatsSchema = new Schema(
  {
    // UTC start-of-day date for the summary
    date: { type: Date, required: true, unique: true, index: true },

    // Bookings grouped by source
    bookingsBySource: {
      ONLINE: { type: Number, default: 0 },
      COUNTER: { type: Number, default: 0 },
      ADMIN: { type: Number, default: 0 },
    },

    // Ticket lifecycle counters
    ticketsIssued: { type: Number, default: 0 },
    ticketsUsed: { type: Number, default: 0 },
    ticketsCancelled: { type: Number, default: 0 },

    // Revenue snapshots per payment method
    revenueByMethod: {
      CARD: { type: Number, default: 0 },
      UPI: { type: Number, default: 0 },
      NETBANKING: { type: Number, default: 0 },
      CASH: { type: Number, default: 0 },
      POS: { type: Number, default: 0 },
    },

    // Aggregate totals
    totalRevenue: { type: Number, default: 0 },
    currency: { type: String, default: 'INR', minlength: 3, maxlength: 3 },

    // Soft delete flag
    isActive: { type: Boolean, default: true, index: true },

    // Audit fields
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', index: true },
    source: { type: String, enum: ['ONLINE', 'COUNTER', 'ADMIN'], required: true, default: 'ADMIN', index: true },
  },
  { timestamps: true, versionKey: false },
)

export const DailyStat = mongoose.model('DailyStat', dailyStatsSchema)
