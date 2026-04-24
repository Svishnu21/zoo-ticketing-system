import mongoose from 'mongoose'
import { BookingDayOverride } from '../models/BookingDayOverride.js'
import { ApiError } from '../utils/errors.js'
import { todayIsoDate, isOnlineBookingCutoffReached } from '../utils/dates.js'

const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/
const MAX_RANGE_DAYS = 120

const formatIsoDate = (date) => date.toISOString().slice(0, 10)

const addUtcDays = (date, days) => {
  const next = new Date(date)
  next.setUTCDate(next.getUTCDate() + days)
  return next
}

const parseIsoDate = (value, fieldLabel = 'Date') => {
  if (!value || typeof value !== 'string') {
    throw ApiError.badRequest(`${fieldLabel} is required.`)
  }

  const trimmed = value.trim()
  if (!ISO_DATE_PATTERN.test(trimmed)) {
    throw ApiError.badRequest(`${fieldLabel} is invalid. Expected YYYY-MM-DD format.`)
  }

  const parsed = new Date(`${trimmed}T00:00:00.000Z`)
  if (Number.isNaN(parsed.getTime())) {
    throw ApiError.badRequest(`${fieldLabel} is invalid. Expected YYYY-MM-DD format.`)
  }

  const normalized = new Date(Date.UTC(parsed.getUTCFullYear(), parsed.getUTCMonth(), parsed.getUTCDate()))
  return { isoDate: formatIsoDate(normalized), dateOnly: normalized }
}

const parseOptionalIsoDate = (value, fieldLabel) => {
  if (value === undefined || value === null || value === '') return null
  return parseIsoDate(value, fieldLabel)
}

const serializeOverride = (doc) => ({
  id: doc?._id ? doc._id.toString() : undefined,
  date: doc?.date instanceof Date ? formatIsoDate(doc.date) : undefined,
  status: doc?.status,
  createdAt: doc?.createdAt instanceof Date ? doc.createdAt.toISOString() : undefined,
})

const resolveDayStatus = ({ isoDate, dateOnly, overrideDoc = null }) => {
  const isTuesday = dateOnly.getUTCDay() === 2
  const overrideStatus = overrideDoc?.status

  // Hard cutoff: Online booking for today closes at 4:30 PM daily
  if (isoDate === todayIsoDate() && isOnlineBookingCutoffReached()) {
    return {
      date: isoDate,
      status: 'closed',
      isTuesday,
      source: 'daily_cutoff',
      override: overrideDoc ? serializeOverride(overrideDoc) : null,
    }
  }

  if (overrideStatus === 'open') {
    return {
      date: isoDate,
      status: 'open',
      isTuesday,
      source: 'override_open',
      override: serializeOverride(overrideDoc),
    }
  }

  if (overrideStatus === 'closed') {
    return {
      date: isoDate,
      status: 'closed',
      isTuesday,
      source: 'override_closed',
      override: serializeOverride(overrideDoc),
    }
  }

  if (isTuesday) {
    return {
      date: isoDate,
      status: 'closed',
      isTuesday,
      source: 'default_tuesday',
      override: null,
    }
  }

  return {
    date: isoDate,
    status: 'open',
    isTuesday,
    source: 'default_open',
    override: null,
  }
}

export const getBookingDayStatus = async (rawIsoDate) => {
  const { isoDate, dateOnly } = parseIsoDate(rawIsoDate, 'Date')
  const override = await BookingDayOverride.findOne({ date: dateOnly })
    .select('date status createdAt')
    .lean()

  return resolveDayStatus({ isoDate, dateOnly, overrideDoc: override })
}

