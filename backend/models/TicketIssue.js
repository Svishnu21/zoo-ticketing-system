import mongoose from 'mongoose'

const { Schema } = mongoose

const ticketLineSchema = new Schema(
	{
		category: { type: String, required: true, trim: true }, // e.g., Entry, Parking, Transport, Camera
		subType: { type: String, required: true, trim: true }, // e.g., Adult, Child, 2-Wheeler
		label: { type: String, trim: true }, // human-friendly label
		unitPrice: { type: Number, required: true, min: 0 },
		quantity: { type: Number, required: true, min: 0 },
		subtotal: { type: Number, required: true, min: 0 },
	},
	{ _id: false },
)

const ticketIssueSchema = new Schema(
	{
		issueId: { type: String, required: true, unique: true, trim: true }, // unique transaction/issue identifier
		counterCode: { type: String, trim: true }, // counter identifier (string, not a relation)
		counterName: { type: String, trim: true },
		issuedAt: { type: Date, required: true },

		items: { type: [ticketLineSchema], default: [] },

		totalQuantity: { type: Number, required: true, min: 0 },
		totalAmount: { type: Number, required: true, min: 0 },
		paymentMethod: {
			type: String,
			enum: ['CASH', 'UPI', 'CARD', 'MIXED'],
			required: true,
		},

		status: {
			type: String,
			enum: ['ISSUED', 'CANCELLED', 'REFUNDED'],
			default: 'ISSUED',
			index: true,
		},

		remarks: { type: String, trim: true },
	},
	{ timestamps: true, versionKey: false },
)

ticketIssueSchema.index({ issueId: 1, status: 1 })
ticketIssueSchema.index({ issuedAt: 1, paymentMethod: 1 })

ticketIssueSchema.statics.createSafe = async function createSafe(doc) {
	try {
		return await this.create(doc)
	} catch (err) {
		if (err && err.code === 11000) return null
		throw err
	}
}

export const TicketIssue = mongoose.model('TicketIssue', ticketIssueSchema)
