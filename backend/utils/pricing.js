import { ApiError } from './errors.js'

export const ALLOWED_PAYMENT_MODES = ['CASH', 'UPI', 'CARD', 'ONLINE', 'SPLIT']

export const coerceQuantity = (value) => {
  const quantity = Number.parseInt(value, 10)
  if (!Number.isFinite(quantity)) return 0
  return quantity
}

export const validateQuantity = (quantity, categoryCode) => {
  if (!Number.isInteger(quantity) || quantity <= 0) {
    throw ApiError.badRequest(`Quantity for ${categoryCode} must be a positive integer.`, {
      item: categoryCode,
      invalidQuantity: quantity,
    })
  }
}

export const assertPaymentModeAllowed = (paymentMode) => {
  if (!paymentMode || !ALLOWED_PAYMENT_MODES.includes(paymentMode)) {
    throw ApiError.badRequest('Payment mode is missing or not allowed.')
  }
}
