import express from 'express'
import fs from 'fs'
import { Buffer } from 'buffer'
import PDFDocument from 'pdfkit'
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

const bookingPaidAmountExpr = {
  $ifNull: ['$amount_paid', { $ifNull: ['$amountPaid', { $ifNull: ['$totalAmount', 0] }] }],
}

const ticketItemLineTotalExpr = {
  $ifNull: ['$items.line_total', { $ifNull: ['$items.lineTotal', { $ifNull: ['$items.amount', 0] }] }],
}

const REPORT_TICKET_LABEL_ALIASES = {
  'parking - 2 & 3 wheeler': 'Parking - 2 Wheeler',
}

const resolveReportTicketLabel = ({ itemCode, label }) => {
  const code = (itemCode || '').toString().trim().toLowerCase()
  if (code === 'parking_2w_3w') return 'Parking - 2 Wheeler'
  const normalizedLabel = (label || '').toString().trim().toLowerCase()
  return REPORT_TICKET_LABEL_ALIASES[normalizedLabel] || label || ''
}

const itemQuantityExpr = {
  $ifNull: ['$items.quantity', 1],
}

const inferCategoryFromCodeExpr = (codeExpr) => ({
  $let: {
    vars: {
      normalizedCode: {
        $toLower: {
          $ifNull: [codeExpr, ''],
        },
      },
    },
    in: {
      $switch: {
        branches: [
          { case: { $regexMatch: { input: '$$normalizedCode', regex: '^parking_' } }, then: 'parking' },
          { case: { $regexMatch: { input: '$$normalizedCode', regex: '^(battery_|transport_)' } }, then: 'transport' },
          { case: { $regexMatch: { input: '$$normalizedCode', regex: '^camera_' } }, then: 'camera' },
          { case: { $regexMatch: { input: '$$normalizedCode', regex: '^zoo_' } }, then: 'zoo' },
        ],
        default: 'zoo',
      },
    },
  },
})

const normalizeItemLineProject = {
  itemCode: { $ifNull: ['$item_code', { $ifNull: ['$itemCode', '$code'] }] },
  itemLabel: { $ifNull: ['$item_label', { $ifNull: ['$itemLabel', '$label'] }] },
  category: {
    $ifNull: [
      '$category',
      {
        $ifNull: [
          '$categoryCode',
          inferCategoryFromCodeExpr({ $ifNull: ['$item_code', { $ifNull: ['$itemCode', '$code'] }] }),
        ],
      },
    ],
  },
  quantity: {
    $convert: {
      input: { $ifNull: ['$quantity', 1] },
      to: 'double',
      onError: 0,
      onNull: 0,
    },
  },
  lineTotal: {
    $convert: {
      input: { $ifNull: ['$line_total', { $ifNull: ['$lineTotal', { $ifNull: ['$amount', 0] }] }] },
      to: 'double',
      onError: 0,
      onNull: 0,
    },
  },
  visitDate: { $ifNull: ['$visit_date', '$visitDate'] },
  ticketSource: {
    $toUpper: {
      $ifNull: ['$ticket_source', { $ifNull: ['$ticketSource', '$source'] }],
    },
  },
}

const normalizeEmbeddedItemProject = {
  itemCode: '$items.itemCode',
  itemLabel: '$items.itemLabel',
  category: {
    $ifNull: ['$items.category', inferCategoryFromCodeExpr('$items.itemCode')],
  },
  quantity: {
    $convert: {
      input: itemQuantityExpr,
      to: 'double',
      onError: 0,
      onNull: 0,
    },
  },
  lineTotal: {
    $convert: {
      input: ticketItemLineTotalExpr,
      to: 'double',
      onError: 0,
      onNull: 0,
    },
  },
  visitDate: '$visitDate',
  ticketSource: '$ticketSource',
}

const getTicketCollection = () => Ticket.collection?.db

const hasTicketItemsCollection = async () => {
  const db = getTicketCollection()
  if (!db?.listCollections) return false
  const cursor = db.listCollections({ name: 'ticket_items' }, { nameOnly: true })
  return cursor.hasNext()
}

const buildTicketItemsBasePipeline = ({ visitRange, sourceFilter }) => [
  {
    $project: normalizeItemLineProject,
  },
  {
    $match: {
      visitDate: visitRange,
      ...(sourceFilter ? { ticketSource: sourceFilter } : {}),
    },
  },
]

