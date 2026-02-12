export const CANONICAL_TARIFF_ORDER = [
  { itemCode: 'zoo_adult', category: 'zoo', label: 'Entry - Adult', displayOrder: 1, price: 50 },
  { itemCode: 'zoo_child', category: 'zoo', label: 'Child (5 to 12 years)', displayOrder: 2, price: 10 },
  { itemCode: 'zoo_kid_zone', category: 'zoo', label: 'Kid Zone (Below 6 Years)', displayOrder: 3, price: 20 },
  { itemCode: 'zoo_child_free', category: 'zoo', label: 'Children (below 5)', displayOrder: 4, price: 0 },
  { itemCode: 'zoo_differently_abled', category: 'zoo', label: 'Differently Abled', displayOrder: 5, price: 0 },
  { itemCode: 'parking_4w_lmv', category: 'parking', label: 'Parking - 4 Wheeler (LMV)', displayOrder: 6, price: 50 },
  { itemCode: 'parking_4w_hmv', category: 'parking', label: 'Parking - 4 Wheeler (HMV)', displayOrder: 7, price: 100 },
  { itemCode: 'parking_2w_3w', category: 'parking', label: 'Parking - 2 & 3 Wheeler', displayOrder: 8, price: 20 },
  { itemCode: 'battery_vehicle_adult', category: 'transport', label: 'Battery Vehicle - Adult', displayOrder: 9, price: 50 },
  { itemCode: 'battery_vehicle_child', category: 'transport', label: 'Battery Vehicle - Child (5-12 yrs)', displayOrder: 10, price: 30 },
  { itemCode: 'camera_video', category: 'camera', label: 'Video Camera', displayOrder: 11, price: 150 },
]

export const PROTECTED_ITEM_CODES = new Set(CANONICAL_TARIFF_ORDER.map((entry) => entry.itemCode.toLowerCase()))
const PROTECTED_CATEGORY_CODE_MAP = {
  zoo_adult: 'adultEntry',
  zoo_child: 'childEntry',
  zoo_kid_zone: 'kidZoneEntry',
  zoo_child_free: 'childBelow5',
  zoo_differently_abled: 'differentlyAbled',
  parking_4w_lmv: 'parkingLMV',
  parking_4w_hmv: 'parkingHMV',
  parking_2w_3w: 'parkingTwoThree',
  battery_vehicle_adult: 'batteryAdult',
  battery_vehicle_child: 'batteryChild',
  camera_video: 'videoCamera',
}

export const CATEGORY_SORT_ORDER = ['zoo', 'parking', 'transport', 'camera']

const displayOrderMap = new Map(CANONICAL_TARIFF_ORDER.map((entry) => [entry.itemCode.toLowerCase(), entry.displayOrder]))
const canonicalCount = CANONICAL_TARIFF_ORDER.length

export const getDisplayOrder = (itemCode) => {
  if (!itemCode) return canonicalCount + 1
  const key = itemCode.toString().toLowerCase()
  return displayOrderMap.get(key) ?? canonicalCount + 1
}

export const normalizeDisplayOrder = (value, itemCode) => {
  const coerced = Number(value)
  if (!Number.isFinite(coerced) || coerced <= 0) return getDisplayOrder(itemCode)
  return Math.round(coerced)
}

export const sortByDisplayOrder = (a = {}, b = {}) => {
  const orderA = normalizeDisplayOrder(a.displayOrder, a.itemCode)
  const orderB = normalizeDisplayOrder(b.displayOrder, b.itemCode)
  return orderA - orderB || (a.updatedAt && b.updatedAt ? new Date(b.updatedAt) - new Date(a.updatedAt) : 0)
}

export const PROTECTED_TARIFFS = CANONICAL_TARIFF_ORDER.map((entry) => ({
  ...entry,
  isActive: true,
  inUse: true,
}))

const toKey = (value) => (value ? value.toString().toLowerCase() : '')

