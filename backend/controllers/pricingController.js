import { TicketPricing } from '../models/TicketPricing.js'
import { asyncHandler } from '../utils/errors.js'
import { normalizeDisplayOrder, PROTECTED_ITEM_CODES, resequenceTariffs, upsertProtectedTariffs } from '../utils/tariffOrder.js'

const isWithinValidityWindow = (entry, now = new Date()) => {
  const startsOk = !entry?.validFrom || entry.validFrom <= now
  const endsOk = !entry?.validTo || entry.validTo >= now
  return startsOk && endsOk
}

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
  updatedAt: entry.updatedAt,
})

export const getActivePricing = asyncHandler(async (_req, res) => {
  await upsertProtectedTariffs(TicketPricing)
  const now = new Date()

  const resequenced = await resequenceTariffs(TicketPricing)

  const active = resequenced
    .filter((entry) => isWithinValidityWindow(entry, now))
    .filter((entry) => entry.isActive)
    .map((entry) => {
      if (PROTECTED_ITEM_CODES.has(entry.itemCode?.toLowerCase?.())) {
        return { ...entry, isActive: true }
      }
      return entry
    })

  res.json({ success: true, data: active.map(presentTariff) })
})
