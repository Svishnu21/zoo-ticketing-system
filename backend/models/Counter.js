import mongoose from 'mongoose'

const { Schema } = mongoose

const counterSchema = new Schema(
  {
    // Human-friendly counter name
    name: { type: String, required: true, trim: true, unique: true },

    // Physical or logical location description
    location: { type: String, trim: true, maxlength: 200 },

    // Operational state
    status: { type: String, enum: ['ACTIVE', 'INACTIVE'], default: 'ACTIVE' },

    // Soft delete flag
    isActive: { type: Boolean, default: true },

    // Audit fields
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
    source: { type: String, enum: ['ONLINE', 'COUNTER', 'ADMIN'], required: true, default: 'ADMIN' },
  },
  { timestamps: true, versionKey: false },
)


counterSchema.index({ status: 1 })
counterSchema.index({ isActive: 1 })
counterSchema.index({ createdBy: 1 })
counterSchema.index({ source: 1 })

export const Counter = mongoose.model('Counter', counterSchema)