const buildEmbeddedItemsBasePipeline = ({ visitRange, sourceFilter }) => [
  { $match: { visitDate: visitRange, ...(sourceFilter ? { ticketSource: sourceFilter } : {}) } },
  { $unwind: '$items' },
  {
    $project: normalizeEmbeddedItemProject,
  },
]

const sumTicketTotals = async (visitRange, sourceFilter) => {
  const pipeline = [
    { $match: { visitDate: visitRange, ...(sourceFilter ? { ticketSource: sourceFilter } : {}) } },
    { $group: { _id: null, total: { $sum: bookingPaidAmountExpr } } },
  ]
  const [row] = await Ticket.aggregate(pipeline)
  return Number(row?.total || 0)
}

const sumAggregatedItemTotals = async ({ visitRange, sourceFilter, preferTicketItemsCollection }) => {
  const totalPipeline = [{ $group: { _id: null, total: { $sum: '$lineTotal' } } }]

  if (preferTicketItemsCollection) {
    const db = getTicketCollection()
    const rows = await db.collection('ticket_items').aggregate([...buildTicketItemsBasePipeline({ visitRange, sourceFilter }), ...totalPipeline]).toArray()
    return Number(rows?.[0]?.total || 0)
  }

  const rows = await Ticket.aggregate([...buildEmbeddedItemsBasePipeline({ visitRange, sourceFilter }), ...totalPipeline])
  return Number(rows?.[0]?.total || 0)
}

