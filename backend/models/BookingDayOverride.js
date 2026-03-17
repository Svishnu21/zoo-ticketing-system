import mongoose from 'mongoose'

const { Schema } = mongoose

const bookingDayOverrideSchema = new Schema(
  {
    // Date-only value (UTC midnight) for the override row.
    date: { type: Date, required: true, unique: true, index: true },

    // Override outcome for the date: open booking or closed.
    status: { type: String, required: true, enum: ['open', 'closed'], lowercase: true, trim: true },

    // Optional admin user reference for auditability.
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: false,
      index: true,
    },
  },
  {
    collection: 'booking_day_overrides',
    timestamps: { createdAt: true, updatedAt: false },
    versionKey: false,
  },
)

bookingDayOverrideSchema.pre('validate', function normalizeDateOnly() {
  if (!this.date) return
  const parsed = new Date(this.date)
  if (Number.isNaN(parsed.getTime())) return
  this.date = new Date(Date.UTC(parsed.getUTCFullYear(), parsed.getUTCMonth(), parsed.getUTCDate()))
})

export const BookingDayOverride = mongoose.model('BookingDayOverride', bookingDayOverrideSchema)
