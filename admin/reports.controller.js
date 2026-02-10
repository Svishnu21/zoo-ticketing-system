import express from 'express'
import { Ticket } from '../backend/models/Ticket.js'
import { ScanLog } from '../backend/models/ScanLog.js'
import { ApiError, asyncHandler } from '../backend/utils/errors.js'

const router = express.Router()

const parseDateOnly = (value) => {
  if (!value) return null
  const parsed = new Date(`${value}T00:00:00.000Z`)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

const buildRange = (from, to) => {
  const fromDate = parseDateOnly(from)
  const toDate = parseDateOnly(to)
  if (!fromDate || !toDate) throw ApiError.badRequest('Valid from/to dates are required')
  const start = new Date(fromDate)
  const end = new Date(toDate)
  end.setUTCDate(end.getUTCDate() + 1)
  return { $gte: start, $lt: end }
}

const csv = (rows, headers) => {
  const escape = (value) => {
    const str = value === null || value === undefined ? '' : String(value)
    return /[",\n]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str
  }
  const headerLine = headers.map((h) => escape(h.label)).join(',')
  const body = rows
    .map((row) => headers.map((h) => escape(row[h.key] ?? '')).join(','))
    .join('\n')
  return `${headerLine}\n${body}`
}

router.get(
  '/reports',
  asyncHandler(async (req, res) => {
    const { type, from, to, format, source, category } = req.query
    if (!type) throw ApiError.badRequest('Report type is required')
    const visitRange = buildRange(from, to)

    const sourceFilter = typeof source === 'string' && ['ONLINE', 'COUNTER'].includes(source.toUpperCase()) ? source.toUpperCase() : null
    const categoryFilter = typeof category === 'string' && category.trim() ? category.trim().toLowerCase() : null

    const matchStage = { $match: { visitDate: visitRange, ...(sourceFilter ? { ticketSource: sourceFilter } : {}) } }

    let rows = []
    let headers = []

    if (type === 'daily-summary') {
      const pipeline = [
        matchStage,
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$visitDate' } },
            tickets: { $sum: 1 },
            onlineTickets: { $sum: { $cond: [{ $eq: ['$ticketSource', 'ONLINE'] }, 1, 0] } },
            counterTickets: { $sum: { $cond: [{ $eq: ['$ticketSource', 'COUNTER'] }, 1, 0] } },
            revenue: { $sum: '$totalAmount' },
            onlineRevenue: { $sum: { $cond: [{ $eq: ['$ticketSource', 'ONLINE'] }, '$totalAmount', 0] } },
            counterRevenue: { $sum: { $cond: [{ $eq: ['$ticketSource', 'COUNTER'] }, '$totalAmount', 0] } },
            entered: { $sum: { $cond: ['$qrUsed', 1, 0] } },
            pending: { $sum: { $cond: [{ $eq: ['$qrUsed', false] }, 1, 0] } },
            manualOverrides: { $sum: { $cond: [{ $eq: ['$usedVia', 'MANUAL_TICKET_ID'] }, 1, 0] } },
          },
        },
        { $sort: { _id: 1 } },
      ]
      rows = await Ticket.aggregate(pipeline)
      headers = [
        { key: '_id', label: 'Date' },
        { key: 'tickets', label: 'Total Tickets' },
        { key: 'onlineTickets', label: 'Online Tickets' },
        { key: 'counterTickets', label: 'Counter Tickets' },
        { key: 'revenue', label: 'Revenue (₹)' },
        { key: 'onlineRevenue', label: 'Online Revenue (₹)' },
        { key: 'counterRevenue', label: 'Counter Revenue (₹)' },
        { key: 'entered', label: 'Entered' },
        { key: 'pending', label: 'Pending Entry' },
        { key: 'manualOverrides', label: 'Manual Overrides' },
      ]
    } else if (type === 'ticket-wise') {
      const pipeline = [
        matchStage,
        { $unwind: '$items' },
        ...(categoryFilter
          ? [
              {
                $match: {
                  $expr: {
                    $eq: [{ $toLower: '$items.category' }, categoryFilter],
                  },
                },
              },
            ]
          : []),
        {
          $group: {
            _id: '$items.itemCode',
            ticketType: { $last: '$items.itemLabel' },
            quantity: { $sum: '$items.quantity' },
            amount: { $sum: '$items.amount' },
          },
        },
        { $sort: { ticketType: 1 } },
      ]
      rows = await Ticket.aggregate(pipeline)
      headers = [
        { key: 'ticketType', label: 'Ticket Type' },
        { key: 'quantity', label: 'Quantity' },
        { key: 'amount', label: 'Amount (₹)' },
      ]
    } else if (type === 'category-wise') {
      const pipeline = [
        matchStage,
        { $unwind: '$items' },
        ...(categoryFilter
          ? [
              {
                $match: {
                  $expr: {
                    $eq: [{ $toLower: '$items.category' }, categoryFilter],
                  },
                },
              },
            ]
          : []),
        {
          $group: {
            _id: '$items.category',
            quantity: { $sum: '$items.quantity' },
            amount: { $sum: '$items.amount' },
          },
        },
        { $sort: { _id: 1 } },
      ]
      rows = await Ticket.aggregate(pipeline)
      headers = [
        { key: '_id', label: 'Category' },
        { key: 'quantity', label: 'Quantity' },
        { key: 'amount', label: 'Revenue (₹)' },
      ]
    } else if (type === 'entry-compliance') {
      const ticketMatch = { visitDate: visitRange, ...(sourceFilter ? { ticketSource: sourceFilter } : {}) }
      const [entered, pending, manualOverrides, invalidScans] = await Promise.all([
        Ticket.countDocuments({ ...ticketMatch, qrUsed: true }),
        Ticket.countDocuments({ ...ticketMatch, qrUsed: false }),
        Ticket.countDocuments({ ...ticketMatch, qrUsed: true, usedVia: 'MANUAL_TICKET_ID' }),
        ScanLog.countDocuments({ scannedAt: visitRange, result: { $ne: 'success' } }),
      ])
      rows = [
        { metric: 'Entered', value: entered },
        { metric: 'Pending Entry', value: pending },
        { metric: 'Manual Overrides', value: manualOverrides },
        { metric: 'Invalid Scans', value: invalidScans },
      ]
      headers = [
        { key: 'metric', label: 'Metric' },
        { key: 'value', label: 'Value' },
      ]
    } else {
      throw ApiError.badRequest('Unsupported report type')
    }

    const isExport = format === 'csv' || format === 'excel' || format === 'pdf'

    if (isExport) {
      const extension = format === 'excel' ? 'xlsx' : format === 'pdf' ? 'pdf' : 'csv'
      const filename = `${type}-${from || 'from'}-${to || 'to'}.${extension}`
      res.setHeader('Content-Type', 'text/csv')
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`)
      res.send(csv(rows, headers))
      return
    }

    res.json({ success: true, rows })
  }),
)

export default router