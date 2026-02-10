import express from 'express'
import { TicketPricing } from '../backend/models/TicketPricing.js'
import { Ticket } from '../backend/models/Ticket.js'
import { ApiError, asyncHandler } from '../backend/utils/errors.js'
import {
  PROTECTED_ITEM_CODES,
  PROTECTED_TARIFFS,
  getDisplayOrder,
  normalizeDisplayOrder,
  resequenceTariffs,
  sortByDisplayOrder,
  upsertProtectedTariffs,
} from '../backend/utils/tariffOrder.js'

// IMPORTANT: Handlers in this file are intended to be final route handlers
// and MUST NOT accept or call `next()`. Any validation that needs to
// forward control should be implemented as explicit middleware and
// registered before these handlers. Use `asyncHandler(handler)` where
// `handler` is a function of (req, res) only.
const router = express.Router()

const normalizeCode = (value) => (typeof value === 'string' ? value.trim() : '')

const parseDate = (value) => {
  if (!value && value !== 0) return undefined
  const candidate = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(candidate.getTime())) return undefined
  return candidate
}

const resolveBoolean = (value, fallback = true) => {
  if (value === undefined) return fallback
  if (typeof value === 'boolean') return value
  if (typeof value === 'string') return value.toLowerCase() === 'true' || value.toLowerCase() === 'active'
  return fallback
}

const allowedCategories = new Set(['zoo', 'parking', 'camera', 'transport'])

const presentTariff = (entry) => ({
  id: entry._id?.toString?.() ?? entry.id,
  code: entry.code,
  itemCode: entry.itemCode,
  categoryCode: entry.categoryCode,
  label: entry.label,
  category: entry.category,
  price: entry.price,
  displayOrder: normalizeDisplayOrder(entry.displayOrder, entry.itemCode),
  isActive: Boolean(entry.isActive),
  validFrom: entry.validFrom,
  validTo: entry.validTo,
  inUse: Boolean(entry.inUse),
  updatedAt: entry.updatedAt,
})

const RESERVED_ORDERS = PROTECTED_TARIFFS.length

const assertDisplayOrder = async (displayOrder, excludeId) => {
  const numeric = Number(displayOrder)
  if (!Number.isFinite(numeric) || numeric <= 0) {
    throw ApiError.badRequest('Display order must be a positive number.')
  }
  if (numeric <= RESERVED_ORDERS) {
    throw ApiError.badRequest(`Display order must be after the ${RESERVED_ORDERS} system tariffs.`)
  }

  const conflict = await TicketPricing.findOne({ displayOrder: numeric, ...(excludeId ? { _id: { $ne: excludeId } } : {}) })
    .select('_id itemCode')
    .lean()
  if (conflict) {
    throw ApiError.badRequest('Display order is already used. Choose a different number.')
  }

  return numeric
}

const isTariffInUse = async (itemCode) => {
  if (!itemCode) return false
  const normalized = itemCode.toString().toLowerCase()
  const inUse = await Ticket.exists({ 'items.itemCode': normalized })
  return Boolean(inUse)
}

const normalisePayload = (body = {}, existing) => {
  const baseCode = normalizeCode(body.itemCode || body.code || body.categoryCode)
  const code = baseCode.toLowerCase()
  const itemCode = normalizeCode(body.itemCode || existing?.itemCode || code).toLowerCase()
  const categoryCode = normalizeCode(body.categoryCode || existing?.categoryCode || code)
  const label = normalizeCode(body.label || existing?.label || itemCode)
  const categoryInput = normalizeCode(body.category || existing?.category || 'zoo').toLowerCase()
  const category = allowedCategories.has(categoryInput) ? categoryInput : 'zoo'

  const price = Number(body.price ?? existing?.price)
  if (!Number.isFinite(price) || price < 0) {
    throw ApiError.badRequest('Price must be a non-negative number.')
  }

  const isActive = resolveBoolean(body.isActive ?? body.status ?? existing?.isActive, true)

  const displayOrderInput = body.displayOrder ?? existing?.displayOrder ?? getDisplayOrder(itemCode)
  const displayOrder = normalizeDisplayOrder(displayOrderInput, itemCode)

  const validFromInput = body.validFrom ?? body.effectiveFrom ?? existing?.validFrom
  const validToInput = body.validTo ?? body.expiresAt ?? existing?.validTo

  const validFrom = parseDate(validFromInput)
  const validTo = parseDate(validToInput)

  if (validFrom && validTo && validFrom > validTo) {
    throw ApiError.badRequest('validFrom must be on or before validTo.')
  }

  if (!code) {
    throw ApiError.badRequest('A tariff itemCode is required.')
  }

  return {
    code,
    itemCode,
    categoryCode,
    label,
    category,
    price,
    displayOrder,
    isActive,
    validFrom,
    validTo,
  }
}