export const getBookingDayStatusesInRange = async ({ fromIso, toIso }) => {
  const from = parseIsoDate(fromIso, 'From date')
  const to = parseIsoDate(toIso, 'To date')

  if (from.dateOnly.getTime() > to.dateOnly.getTime()) {
    throw ApiError.badRequest('From date cannot be greater than To date.')
  }

  const dayCount = Math.floor((to.dateOnly.getTime() - from.dateOnly.getTime()) / (24 * 60 * 60 * 1000)) + 1
  if (dayCount > MAX_RANGE_DAYS) {
    throw ApiError.badRequest(`Date range cannot exceed ${MAX_RANGE_DAYS} days.`)
  }

  const overrides = await BookingDayOverride.find({
    date: { $gte: from.dateOnly, $lte: to.dateOnly },
  })
    .sort({ date: 1 })
    .select('date status createdAt')
    .lean()

  const overrideMap = new Map(
    overrides
      .filter((entry) => entry?.date instanceof Date)
      .map((entry) => [formatIsoDate(entry.date), entry]),
  )

  const days = []
  for (let cursor = new Date(from.dateOnly); cursor.getTime() <= to.dateOnly.getTime(); cursor = addUtcDays(cursor, 1)) {
    const isoDate = formatIsoDate(cursor)
    const overrideDoc = overrideMap.get(isoDate) || null
    days.push(resolveDayStatus({ isoDate, dateOnly: new Date(cursor), overrideDoc }))
  }

  return {
    from: from.isoDate,
    to: to.isoDate,
    days,
  }
}

export const listBookingDayOverrides = async ({ fromIso, toIso, limit = 200 } = {}) => {
  const from = parseOptionalIsoDate(fromIso, 'From date')
  const to = parseOptionalIsoDate(toIso, 'To date')

  if (from && to && from.dateOnly.getTime() > to.dateOnly.getTime()) {
    throw ApiError.badRequest('From date cannot be greater than To date.')
  }

  const normalizedLimit = Math.min(1000, Math.max(1, Number.parseInt(limit, 10) || 200))
  const match = {}

  if (from || to) {
    match.date = {}
    if (from) match.date.$gte = from.dateOnly
    if (to) match.date.$lte = to.dateOnly
  }

  const rows = await BookingDayOverride.find(match)
    .sort({ date: -1, createdAt: -1 })
    .limit(normalizedLimit)
    .select('date status createdAt')
    .lean()

  return rows.map(serializeOverride)
}

export const upsertBookingDayOverride = async ({ dateIso, status, createdBy } = {}) => {
  const { isoDate, dateOnly } = parseIsoDate(dateIso, 'Date')
  const normalizedStatus = typeof status === 'string' ? status.trim().toLowerCase() : ''

  if (!['open', 'closed'].includes(normalizedStatus)) {
    throw ApiError.badRequest('Status must be either open or closed.')
  }

  const isTuesday = dateOnly.getUTCDay() === 2
  if (!isTuesday) {
    throw ApiError.badRequest('Only Tuesday dates can be overridden.')
  }

  const update = { status: normalizedStatus }
  if (createdBy && mongoose.isValidObjectId(createdBy)) {
    update.createdBy = new mongoose.Types.ObjectId(createdBy)
  }

  await BookingDayOverride.findOneAndUpdate(
    { date: dateOnly },
    {
      $set: update,
      $setOnInsert: { date: dateOnly },
    },
    {
      upsert: true,
      returnDocument: 'after',
      runValidators: true,
      setDefaultsOnInsert: true,
    },
  )

  return getBookingDayStatus(isoDate)
}

export const assertOnlineBookingDateOpen = async (rawIsoDate) => {
  const dayStatus = await getBookingDayStatus(rawIsoDate)
  if (dayStatus.status === 'open') return dayStatus

  if (dayStatus.source === 'daily_cutoff') {
    throw ApiError.badRequest('Online booking for today closed at 4:30 PM. Please book for another date.')
  }

  if (dayStatus.isTuesday) {
    throw ApiError.badRequest('Zoo is closed on Tuesdays.')
  }

  throw ApiError.badRequest('Zoo is closed on the selected date.')
}
