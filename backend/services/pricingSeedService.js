import { TicketPricing } from '../models/TicketPricing.js'

const DEFAULT_TICKET_PRICING = [
  { code: 'zoo_adult', categoryCode: 'adultEntry', label: 'Entry - Adult', category: 'zoo', price: 50, isActive: true },
  { code: 'zoo_child', categoryCode: 'childEntry', label: 'Entry - Child (5-12 yrs)', category: 'zoo', price: 10, isActive: true },
  {
    code: 'zoo_kid_zone',
    categoryCode: 'kidZoneEntry',
    label: 'Kid Zone (Below 6 Years)',
    category: 'zoo',
    price: 20,
    isActive: true,
  },
  { code: 'zoo_child_free', categoryCode: 'childBelow5', label: 'Entry - Child (below 5)', category: 'zoo', price: 0, isActive: true },
  { code: 'zoo_differently_abled', categoryCode: 'differentlyAbled', label: 'Entry - Differently Abled', category: 'zoo', price: 0, isActive: true },
  { code: 'camera_video', categoryCode: 'videoCamera', label: 'Video Camera', category: 'camera', price: 150, isActive: true },
  { code: 'parking_4w_lmv', categoryCode: 'parkingLMV', label: 'Parking - 4 Wheeler (LMV)', category: 'parking', price: 50, isActive: true },
  { code: 'parking_4w_hmv', categoryCode: 'parkingHMV', label: 'Parking - 4 Wheeler (HMV)', category: 'parking', price: 100, isActive: true },
  { code: 'parking_3w', categoryCode: 'parking3Wheeler', label: 'Parking - 3 Wheeler', category: 'parking', price: 20, isActive: true },
  { code: 'parking_2w_3w', categoryCode: 'parkingTwoThree', label: 'Parking - 2 & 3 Wheeler', category: 'parking', price: 20, isActive: true },
  { code: 'battery_vehicle_adult', categoryCode: 'batteryVehicleAdult', label: 'Battery Vehicle - Adult', category: 'transport', price: 50, isActive: true },
  { code: 'battery_vehicle_child', categoryCode: 'batteryVehicleChild', label: 'Battery Vehicle - Child (5-12 yrs)', category: 'transport', price: 30, isActive: true },
]

export const seedTicketPricingIfEmpty = async () => {
  const existingCount = await TicketPricing.estimatedDocumentCount()
  if (existingCount > 0) {
    return { seeded: false, existingCount }
  }

  const normalizedPayload = DEFAULT_TICKET_PRICING.map((entry) => ({
    ...entry,
    code: entry.code.trim().toLowerCase(),
    categoryCode: entry.categoryCode.trim(),
    itemCode: entry.code.trim(),
  }))

  await TicketPricing.insertMany(normalizedPayload)
  console.log(`[seed] Inserted ${normalizedPayload.length} ticket pricing records.`)

  return { seeded: true, insertedCount: normalizedPayload.length }
}

// Idempotent upsert to guarantee baseline pricing exists without overwriting operator changes.
export const ensureDefaultTicketPricing = async () => {
  // Normalize entries to match how documents are seeded elsewhere,
  // preventing accidental duplicates caused by casing/whitespace.
  const normalized = DEFAULT_TICKET_PRICING.map((entry) => ({
    ...entry,
    code: entry.code.trim().toLowerCase(),
    categoryCode: entry.categoryCode.trim(),
    itemCode: entry.code.trim(),
  }))

  const operations = normalized.map((entry) => ({
    updateOne: {
      filter: { $or: [{ code: entry.code }, { categoryCode: entry.categoryCode }] },
      update: {
        $setOnInsert: {
          code: entry.code,
          categoryCode: entry.categoryCode,
          itemCode: entry.itemCode,
          label: entry.label,
          category: entry.category,
          price: entry.price,
        },
        // Only adjust non-unique operational fields on existing docs.
        $set: { isActive: true },
      },
      upsert: true,
    },
  }))

  let result
  try {
    result = await TicketPricing.bulkWrite(operations, { ordered: false })
  } catch (err) {
    // Bubble up a clearer message while preserving original error for diagnostics.
    throw new Error(err?.message ?? err)
  }
  // Mongoose bulkWrite result shapes vary; handle common properties conservatively
  const upserted = result?.nUpserted ?? result?.upsertedCount ?? (result?.upsertedIds ? Object.keys(result.upsertedIds).length : 0)
  const matched = result?.nMatched ?? result?.matchedCount ?? 0
  console.log(`[seed] bulkWrite result: upserted=${upserted} matched=${matched}`)
  return { upserted, matched }
}