const logAggregationDiscrepancy = ({ type, from, to, sourceFilter, ticketTotal, aggregatedTotal, usesTicketItemsCollection }) => {
  const diff = Number((ticketTotal - aggregatedTotal).toFixed(2))
  if (Math.abs(diff) <= 0.01) return

  console.warn('[admin/reports] Aggregation mismatch detected', {
    type,
    from,
    to,
    source: sourceFilter || 'ALL',
    ticketTotal,
    aggregatedTotal,
    difference: diff,
    usesTicketItemsCollection,
  })
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
    if (categoryFilter) {
      console.info('[admin/reports] Ignoring category filter to keep totals fully inclusive', {
        category: categoryFilter,
      })
    }
    const useTicketItemsCollection = await hasTicketItemsCollection()

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
            pending: { 
              $sum: { 
                $cond: [
                  { $and: [
                    { $eq: ['$qrUsed', false] },
                    { $eq: ['$visitDate', new Date(new Date().setUTCHours(0,0,0,0))] },
                    { $lt: [{ $add: [new Date(), 5.5 * 60 * 60 * 1000] }, { $dateFromParts: { year: { $year: new Date() }, month: { $month: new Date() }, day: { $dayOfMonth: new Date() }, hour: 17, timezone: 'UTC' } }] }
                  ]}, 
                  1, 0
                ] 
              } 
            },
            expiredUnused: {
              $sum: {
                $cond: [
                  { $or: [
                    { $lt: ['$visitDate', new Date(new Date().setUTCHours(0,0,0,0))] },
                    { $and: [
                        { $eq: ['$visitDate', new Date(new Date().setUTCHours(0,0,0,0))] },
                        { $gte: [{ $add: [new Date(), 5.5 * 60 * 60 * 1000] }, { $dateFromParts: { year: { $year: new Date() }, month: { $month: new Date() }, day: { $dayOfMonth: new Date() }, hour: 17, timezone: 'UTC' } }] }
                    ]}
                  ]},
                  { $cond: [{ $eq: ['$qrUsed', false] }, 1, 0] },
                  0
                ]
              }
            },
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
        {
          $group: {
            _id: '$itemCode',
            ticketType: { $last: '$itemLabel' },
            quantity: { $sum: '$quantity' },
            amount: { $sum: '$lineTotal' },
            category: { $last: '$category' },
          },
        },
        { $sort: { ticketType: 1 } },
      ]

      if (useTicketItemsCollection) {
        const db = getTicketCollection()
        rows = await db.collection('ticket_items').aggregate([...buildTicketItemsBasePipeline({ visitRange, sourceFilter }), ...pipeline]).toArray()
      } else {
        rows = await Ticket.aggregate([...buildEmbeddedItemsBasePipeline({ visitRange, sourceFilter }), ...pipeline])
      }

      rows = (Array.isArray(rows) ? rows : []).map((row) => ({
        ...row,
        ticketType: resolveReportTicketLabel({
          itemCode: row?._id,
          label: row?.ticketType,
        }),
      }))

      headers = [
        { key: 'ticketType', label: 'Ticket Type' },
        { key: 'quantity', label: 'Quantity' },
        { key: 'amount', label: 'Amount (₹)' },
      ]
    } else if (type === 'category-wise') {
      const pipeline = [
        {
          $group: {
            _id: '$category',
            quantity: { $sum: '$quantity' },
            amount: { $sum: '$lineTotal' },
          },
        },
        { $sort: { _id: 1 } },
      ]

      if (useTicketItemsCollection) {
        const db = getTicketCollection()
        rows = await db.collection('ticket_items').aggregate([...buildTicketItemsBasePipeline({ visitRange, sourceFilter }), ...pipeline]).toArray()
      } else {
        rows = await Ticket.aggregate([...buildEmbeddedItemsBasePipeline({ visitRange, sourceFilter }), ...pipeline])
      }

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

    const isPdf = format === 'pdf'
    const isExport = format === 'csv' || format === 'excel' || isPdf

    const [ticketTotal, aggregatedTotal] = await Promise.all([
      sumTicketTotals(visitRange, sourceFilter),
      sumAggregatedItemTotals({
        visitRange,
        sourceFilter,
        preferTicketItemsCollection: useTicketItemsCollection,
      }),
    ])
    logAggregationDiscrepancy({
      type,
      from,
      to,
      sourceFilter,
      ticketTotal,
      aggregatedTotal,
      usesTicketItemsCollection: useTicketItemsCollection,
    })

    const reconciliation = {
      ticketTotal,
      aggregatedTotal,
      difference: Number((ticketTotal - aggregatedTotal).toFixed(2)),
      matches: Math.abs(ticketTotal - aggregatedTotal) <= 0.01,
      source: useTicketItemsCollection ? 'ticket_items' : 'tickets.items',
    }

    if (isExport) {
      if (isPdf) {
      if (isPdf) {
        try {
          const filename = `report-${type}-${from || 'all'}-${to || 'all'}.pdf`
          console.log('[admin/reports] generating PDF stream', { type, rowCount: rows.length })

          res.setHeader('Content-Type', 'application/pdf')
          res.setHeader('Content-Disposition', `attachment; filename="${filename}"`)

          const doc = new PDFDocument({ size: 'A4', margin: 40 })

          doc.on('error', (err) => {
            console.error('[pdfkit] internal stream error:', err)
            if (!res.headersSent) {
              res.status(500).send('PDF Generation Error')
            } else {
              res.end() // Force close connection to prevent ERR_INVALID_RESPONSE
            }
          })

          doc.pipe(res)

          const safe = (str) => String(str ?? '').replace(/[^\x20-\x7E]/g, ' ')

          // Title
          doc.fontSize(18).font('Helvetica-Bold')
            .text('Kurumbapatti Zoological Park, Salem', { align: 'center' })
          doc.moveDown(0.3)
          doc.fontSize(11).font('Helvetica')
            .text(`OFFICIAL REPORT: ${safe(type).replace(/-/g, ' ').toUpperCase()}`, { align: 'center' })
          doc.fontSize(10).fillColor('#555')
            .text(`Period: ${safe(from)} to ${safe(to)}`, { align: 'center' })
          doc.moveDown(1)

          doc.strokeColor('#333').lineWidth(1)
            .moveTo(40, doc.y).lineTo(555, doc.y).stroke()
          doc.moveDown(0.5)

          const safeHeaders = Array.isArray(headers) ? headers : []
          const safeRows = Array.isArray(rows) ? rows : []
          const colCount = Math.max(1, safeHeaders.length)
          const tableWidth = 515
          const colW = tableWidth / colCount
          const tableLeft = 40

          // Header Row
          const headerY = doc.y
          doc.fillColor('#F0F0F0')
            .rect(tableLeft, headerY, tableWidth, 20).fill()
          doc.fillColor('#000').fontSize(9).font('Helvetica-Bold')
          safeHeaders.forEach((h, i) => {
            doc.text(safe(h.label || h.key || ''), tableLeft + i * colW + 4, headerY + 5, {
              width: colW - 8, height: 14, ellipsis: true,
            })
          })
          doc.y = headerY + 22

          // Data Rows
          doc.font('Helvetica').fontSize(8).fillColor('#222')
          safeRows.forEach((row) => {
            if (doc.y > 720) {
              doc.addPage()
              doc.y = 40
            }
            const currentY = doc.y
            safeHeaders.forEach((h, i) => {
              doc.text(safe(row[h.key] ?? ' '), tableLeft + i * colW + 4, currentY + 2, {
                width: colW - 8, height: 12, ellipsis: true,
              })
            })
            doc.y = currentY + 16
            doc.strokeColor('#EEE').lineWidth(0.5)
              .moveTo(tableLeft, doc.y).lineTo(tableLeft + tableWidth, doc.y).stroke()
          })

          doc.moveDown(1.5)
          doc.strokeColor('#000').lineWidth(1.5)
            .moveTo(40, doc.y).lineTo(555, doc.y).stroke()
          doc.moveDown(0.5)

          doc.fontSize(11).font('Helvetica-Bold').fillColor('#000')
          doc.text(`Total Revenue:  Rs ${Number(reconciliation?.ticketTotal || 0).toLocaleString('en-IN')}`, { align: 'right' })
          doc.fontSize(10).font('Helvetica')
          doc.text(`Total Rows:  ${safeRows.length}`, { align: 'right' })
          doc.moveDown(2)

          doc.fontSize(8).fillColor('#999')
            .text(`Generated by Admin System on ${new Date().toLocaleString('en-IN')}`, 40, 770, { align: 'center', width: 515 })

          doc.end()
          return
        } catch (pdfErr) {
          console.error('[admin/reports] Report generation catch error', pdfErr)
          if (!res.headersSent) {
            throw ApiError.internal(`Failed to generate PDF: ${pdfErr.message}`)
          } else {
            res.end() // Force close connection if caught mid-stream
          }
          return
        }
      }
      }


      const extension = format === 'excel' ? 'xlsx' : 'csv'
      const filename = `${type}-${from || 'from'}-${to || 'to'}.${extension}`
      res.setHeader('Content-Type', format === 'excel' ? 'application/vnd.ms-excel' : 'text/csv')
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`)
      res.send(csv(rows, headers))
      return
    }

    res.json({ success: true, rows, reconciliation })
  }),
)

router.get(
  '/reconciliation',
  asyncHandler(async (req, res) => {
    const { from, to } = req.query
    const range = buildRange(from, to)

    // Match online & counter combined
    const paymentPipeline = [
      { $match: { requestedAt: range, status: { $in: ['SUCCESS', 'PAID'] } } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]
    const ticketPipeline = [
      { $match: { visitDate: range, paymentStatus: { $in: ['SUCCESS', 'PAID'] } } },
      { $group: { _id: null, total: { $sum: '$totalAmount' } } },
    ]

    const [paymentRes, ticketRes] = await Promise.all([
      import('../backend/models/Payment.js').then((m) => m.Payment.aggregate(paymentPipeline)),
      Ticket.aggregate(ticketPipeline),
    ])

    const totalSuccessfulPayments = Number(paymentRes[0]?.total || 0)
    const totalConfirmedTickets = Number(ticketRes[0]?.total || 0)
    const difference = Number((totalSuccessfulPayments - totalConfirmedTickets).toFixed(2))
    const isMatched = Math.abs(difference) <= 0.01

    let unbalancedPaymentIds = []
    if (!isMatched) {
      // Find payments that don't have a matching confirmed ticket
      const Payment = await import('../backend/models/Payment.js').then((m) => m.Payment)
      const ticketIds = await Ticket.find({ visitDate: range, paymentStatus: { $in: ['SUCCESS', 'PAID'] } }).distinct('bookingId')
      const payments = await Payment.find({
        requestedAt: range,
        status: { $in: ['SUCCESS', 'PAID'] },
        providerPaymentId: { $exists: true },
      }).lean()
      
      unbalancedPaymentIds = payments
        .filter(p => !ticketIds.includes(p.transactionId))
        .map(p => p.transactionId)
    }

    res.json({
      success: true,
      totalSuccessfulPayments,
      totalConfirmedTickets,
      difference,
      isMatched,
      unbalancedPaymentIds,
    })
  })
)

export default router