router.get(
  '/tariffs',
  asyncHandler(async (_req, res) => {
    const tariffs = await resequenceTariffs(TicketPricing)

    const usageMap = new Map()
    if (tariffs.length) {
      const itemCodes = tariffs
        .map((t) => t.itemCode?.toLowerCase?.())
        .filter(Boolean)

      if (itemCodes.length) {
        const usages = await Ticket.aggregate([
          { $match: { 'items.itemCode': { $in: itemCodes } } },
          { $unwind: '$items' },
          { $match: { 'items.itemCode': { $in: itemCodes } } },
          { $group: { _id: '$items.itemCode', count: { $sum: 1 } } },
        ])
        usages.forEach((u) => usageMap.set(u._id.toLowerCase(), u.count || 0))
      }
    }

    const seen = new Set()
    const safeTariffs = tariffs
      .map((t) => {
        const itemCodeKey = t.itemCode?.toLowerCase?.() || ''
        if (seen.has(itemCodeKey)) return null
        seen.add(itemCodeKey)
        const isProtected = PROTECTED_ITEM_CODES.has(itemCodeKey)
        return {
          ...t,
          isActive: isProtected ? true : t.isActive,
          displayOrder: normalizeDisplayOrder(t.displayOrder, t.itemCode),
          inUse: isProtected ? true : itemCodeKey ? usageMap.get(itemCodeKey) > 0 : false,
        }
      })
      .filter(Boolean)
      .sort(sortByDisplayOrder)

    res.json({ success: true, data: safeTariffs.map(presentTariff) })
  }),
)

router.post(
  '/tariffs',
  asyncHandler(async (req, res) => {
    const payload = normalisePayload(req.body)

    if (PROTECTED_ITEM_CODES.has(payload.itemCode)) {
      throw ApiError.badRequest('GO-mandated tariff codes are reserved and cannot be added again.')
    }

    payload.displayOrder = await assertDisplayOrder(payload.displayOrder)

    const conflict = await TicketPricing.findOne({
      $or: [{ code: payload.code }, { itemCode: payload.itemCode }, { categoryCode: payload.categoryCode }],
    })
      .select('code itemCode categoryCode')
      .lean()

    if (conflict) {
      throw ApiError.badRequest('A tariff with this code already exists. Use a unique itemCode/categoryCode.')
    }

    const created = await TicketPricing.create(payload)
    await resequenceTariffs(TicketPricing)
    const inUse = await isTariffInUse(payload.itemCode)
    res.status(201).json({ success: true, data: presentTariff({ ...created.toObject(), inUse }), message: 'Tariff created.' })
  }),
)

router.put(
  '/tariffs/:id',
  asyncHandler(async (req, res) => {
    const existing = await TicketPricing.findById(req.params.id)
    if (!existing) {
      throw ApiError.notFound('Tariff not found.')
    }

    if (PROTECTED_ITEM_CODES.has(existing.itemCode?.toLowerCase?.())) {
      throw ApiError.badRequest('This tariff is mandated by GO and cannot be edited.')
    }

    const payload = normalisePayload({ ...req.body, itemCode: existing.itemCode, categoryCode: existing.categoryCode, code: existing.code }, existing)

    payload.displayOrder = await assertDisplayOrder(payload.displayOrder, existing._id)

    existing.label = payload.label
    existing.category = payload.category
    existing.price = payload.price
    existing.isActive = payload.isActive
    existing.displayOrder = payload.displayOrder
    existing.validFrom = payload.validFrom
    existing.validTo = payload.validTo

    await existing.save()
    await resequenceTariffs(TicketPricing)

    const inUse = await isTariffInUse(existing.itemCode)
    res.json({ success: true, data: presentTariff({ ...existing.toObject(), inUse }), message: 'Tariff updated.' })
  }),
)

router.patch(
  '/tariffs/:id/toggle',
  asyncHandler(async (req, res) => {
    const existing = await TicketPricing.findById(req.params.id)
    if (!existing) {
      throw ApiError.notFound('Tariff not found.')
    }

    if (PROTECTED_ITEM_CODES.has(existing.itemCode?.toLowerCase?.())) {
      throw ApiError.badRequest('This tariff is mandated by GO and must remain active.')
    }

    existing.isActive = !existing.isActive
    await existing.save()
    await resequenceTariffs(TicketPricing)

    const inUse = await isTariffInUse(existing.itemCode)

    res.json({ success: true, data: presentTariff({ ...existing.toObject(), inUse }), message: existing.isActive ? 'Tariff enabled.' : 'Tariff disabled.' })
  }),
)

router.delete(
  '/tariffs/:id',
  asyncHandler(async (req, res) => {
    const existing = await TicketPricing.findById(req.params.id).lean()
    if (!existing) {
      throw ApiError.notFound('Tariff not found.')
    }

    if (PROTECTED_ITEM_CODES.has(existing.itemCode?.toLowerCase?.())) {
      throw ApiError.badRequest('This tariff is mandated by GO and cannot be deleted.')
    }

    const itemCode = existing.itemCode?.toLowerCase()
    const inUse = itemCode
      ? await Ticket.exists({ 'items.itemCode': itemCode })
      : await Ticket.exists({ 'items.categoryCode': existing.categoryCode })

    if (inUse) {
      throw ApiError.badRequest('This tariff is used by existing tickets and cannot be deleted. Disable it instead.')
    }

    await TicketPricing.deleteOne({ _id: existing._id })
    await resequenceTariffs(TicketPricing)
    res.json({ success: true, message: 'Tariff deleted.' })
  }),
)

export default router
