import { ApiError } from './errors.js'

const MAX_FUTURE_DAYS = 60

const toDateOnlyUtc = (value) => {
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) {
    throw ApiError.badRequest('Visit date is invalid. Provide a valid date string (YYYY-MM-DD).')
  }
  return new Date(Date.UTC(parsed.getUTCFullYear(), parsed.getUTCMonth(), parsed.getUTCDate()))
}

export const todayIsoDate = () => {
  // Use Asia/Kolkata timezone for the zoo's local date
  return new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' })
}

export const isOnlineBookingCutoffReached = () => {
  const now = new Date()
  const options = { timeZone: 'Asia/Kolkata', hour: 'numeric', minute: 'numeric', hour12: false }
  const timeStr = now.toLocaleString('en-US', options)
  const [hours, minutes] = timeStr.split(':').map(Number)
  // Cutoff at 16:30 (4:30 PM)
  return hours > 16 || (hours === 16 && minutes >= 30)
}

export const normaliseVisitDate = (value) => {
  if (!value) {
    throw ApiError.badRequest('Visit date is required.')
  }

  const normalized = toDateOnlyUtc(value)
  const isoDate = normalized.toISOString().slice(0, 10)
  return { dateOnly: normalized, isoDate }
}

export const assertVisitDateBounds = (isoDate, { enforceTuesdayClosure = true } = {}) => {
  const today = todayIsoDate()

  if (isoDate < today) {
    throw ApiError.badRequest('Visit date cannot be in the past.')
  }

  const maxFutureDate = new Date(today)
  maxFutureDate.setUTCDate(maxFutureDate.getUTCDate() + MAX_FUTURE_DAYS)
  const maxFutureIso = maxFutureDate.toISOString().slice(0, 10)

  if (isoDate > maxFutureIso) {
    throw ApiError.badRequest(`Visit date cannot be more than ${MAX_FUTURE_DAYS} days from today.`)
  }

  if (enforceTuesdayClosure) {
    // Park remains closed on Tuesdays unless an online override is explicitly applied.
    const visitWeekday = new Date(isoDate).getUTCDay()
    if (visitWeekday === 2) {
      throw ApiError.badRequest('The park is closed on Tuesdays. Please select another date.')
    }
  }
}

export const ensureVisitDateIsToday = (isoDate) => {
  const today = todayIsoDate()
  if (isoDate !== today) {
    throw ApiError.forbidden('Ticket is not valid for today.')
  }
}
