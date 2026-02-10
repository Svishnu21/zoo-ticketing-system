import { TicketPricing } from '../models/TicketPricing.js'
import { ApiError } from '../utils/errors.js'
import { coerceQuantity, validateQuantity } from '../utils/pricing.js'
import { ensureDefaultTicketPricing } from './pricingSeedService.js'
import { resequenceTariffs } from '../utils/tariffOrder.js'

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
  zoo_kid_zone: 'kidZoneEntry',
  kidZoneEntry: 'kidZoneEntry',
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

const normalizeCode = (value) => (typeof value === 'string' ? value.trim() : '')

const buildCategoryLookup = (pricingMap = {}) => {
  const lookup = new Map()
  const pricingValues = typeof pricingMap.values === 'function' ? Array.from(pricingMap.values()) : Object.values(pricingMap)

  pricingValues.forEach((entry) => {
    const categoryCode = normalizeCode(entry?.categoryCode)
    if (!categoryCode) return

    const candidates = [entry?.itemCode, entry?.code, entry?.categoryCode]
      .map((key) => normalizeCode(key).toLowerCase())
      .filter(Boolean)

    candidates.forEach((key) => {
      if (!lookup.has(key)) lookup.set(key, categoryCode)
    })
  })

  return lookup
}

export const resolveCategoryCodeForItem = (itemCode, pricingMap = {}) => {
  const normalizedItemCode = normalizeCode(itemCode)

  if (!normalizedItemCode) {
    throw ApiError.badRequest('Each item must include an itemCode.')
  }

  const lower = normalizedItemCode.toLowerCase()

  const legacyMapping = ITEM_CODE_TO_CATEGORY_CODE[lower]
  if (legacyMapping) return legacyMapping

  // If the provided itemCode is already a canonical category key (e.g. 'parkingLMV'),
  // accept it directly (case-insensitive) and return the canonical-cased value.
  const canonicalValues = Object.values(ITEM_CODE_TO_CATEGORY_CODE || {})
  const canonicalMap = canonicalValues.reduce((acc, v) => {
    if (v) acc[v.toString().toLowerCase()] = v
    return acc
  }, {})
  if (canonicalMap[lower]) return canonicalMap[lower]

  const lookup = buildCategoryLookup(pricingMap)
  const resolved = lookup.get(normalizedItemCode.toLowerCase())

  if (!resolved) {
    console.error('[pricing] No mapping for itemCode -> categoryCode', normalizedItemCode)
    throw ApiError.internal(`No pricing mapping for itemCode: ${normalizedItemCode}`)
  }

  return resolved
}

export const loadActivePricingMap = async () => {
  await ensureDefaultTicketPricing()
  const normalized = await resequenceTariffs(TicketPricing)

  const now = new Date()
  const pricings = normalized.filter((entry) => {
    if (!entry?.isActive) return false
    const withinFrom = !entry.validFrom || entry.validFrom <= now
    const withinTo = !entry.validTo || entry.validTo >= now
    return withinFrom && withinTo
  })

  const pricingMap = new Map()
  if (Array.isArray(pricings)) {
    for (const p of pricings) {
      if (!p) continue
      const keys = []
      if (p.categoryCode) keys.push(p.categoryCode)
      if (p.itemCode) keys.push(p.itemCode)
      if (p.itemCode) {
        const alt = ITEM_CODE_TO_CATEGORY_CODE[p.itemCode]
        if (alt) keys.push(alt)
      }
      // also include lowercase variants for forgiving lookup
      for (const k of [...keys]) {
        if (typeof k === 'string' && k.trim()) keys.push(k.toLowerCase())
      }

      for (const k of keys) {
        if (!k) continue
        if (!pricingMap.has(k)) pricingMap.set(k, p)
      }
    }
  }

  return pricingMap
}

const resolvePricingForCategory = (categoryCode, pricingMap, itemCode) => {
  const isFreeCategory = categoryCode === 'differentlyAbled' || categoryCode === 'childBelow5'

  const tryGet = (key) => {
    if (!key) return undefined
    if (typeof pricingMap.get === 'function') return pricingMap.get(key)
    return pricingMap[key]
  }

  let pricingEntry = tryGet(categoryCode) || tryGet(String(categoryCode).toLowerCase())

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

  const hasEntries = pricingMap && ((typeof pricingMap.size === 'number' && pricingMap.size > 0) || Object.keys(pricingMap || {}).length > 0)
  if (!hasEntries) {
    throw ApiError.internal(`${PRICING_MISSING_MESSAGE}: no active pricing records loaded`)
  }

  const accumulator = new Map()

  items.forEach((item) => {
    const rawCode = item?.itemCode ?? item?.code ?? item?.categoryCode ?? item?.id
    const itemCode = typeof rawCode === 'string' ? rawCode.trim() : ''

    const categoryCode = resolveCategoryCodeForItem(itemCode, pricingMap)

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