export const resequenceTariffs = async (Model) => {
  if (!Model) return []
  await upsertProtectedTariffs(Model)

  const docs = await Model.find({
    itemCode: { $exists: true, $ne: '' },
    label: { $exists: true, $ne: '' },
    category: { $exists: true, $ne: '' },
  })
    .sort({ displayOrder: 1, updatedAt: -1, createdAt: -1 })
    .lean()

  const byCode = new Map()
  const duplicates = []

  docs.forEach((doc) => {
    const key = toKey(doc.itemCode)
    if (!key) return
    const order = normalizeDisplayOrder(doc.displayOrder, key)
    const existing = byCode.get(key)
    if (!existing || order < existing.order) {
      if (existing) duplicates.push(existing.doc)
      byCode.set(key, { doc, order })
    } else {
      duplicates.push(doc)
    }
  })

  let order = 1
  const updates = []

  CANONICAL_TARIFF_ORDER.forEach((canonical) => {
    const key = toKey(canonical.itemCode)
    const match = byCode.get(key)
    const doc = match?.doc
    if (doc) {
      const needsUpdate =
        doc.displayOrder !== order ||
        doc.isActive !== true ||
        doc.price !== canonical.price ||
        doc.label !== canonical.label ||
        doc.category !== canonical.category

      if (needsUpdate) {
        updates.push({
          updateOne: {
            filter: { _id: doc._id },
            update: {
              $set: {
                displayOrder: order,
                isActive: true,
                price: canonical.price,
                label: canonical.label,
                category: canonical.category,
              },
            },
          },
        })
      }
      byCode.delete(key)
    }
    order += 1
  })

  duplicates.forEach((dup) => {
    updates.push({ updateOne: { filter: { _id: dup._id }, update: { $set: { isActive: false } } } })
  })

  const remaining = Array.from(byCode.values()).sort((a, b) => a.order - b.order || new Date(b.doc.updatedAt || 0) - new Date(a.doc.updatedAt || 0))

  remaining.forEach(({ doc }) => {
    if (doc.displayOrder !== order) {
      updates.push({ updateOne: { filter: { _id: doc._id }, update: { $set: { displayOrder: order } } } })
    }
    order += 1
  })

  if (updates.length) {
    await Model.bulkWrite(updates, { ordered: false })
  }

  const normalized = await Model.find({
    itemCode: { $exists: true, $ne: '' },
    label: { $exists: true, $ne: '' },
    category: { $exists: true, $ne: '' },
  })
    .sort({ displayOrder: 1, updatedAt: -1, createdAt: -1 })
    .lean()

  const seen = new Set()
  const unique = []
  normalized.forEach((doc) => {
    const key = toKey(doc.itemCode)
    if (!key || seen.has(key)) return
    seen.add(key)
    const categoryCode = doc.categoryCode || PROTECTED_CATEGORY_CODE_MAP[key] || doc.itemCode
    unique.push({
      ...doc,
      code: doc.code || doc.itemCode,
      categoryCode,
      displayOrder: normalizeDisplayOrder(doc.displayOrder, doc.itemCode),
    })
  })

  PROTECTED_TARIFFS.forEach((fallback) => {
    const key = toKey(fallback.itemCode)
    if (seen.has(key)) return
    const categoryCode = PROTECTED_CATEGORY_CODE_MAP[key] || fallback.itemCode
    unique.push({
      ...fallback,
      code: fallback.itemCode,
      categoryCode,
      itemCode: fallback.itemCode,
      displayOrder: fallback.displayOrder,
      _id: `protected-${key}`,
    })
    seen.add(key)
  })

  return unique.sort(sortByDisplayOrder)
}

export const upsertProtectedTariffs = async (Model) => {
  if (!Model) return { upserted: 0, matched: 0 }
  const operations = PROTECTED_TARIFFS.map((entry) => ({
    updateOne: {
      filter: { itemCode: entry.itemCode },
      update: {
        $setOnInsert: {
          code: entry.itemCode,
          categoryCode: entry.itemCode,
          itemCode: entry.itemCode,
          label: entry.label,
          category: entry.category,
        },
        $set: {
          price: entry.price,
          displayOrder: entry.displayOrder,
          isActive: true,
        },
      },
      upsert: true,
    },
  }))

  const result = await Model.bulkWrite(operations, { ordered: false })
  const upserted = result?.upsertedCount ?? (result?.upsertedIds ? Object.keys(result.upsertedIds).length : 0)
  const matched = result?.matchedCount ?? 0
  return { upserted, matched }
}
