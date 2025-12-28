import mongoose from 'mongoose'

const ticketPricingSchema = new mongoose.Schema(
  {
    code: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^[a-z0-9_-]+$/, 'Code must be lowercase and contain no spaces.'],
    },
    categoryCode: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    // Explicit itemCode field kept case-sensitive to match client payloads exactly
    itemCode: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    label: { type: String, required: true, trim: true },
    category: {
      type: String,
      required: true,
      enum: ['zoo', 'parking', 'camera', 'transport'],
    },
    price: { type: Number, required: true, min: 0 },
    isActive: { type: Boolean, default: true, required: true },
    validFrom: { type: Date, required: false },
    validTo: { type: Date, required: false },
  },
  { timestamps: true },
)

// Keep legacy code uniqueness but also enforce itemCode uniqueness (case-sensitive)
ticketPricingSchema.index({ code: 1 }, { unique: true })
ticketPricingSchema.index({ itemCode: 1 }, { unique: true })
ticketPricingSchema.index({ categoryCode: 1 }, { unique: true })

// Backfill itemCode from code when missing (for older documents)
ticketPricingSchema.pre('validate', function backfillItemCode(next) {
  if (!this.itemCode && this.code) this.itemCode = this.code
  if (!this.categoryCode && this.code) this.categoryCode = this.code
  next()
})

export const TicketPricing = mongoose.model('TicketPricing', ticketPricingSchema)
