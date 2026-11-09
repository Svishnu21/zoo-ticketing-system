#!/usr/bin/env node
// ---------------------------------------------------------------------------
// READ-ONLY audit of online bookings / payments / tickets.
//
// Produces the historical reconciliation report required before any status correction:
//   - confirmed successful payments with tickets
//   - successful payments whose ticket is still marked PENDING (counted as confirmed; QR self-heals)
//   - successful payments WITHOUT a ticket
//   - failed / initiation-failed attempts
//   - pending transactions (must be checked against Easebuzz before any correction)
//   - online bookings with no payment / transaction record
//   - online tickets excluded from confirmed bookings/revenue by the reporting guard
//   - duplicate booking attempts (same mobile + visit date + amount within a short window)
//
// This script NEVER writes: it uses only find/aggregate/count, and connects with autoIndex and
// autoCreate disabled so not even an index is created.
//
// Usage:
//   node scripts/audit-online-payments.mjs [--from YYYY-MM-DD] [--to YYYY-MM-DD] [--out ./audit-dir]
//   (uses MONGODB_URI from .env, or --uri mongodb://...)
// ---------------------------------------------------------------------------
import 'dotenv/config'
import fs from 'fs'
import path from 'path'
import mongoose from 'mongoose'

const args = process.argv.slice(2)
const arg = (name) => {
  const index = args.indexOf(`--${name}`)
  return index >= 0 ? args[index + 1] : undefined
}

const uri = arg('uri') || process.env.MONGODB_URI
if (!uri) {
  console.error('MONGODB_URI is not set (or pass --uri).')
  process.exit(1)
}

const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000
const parseIstDay = (value, endOfDay = false) => {
  if (!value) return undefined
  const base = new Date(`${value}T00:00:00.000Z`)
  if (Number.isNaN(base.getTime())) throw new Error(`Invalid date: ${value}`)
  return new Date(base.getTime() - IST_OFFSET_MS + (endOfDay ? 24 * 60 * 60 * 1000 : 0))
}
const createdFrom = parseIstDay(arg('from'))
const createdTo = parseIstDay(arg('to'), true)
const createdRange = createdFrom || createdTo
  ? { ...(createdFrom ? { $gte: createdFrom } : {}), ...(createdTo ? { $lt: createdTo } : {}) }
  : undefined

const DUPLICATE_WINDOW_MS = 15 * 60 * 1000
const PAID = ['PAID', 'SUCCESS']
const upper = (value) => String(value || '').toUpperCase()
const ist = (date) => (date ? new Date(new Date(date).getTime() + IST_OFFSET_MS).toISOString().replace('T', ' ').slice(0, 19) + ' IST' : '')

mongoose.set('autoIndex', false)
mongoose.set('autoCreate', false)
await mongoose.connect(uri, { autoIndex: false, autoCreate: false, serverSelectionTimeoutMS: 8000 })

const { Booking } = await import('../backend/models/Booking.js')
const { Payment } = await import('../backend/models/Payment.js')
const { Ticket } = await import('../backend/models/Ticket.js')
const { getUnconfirmedOnlineTicketIds } = await import('../backend/services/onlinePaymentService.js')

console.log(`Read-only audit of database "${mongoose.connection.db.databaseName}"${createdRange ? ` (attempts ${arg('from') || '…'} → ${arg('to') || '…'} IST)` : ''}`)

const bookingMatch = { ticketSource: 'ONLINE', ...(createdRange ? { createdAt: createdRange } : {}) }
const bookings = await Booking.find(bookingMatch)
  .select('bookingId status paymentStatus visitDate totalAmount items tickets visitorName visitorMobile customerPhone paymentId createdAt')
  .sort({ createdAt: 1 })
  .lean()

const bookingIds = bookings.map((booking) => booking._id)
const [payments, tickets] = await Promise.all([
  Payment.find({ bookingId: { $in: bookingIds } })
    .select('bookingId transactionId providerPaymentId status amount failureReason requestedAt completedAt')
    .lean(),
  Ticket.find({ $or: [{ bookingRef: { $in: bookingIds } }, { _id: { $in: bookings.flatMap((b) => b.tickets || []) } }] })
    .select('ticketId bookingRef paymentStatus totalAmount qrUsed createdAt')
    .lean(),
])

