import mongoose from 'mongoose'

import { getDisplayOrder, normalizeDisplayOrder } from '../utils/tariffOrder.js'

const { Schema } = mongoose

const ticketPricingSchema = new Schema(
  {
    // Public tariff code (uppercased for consistency)
    code: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
      match: [/^[A-Z0-9_-]+$/, 'Code must be alphanumeric with dashes/underscores.'],
    },

    // Display name (human-friendly)
    name: { type: String, required: true, trim: true },

    // Legacy label preserved for compatibility with UI and services
    label: { type: String, trim: true },

    // Canonical category key (used for grouping)
    categoryCode: { type: String, required: true, trim: true, index: true },

    // Product family
    category: {
      type: String,
      required: true,
      enum: ['zoo', 'parking', 'camera', 'transport'],
    },

    // Optional item code used in pricing lookups (must be unique when set)
    itemCode: { type: String, unique: true, lowercase: true, trim: true, sparse: true },

    // Base price snapshot
    price: { type: Number, required: true, min: 0 },

    // Currency code
    currency: { type: String, default: 'INR', minlength: 3, maxlength: 3 },

    // Tax percentage (0-100)
    taxRate: { type: Number, default: 0, min: 0, max: 100 },

    // Sorting order for UI/dashboards
    displayOrder: {
      type: Number,
      min: 1,
      default: function resolveDisplayOrder() {
        return normalizeDisplayOrder(this.displayOrder, this.itemCode || this.code)
      },
    },

    // Availability windows
    validFrom: { type: Date },
    validTo: { type: Date },

    // Soft delete flag
    isActive: { type: Boolean, default: true, required: true, index: true },

    // Audit fields
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', index: true },
    source: { type: String, enum: ['ONLINE', 'COUNTER', 'ADMIN'], required: true, default: 'ADMIN', index: true },
  },
  { timestamps: true, versionKey: false },
)

// Backfill legacy fields and normalize ordering
ticketPricingSchema.pre('validate', function backfillFields() {
  if (!this.label && this.name) this.label = this.name
  if (!this.name && this.label) this.name = this.label
  if (!this.itemCode && this.code) this.itemCode = this.code.toLowerCase()
  if (!this.categoryCode && this.itemCode) this.categoryCode = this.itemCode

  if (!this.displayOrder || !Number.isFinite(this.displayOrder)) {
    this.displayOrder = getDisplayOrder(this.itemCode || this.code)
  } else {
    this.displayOrder = normalizeDisplayOrder(this.displayOrder, this.itemCode)
  }
})

ticketPricingSchema.index({ categoryCode: 1, isActive: 1 })
ticketPricingSchema.index({ validFrom: 1, validTo: 1 })

export const TicketPricing = mongoose.model('TicketPricing', ticketPricingSchema)
