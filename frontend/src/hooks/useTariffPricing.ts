import { useCallback, useEffect, useState } from 'react'

// Fallback tariff definitions used only when the API is unavailable.
// Keep in sync with governed tariff codes.
const fallbackTariffs = [
  { itemCode: 'zoo_adult', price: 50, category: 'zoo', label: 'Entry - Adult', displayOrder: 1 },
  { itemCode: 'zoo_child', price: 10, category: 'zoo', label: 'Child (5 to 12 years)', displayOrder: 2 },
  { itemCode: 'zoo_kid_zone', price: 20, category: 'zoo', label: 'Kid Zone (Below 6 Years)', displayOrder: 3 },
  { itemCode: 'zoo_child_free', price: 0, category: 'zoo', label: 'Children (below 5)', displayOrder: 4 },
  { itemCode: 'zoo_differently_abled', price: 0, category: 'zoo', label: 'Differently Abled', displayOrder: 5 },
  { itemCode: 'parking_4w_lmv', price: 50, category: 'parking', label: 'Parking - 4 Wheeler (LMV)', displayOrder: 6 },
  { itemCode: 'parking_4w_hmv', price: 100, category: 'parking', label: 'Parking - 4 Wheeler (HMV)', displayOrder: 7 },
  { itemCode: 'parking_2w_3w', price: 20, category: 'parking', label: 'Parking - 2 & 3 Wheeler', displayOrder: 8 },
  { itemCode: 'battery_vehicle_adult', price: 50, category: 'transport', label: 'Battery Vehicle - Adult', displayOrder: 9 },
  { itemCode: 'battery_vehicle_child', price: 30, category: 'transport', label: 'Battery Vehicle - Child (5-12 yrs)', displayOrder: 10 },
  { itemCode: 'camera_video', price: 150, category: 'camera', label: 'Video Camera', displayOrder: 11 },
]

const fallbackPricing: Record<string, number> = Object.fromEntries(fallbackTariffs.map((item) => [item.itemCode, item.price]))
const fallbackOrderMap = new Map(fallbackTariffs.map((item) => [item.itemCode, item.displayOrder ?? 9999]))

type PricingStatus = 'idle' | 'loading' | 'success' | 'error'

type PricingResponseItem = {
  itemCode?: string
  code?: string
  price?: number
  label?: string
  category?: string
  displayOrder?: number
}

type SanitizedEntry = {
  itemCode: string
  code: string
  price: number
  label: string
  category: string
  displayOrder: number
}

const sortByDisplayOrder = (entries: PricingResponseItem[]) =>
  [...entries].sort((a, b) => (Number.isFinite(a.displayOrder) ? (a.displayOrder as number) : 9999) - (Number.isFinite(b.displayOrder) ? (b.displayOrder as number) : 9999))

export const useTariffPricing = () => {
  const [pricing, setPricing] = useState<Record<string, number>>(fallbackPricing)
  const [tariffs, setTariffs] = useState<PricingResponseItem[]>(fallbackTariffs)
  const [status, setStatus] = useState<PricingStatus>('idle')

  useEffect(() => {
    let cancelled = false

    const load = async () => {
      setStatus('loading')
      try {
        const response = await fetch('/api/bookings/pricing')
        const result = await response.json().catch(() => ({}))
        if (!response.ok) {
          throw new Error(result?.message || 'Unable to load pricing.')
        }

        const incoming: PricingResponseItem[] = Array.isArray(result?.data) ? result.data : []
        const sanitized = incoming
          .map((entry) => ({
            itemCode: entry?.itemCode?.toString().trim(),
            code: entry?.code?.toString().trim(),
            price: Number(entry?.price),
            label: entry?.label,
            category: entry?.category,
            displayOrder: Number(entry?.displayOrder),
          }))
          .filter((entry) => entry.itemCode && Number.isFinite(entry.price) && entry.price >= 0) as SanitizedEntry[]

        // De-duplicate by itemCode, keeping the lowest displayOrder
        const deduped = new Map<string, SanitizedEntry>()
        sanitized.forEach((entry) => {
          const existing = deduped.get(entry.itemCode)
          if (!existing || (Number.isFinite(entry.displayOrder) && entry.displayOrder < existing.displayOrder)) {
            deduped.set(entry.itemCode, entry)
          }
        })

        const dedupedList = Array.from(deduped.values())

        // Assign stable display orders without fallback injection; extras append after provided orders
        const extraOrderMap = new Map<string, number>()
        const highestProvidedOrder = dedupedList.length
          ? Math.max(...dedupedList.map((d) => (Number.isFinite(d.displayOrder) && d.displayOrder > 0 ? d.displayOrder : 0)))
          : 0
        let nextOrder = Math.max(highestProvidedOrder, fallbackTariffs.length) + 1

        const withOrders = dedupedList.map((entry) => {
          const hasValidOrder = Number.isFinite(entry.displayOrder) && entry.displayOrder > 0
          const fallbackOrder = fallbackOrderMap.get(entry.itemCode)
          let displayOrder = entry.displayOrder
          if (!hasValidOrder) {
            if (Number.isFinite(fallbackOrder)) {
              displayOrder = fallbackOrder as number
            } else if (extraOrderMap.has(entry.itemCode)) {
              displayOrder = extraOrderMap.get(entry.itemCode) as number
            } else {
              displayOrder = nextOrder
              extraOrderMap.set(entry.itemCode, displayOrder)
              nextOrder += 1
            }
          }
          return { ...entry, displayOrder }
        })

        const orderedTariffs = withOrders.length ? sortByDisplayOrder(withOrders) : fallbackTariffs

        // Guarantee mandated defaults appear even if API drops them
        const seen = new Set(orderedTariffs.map((t) => t.itemCode))
        fallbackTariffs.forEach((fallback) => {
          if (!seen.has(fallback.itemCode)) {
            orderedTariffs.push(fallback)
          }
        })

        const finalTariffs = sortByDisplayOrder(orderedTariffs)

        const next = Object.fromEntries(finalTariffs.map((entry) => [entry.itemCode as string, entry.price as number]))

        if (!cancelled) {
          setPricing(next)
          setTariffs(finalTariffs)
          setStatus('success')
        }
      } catch (error) {
        console.error('Failed to load pricing', error)
        if (!cancelled) setStatus('error')
      }
    }

    load()

    return () => {
      cancelled = true
    }
  }, [])

  const getPrice = useCallback((itemCode: string) => pricing[itemCode] ?? 0, [pricing])

  return {
    pricing,
    tariffs,
    status,
    hasLivePricing: status === 'success',
    getPrice,
  }
}
