import { ApiError } from './errors.js'

export const ALLOWED_PAYMENT_MODES = ['CASH', 'UPI', 'CARD', 'ONLINE', 'SPLIT']
export const MAX_QUANTITY_PER_ITEM = 100

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

  if (quantity > MAX_QUANTITY_PER_ITEM) {
    throw ApiError.badRequest(`Maximum allowed quantity per ticket type is ${MAX_QUANTITY_PER_ITEM}.`, {
      item: categoryCode,
      invalidQuantity: quantity,
      allowedMax: MAX_QUANTITY_PER_ITEM,
    })
  }
}

export const assertPaymentModeAllowed = (paymentMode) => {
  if (!paymentMode || !ALLOWED_PAYMENT_MODES.includes(paymentMode)) {
    throw ApiError.badRequest('Payment mode is missing or not allowed.')
  }
}