const paymentByBooking = new Map(payments.map((payment) => [String(payment.bookingId), payment]))
// A ticket belongs to a booking via ticket.bookingRef and/or booking.tickets[] (older records may have only one).
const ticketById = new Map(tickets.map((ticket) => [String(ticket._id), ticket]))
const ticketsByBooking = new Map()
for (const booking of bookings) {
  const linked = new Map()
  for (const id of booking.tickets || []) {
    const ticket = ticketById.get(String(id))
    if (ticket) linked.set(String(ticket._id), ticket)
  }
  for (const ticket of tickets) {
    if (String(ticket.bookingRef || '') === String(booking._id)) linked.set(String(ticket._id), ticket)
  }
  ticketsByBooking.set(String(booking._id), [...linked.values()])
}

const categories = {
  confirmedWithTicket: [],
  successTicketStillPending: [],
  successWithoutTicket: [],
  failed: [],
  initiationFailed: [],
  pending: [],
  noPaymentRecord: [],
  confirmedMissingGatewayPaymentId: [],
}

const rows = bookings.map((booking) => {
  const payment = paymentByBooking.get(String(booking._id))
  const bookingTickets = ticketsByBooking.get(String(booking._id)) || []
  const ticketCount = (booking.items || []).reduce((sum, item) => sum + Number(item.quantity || 0), 0)
  const row = {
    bookingId: booking.bookingId,
    attemptedAt: ist(booking.createdAt),
    visitDate: booking.visitDate ? new Date(booking.visitDate).toISOString().slice(0, 10) : '',
    visitorName: booking.visitorName || '',
    mobile: booking.visitorMobile || booking.customerPhone || '',
    amount: booking.totalAmount,
    ticketQuantity: ticketCount,
    bookingStatus: booking.status,
    bookingPaymentStatus: booking.paymentStatus,
    transactionId: payment?.transactionId || '',
    gatewayPaymentId: payment?.providerPaymentId || '',
    paymentStatus: payment?.status || '',
    paymentFailureReason: payment?.failureReason || '',
    ticketIds: bookingTickets.map((t) => t.ticketId).join(' '),
    ticketPaymentStatuses: bookingTickets.map((t) => t.paymentStatus).join(' '),
    entered: bookingTickets.some((t) => t.qrUsed),
  }

  const paid = PAID.includes(upper(payment?.status)) || PAID.includes(upper(booking.paymentStatus))
  if (!payment) categories.noPaymentRecord.push(row)
  if (paid) {
    if (!bookingTickets.length) categories.successWithoutTicket.push(row)
    else if (bookingTickets.some((t) => PAID.includes(upper(t.paymentStatus)))) categories.confirmedWithTicket.push(row)
    else categories.successTicketStillPending.push(row)
    if (payment && !payment.providerPaymentId) categories.confirmedMissingGatewayPaymentId.push(row)
  } else if (payment) {
    const status = upper(payment.status)
    if (status === 'FAILED') categories.failed.push(row)
    else if (status === 'INITIATION_FAILED') categories.initiationFailed.push(row)
    else categories.pending.push(row)
  }
  return row
})

// Online tickets that the reporting guard excludes from bookings / visitors / revenue.
const excludedIds = await getUnconfirmedOnlineTicketIds()
const excludedTickets = excludedIds.length
  ? await Ticket.find({ _id: { $in: excludedIds } }).select('ticketId bookingId totalAmount items visitDate createdAt visitorMobile').lean()
  : []
const excludedSummary = excludedTickets.reduce(
  (acc, ticket) => {
    acc.tickets += 1
    acc.amount += Number(ticket.totalAmount || 0)
    acc.quantity += (ticket.items || []).reduce((sum, item) => sum + Number(item.quantity || 0), 0)
    return acc
  },
  { tickets: 0, quantity: 0, amount: 0 },
)

