import mongoose from 'mongoose'

const { Schema } = mongoose

const userSchema = new Schema(
  {
    // Staff display name
    fullName: { type: String, required: true, trim: true, maxlength: 120 },

    // Unique login identifier (email/username)
    email: { type: String, required: true, lowercase: true, trim: true, unique: true, index: true },

    // Password hash (bcrypt/argon); never store plaintext
    passwordHash: { type: String, required: true },

    // Role-based access control
    role: { type: String, enum: ['ADMIN', 'COUNTER', 'SCANNER'], required: true, index: true },

    // Account lifecycle state
    status: { type: String, enum: ['ACTIVE', 'DISABLED'], default: 'ACTIVE', index: true },

    // Last successful login timestamp
    lastLoginAt: { type: Date },
  },
  { timestamps: true, versionKey: false },
)

userSchema.index({ role: 1, status: 1 })

export const User = mongoose.model('User', userSchema)
