import mongoose from 'mongoose'

const { Schema } = mongoose

const counterSchema = new Schema(
  {
    // Human-friendly counter name
    name: { type: String, required: true, trim: true, unique: true },

    // Physical or logical location description
    location: { type: String, trim: true, maxlength: 200 },

    // Operational state
    status: { type: String, enum: ['ACTIVE', 'INACTIVE'], default: 'ACTIVE', index: true },

    // Soft delete flag
    isActive: { type: Boolean, default: true, index: true },

    // Audit fields
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', index: true },
    source: { type: String, enum: ['ONLINE', 'COUNTER', 'ADMIN'], required: true, default: 'ADMIN', index: true },
  },
  { timestamps: true, versionKey: false },
)

counterSchema.index({ status: 1 })

export const Counter = mongoose.model('Counter', counterSchema)