// Duplicate attempts: same mobile + visit date + amount, each within DUPLICATE_WINDOW_MS of the previous.
const groups = new Map()
for (const booking of bookings) {
  const key = [booking.visitorMobile || booking.customerPhone, booking.visitDate && new Date(booking.visitDate).toISOString().slice(0, 10), booking.totalAmount].join('|')
  if (!groups.has(key)) groups.set(key, [])
  groups.get(key).push(booking)
}
const duplicateClusters = []
for (const [key, list] of groups) {
  let cluster = []
  for (const booking of list) {
    const previous = cluster[cluster.length - 1]
    if (previous && new Date(booking.createdAt) - new Date(previous.createdAt) > DUPLICATE_WINDOW_MS) {
      if (cluster.length > 1) duplicateClusters.push({ key, members: cluster })
      cluster = []
    }
    cluster.push(booking)
  }
  if (cluster.length > 1) duplicateClusters.push({ key, members: cluster })
}
const duplicateReport = duplicateClusters.map(({ key, members }) => {
  const [mobile, visitDate, amount] = key.split('|')
  const memberRows = members.map((member) => rows.find((row) => row.bookingId === member.bookingId))
  return {
    mobile,
    visitDate,
    amount: Number(amount),
    attempts: members.length,
    paidAttempts: memberRows.filter((row) => PAID.includes(upper(row.paymentStatus)) || PAID.includes(upper(row.bookingPaymentStatus))).length,
    firstAttempt: memberRows[0]?.attemptedAt,
    lastAttempt: memberRows[memberRows.length - 1]?.attemptedAt,
    members: memberRows.map((row) => `${row.bookingId}:${row.paymentStatus || 'NO_PAYMENT'}`).join(' '),
  }
})

const sum = (list, field) => list.reduce((total, row) => total + Number(row[field] || 0), 0)
console.log('\n=== Online payment audit (read-only) ===')
console.table(
  Object.fromEntries(
    Object.entries(categories).map(([name, list]) => [name, { bookings: list.length, tickets: sum(list, 'ticketQuantity'), amount: sum(list, 'amount') }]),
  ),
)
console.log('Online tickets excluded from confirmed bookings/revenue by the reporting guard:', excludedSummary)
console.log(`Duplicate attempt clusters (same mobile + visit date + amount within ${DUPLICATE_WINDOW_MS / 60000} min): ${duplicateReport.length}`)
if (duplicateReport.length) console.table(duplicateReport.slice(0, 25).map(({ members, ...rest }) => rest))

// --- Write detail files ---
const outDir = path.resolve(arg('out') || `online-payment-audit-${new Date().toISOString().slice(0, 10)}`)
fs.mkdirSync(outDir, { recursive: true })
const toCsv = (list) => {
  if (!list.length) return ''
  const headers = Object.keys(list[0])
  const escape = (value) => {
    const str = value === null || value === undefined ? '' : String(value)
    return /[",\n]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str
  }
  return [headers.join(','), ...list.map((row) => headers.map((h) => escape(row[h])).join(','))].join('\n')
}
for (const [name, list] of Object.entries(categories)) {
  fs.writeFileSync(path.join(outDir, `${name}.csv`), toCsv(list))
}
fs.writeFileSync(path.join(outDir, 'duplicateAttempts.csv'), toCsv(duplicateReport))
fs.writeFileSync(
  path.join(outDir, 'excludedOnlineTickets.csv'),
  toCsv(excludedTickets.map((t) => ({ ticketId: t.ticketId, bookingId: t.bookingId, visitDate: t.visitDate?.toISOString?.().slice(0, 10), createdAt: ist(t.createdAt), mobile: t.visitorMobile, amount: t.totalAmount }))),
)
fs.writeFileSync(path.join(outDir, 'allOnlineAttempts.csv'), toCsv(rows))
console.log(`\nDetail CSV files written to ${outDir}`)
console.log('Next step: match pending.csv / successWithoutTicket.csv transaction IDs against the Easebuzz dashboard before proposing any status change.')

await mongoose.disconnect()
