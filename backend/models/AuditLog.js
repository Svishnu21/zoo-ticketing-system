import mongoose from 'mongoose'

const { Schema } = mongoose

const auditLogSchema = new Schema(
  {
    // User performing the action
    actorId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },

    // Action verb (e.g., CREATE_BOOKING, UPDATE_TARIFF)
    action: { type: String, required: true, trim: true, maxlength: 120, index: true },

    // Target collection/entity name
    entity: { type: String, required: true, trim: true, maxlength: 60, index: true },

    // Target document identifier
    entityId: { type: Schema.Types.ObjectId, required: true, index: true },

    // Before/after minimal snapshots (non-sensitive)
    before: { type: Schema.Types.Mixed },
    after: { type: Schema.Types.Mixed },

    // Contextual metadata (ip, userAgent, etc.)
    context: { type: Map, of: String },

    // Timestamp of action occurrence
    occurredAt: { type: Date, default: Date.now, index: true },

    // Soft delete flag
    isActive: { type: Boolean, default: true, index: true },

    // Audit fields
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', index: true },
    source: { type: String, enum: ['ONLINE', 'COUNTER', 'ADMIN'], required: true, default: 'ADMIN', index: true },
  },
  { timestamps: true, versionKey: false },
)

auditLogSchema.index({ entity: 1, entityId: 1, occurredAt: -1 })
auditLogSchema.index({ actorId: 1, occurredAt: -1 })

auditLogSchema.set('strict', true)

auditLogSchema.pre('save', function enforceAppendOnly() {
  // Ensure audit log is append-only; never mutate post-creation
  if (this.isModified() && !this.isNew) {
    throw new Error('AuditLog documents are append-only and cannot be updated once created.')
  }
})

export const AuditLog = mongoose.model('AuditLog', auditLogSchema)
