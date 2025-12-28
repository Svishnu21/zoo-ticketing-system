import { TicketPricing } from '../models/TicketPricing.js'
import { ApiError } from '../utils/errors.js'
import { coerceQuantity, validateQuantity } from '../utils/pricing.js'

const PRICING_MISSING_MESSAGE = 'Ticket pricing not configured'

// Free categories handled purely in-memory (never auto-upserted to DB)
const FREE_CATEGORY_FALLBACKS = {
  differentlyAbled: {
    code: 'zoo_differently_abled',
    categoryCode: 'differentlyAbled',
    itemCode: 'zoo_differently_abled',
    label: 'Entry - Differently Abled',
    category: 'zoo',
    price: 0,
  },
  childBelow5: {
    code: 'zoo_child_free',
    categoryCode: 'childBelow5',
    itemCode: 'zoo_child_free',
    label: 'Entry - Child (below 5)',
    category: 'zoo',
    price: 0,
  },
}

// Shared mapping for any legacy callers of buildPricedItems
export const ITEM_CODE_TO_CATEGORY_CODE = {
  // Zoo Entry
  zoo_adult: 'adultEntry',
  zoo_child: 'childEntry',
  zoo_differently_abled: 'differentlyAbled',
  zoo_child_free: 'childBelow5',

  // Parking (canonical DB keys)
  parking_4w_lmv: 'parkingLMV',
  parking_4w_hmv: 'parkingHMV',
  parking_2w_3w: 'parkingTwoThree',

  // Transport
  battery_vehicle_adult: 'batteryAdult',
  battery_vehicle_child: 'batteryChild',

  // Camera
  camera_video: 'videoCamera',
}

export const loadActivePricingMap = async () => {
  const pricings = await TicketPricing.find({ isActive: true }).lean()

  const pricingMap = {}
  if (Array.isArray(pricings)) {
    for (const p of pricings) {
      if (!p?.categoryCode) continue
      pricingMap[p.categoryCode] = p
    }
  }

  return pricingMap
}

const resolvePricingForCategory = (categoryCode, pricingMap, itemCode) => {
  const isFreeCategory = categoryCode === 'differentlyAbled' || categoryCode === 'childBelow5'
  const pricingEntry = typeof pricingMap.get === 'function' ? pricingMap.get(categoryCode) : pricingMap[categoryCode]

  if (!pricingEntry && !isFreeCategory) {
    throw ApiError.badRequest(`Ticket pricing not configured for ${categoryCode}`)
  }

  const price = isFreeCategory ? 0 : pricingEntry?.price

  if (typeof price !== 'number') {
    throw ApiError.internal(`Invalid price value for ${categoryCode}`)
  }

  if (!pricingEntry && isFreeCategory) {
    const fallback = FREE_CATEGORY_FALLBACKS[categoryCode]
    return { ...fallback, price, itemCode: itemCode || fallback.itemCode }
  }

  return {
    code: pricingEntry.code ?? categoryCode,
    categoryCode,
    itemCode: pricingEntry.itemCode ?? itemCode ?? pricingEntry.code,
    label: pricingEntry.label ?? itemCode ?? pricingEntry.code,
    category: pricingEntry.category ?? 'zoo',
    price,
  }
}

export const buildPricedItems = (items = [], pricingMap = new Map()) => {
  if (!Array.isArray(items)) {
    throw ApiError.badRequest('Items must be provided as an array.')
  }

  if (!pricingMap || (pricingMap.size === 0 && Object.keys(pricingMap).length === 0)) {
    throw ApiError.internal(`${PRICING_MISSING_MESSAGE}: no active pricing records loaded`)
  }

  const accumulator = new Map()

  items.forEach((item) => {
    const rawCode = item?.itemCode ?? item?.code ?? item?.categoryCode ?? item?.id
    const itemCode = typeof rawCode === 'string' ? rawCode.trim() : ''

    if (!itemCode) {
      throw ApiError.badRequest('Each item must include an itemCode.')
    }

    const categoryCode = ITEM_CODE_TO_CATEGORY_CODE[itemCode]
    if (!categoryCode) {
      console.error('[pricing] No mapping for itemCode -> categoryCode', itemCode)
      throw ApiError.internal(`No pricing mapping for itemCode: ${itemCode}`)
    }

    const resolvedPricing = resolvePricingForCategory(categoryCode, pricingMap, itemCode)

    const quantity = coerceQuantity(item?.qty ?? item?.quantity)
    validateQuantity(quantity, resolvedPricing.code)

    const existing = accumulator.get(resolvedPricing.code) || {
      itemCode,
      itemLabel: resolvedPricing.label,
      category: resolvedPricing.category,
      unitPrice: resolvedPricing.price,
      quantity: 0,
    }

    existing.quantity += quantity
    existing.amount = existing.quantity * existing.unitPrice

    accumulator.set(resolvedPricing.code, existing)
  })

  const pricedItems = Array.from(accumulator.values())
  const totalAmount = pricedItems.reduce((sum, current) => sum + current.amount, 0)

  if (pricedItems.length === 0) {
    throw ApiError.badRequest('At least one ticket item with quantity greater than zero is required.')
  }

  return { pricedItems, totalAmount }
}
