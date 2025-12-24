import type React from 'react'
import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'

import aboutParkImage from '@/assets/images/about_park.jpg'
import { Button } from '@/components/ui/Button'

const animalAdoptionPrices = {
  Birds: [
    { name: 'Indian Peafowl', pricePerDay: 200 },
    { name: 'White Peafowl', pricePerDay: 200 },
    { name: 'Rose Ringed Parakeet', pricePerDay: 100 },
    { name: 'Alexandrine Parakeet', pricePerDay: 100 },
    { name: 'Cockatiel', pricePerDay: 100 },
    { name: 'Budgerigar', pricePerDay: 100 },
    { name: 'Grey Partridge', pricePerDay: 100 },
    { name: 'Grey Pelican', pricePerDay: 200 },
    { name: 'Grey Heron', pricePerDay: 200 },
    { name: 'Painted Stork', pricePerDay: 200 },
  ],
  Mammals: [
    { name: 'Bonnet Macaque', pricePerDay: 500 },
    { name: 'Rhesus Macaque', pricePerDay: 500 },
    { name: 'Common Langur', pricePerDay: 500 },
    { name: 'Spotted Deer', pricePerDay: 500 },
    { name: 'Sambar Deer', pricePerDay: 500 },
    { name: 'Asian Palm Civet', pricePerDay: 500 },
    { name: 'Bengal Fox', pricePerDay: 500 },
    { name: 'Golden Jackal', pricePerDay: 500 },
  ],
  Reptiles: [
    { name: 'Red-eared Slider', pricePerDay: 200 },
    { name: 'Indian Black Turtle', pricePerDay: 200 },
    { name: 'Indian Star Tortoise', pricePerDay: 200 },
    { name: 'Marsh Crocodile', pricePerDay: 500 },
    { name: 'Indian Rock Python', pricePerDay: 600 },
  ],
} as const

type Category = keyof typeof animalAdoptionPrices

// Per-row lifecycle to manage inline editing
type RowMode = 'IDLE' | 'EDITING' | 'CONFIRMED'

type RowState = {
  quantity: number
  days: number
  months: number
  years: number
  mode: RowMode
}

type RowSnapshot = {
  quantity: number
  days: number
  months: number
  years: number
  mode: RowMode
}

type RowErrors = {
  quantity?: string
  duration?: string
}

const formatCurrency = (value: number): string =>
  value.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

const loadCartItems = () => {
  try {
    const raw = localStorage.getItem('cartItems')
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

const calculateCartTotal = (items: Array<{ price?: number; quantity?: number }>) =>
  items.reduce((sum, item) => sum + (item.price ?? 0) * (item.quantity ?? 1), 0)

type AdoptionSelection = {
  name: string
  category: string
  quantity: number
  durationDays: number
  durationMonths: number
  priceINR: number
}

export function ChooseAdoptionPage() {
  const catalogEntries = useMemo(
    () =>
      (Object.keys(animalAdoptionPrices) as Category[]).flatMap((category) =>
        animalAdoptionPrices[category].map((animal) => ({ ...animal, category, key: `${category}-${animal.name}` })),
      ),
    [],
  )

  const buildInitialRowState = () => {
    const initial: Record<string, RowState> = {}
    catalogEntries.forEach((entry) => {
      initial[entry.key] = { quantity: 0, days: 0, months: 0, years: 0, mode: 'IDLE' }
    })
    return initial
  }

  const [rowState, setRowState] = useState<Record<string, RowState>>(buildInitialRowState)
  const [rowErrors, setRowErrors] = useState<Record<string, RowErrors>>({})
  const [snapshots, setSnapshots] = useState<Record<string, RowSnapshot>>({})
  // Start with zero so grand total remains 0 until user clicks Adopt
  const [cartTotal, setCartTotal] = useState<number>(0)
  const [toast, setToast] = useState<string | null>(null)

  useEffect(() => {
    document.body.classList.add('no-floating-buttons')
    return () => {
      document.body.classList.remove('no-floating-buttons')
    }
  }, [])

  useEffect(() => {
    setRowState(buildInitialRowState())
  }, [catalogEntries])

  const updateCartTotal = (items?: Array<{ price?: number; quantity?: number }>) => {
    const source = items ?? loadCartItems()
    setCartTotal(calculateCartTotal(source))
  }

  const showToast = (message: string) => {
    setToast(message)
    window.setTimeout(() => setToast(null), 3000)
  }

  const getRowState = (key: string): RowState => rowState[key] ?? { quantity: 0, days: 0, months: 0, years: 0, mode: 'IDLE' }

  const handleRowInputChange = (key: string, field: keyof RowState, minValue: number) =>
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const parsed = Number.parseInt(event.target.value, 10)
      const value = Number.isNaN(parsed) ? minValue : Math.max(minValue, parsed)
      setRowState((prev) => {
        const current = getRowState(key)
        if (current.mode === 'CONFIRMED') return prev
        return {
          ...prev,
          [key]: {
            ...current,
            [field]: value,
            mode: current.mode === 'IDLE' ? 'IDLE' : 'EDITING',
          },
        }
      })
      setRowErrors((prev) => ({
        ...prev,
        [key]: {
          ...prev[key],
          [field === 'quantity' ? 'quantity' : 'duration']: undefined,
        },
      }))
    }

  const computeRowTotal = (entryKey: string, pricePerDay: number) => {
    const current = getRowState(entryKey)
    const totalDays = current.days + current.months * 30 + current.years * 365
    if (current.quantity < 1 || totalDays <= 0) {
      return 0
    }
    return totalDays * pricePerDay * current.quantity
  }

  const validateRow = (entryKey: string): RowErrors => {
    const current = getRowState(entryKey)
    const totalDays = current.days + current.months * 30 + current.years * 365
    const errors: RowErrors = {}
    if (current.quantity < 1) {
      errors.quantity = 'Quantity must be at least 1.'
    }
    if (totalDays <= 0) {
      errors.duration = 'Set at least one day, month, or year.'
    }
    return errors
  }

  const enterEditMode = (entryKey: string) => {
    // snapshot before editing so Cancel can restore
    const current = getRowState(entryKey)
    setSnapshots((prev) => ({
      ...prev,
      [entryKey]: { ...current },
    }))
    setRowState((prev) => ({
      ...prev,
      [entryKey]: { ...current, mode: 'EDITING' },
    }))
  }

  const cancelEdit = (entryKey: string) => {
    const snapshot = snapshots[entryKey]
    if (snapshot) {
      setRowState((prev) => ({
        ...prev,
        [entryKey]: { ...snapshot },
      }))
    } else {
      setRowState((prev) => ({
        ...prev,
        [entryKey]: getRowState(entryKey),
      }))
    }
    setRowErrors((prev) => ({ ...prev, [entryKey]: {} }))
  }

  const saveRowToCart = (entry: { key: string; name: string; pricePerDay: number }) => {
    const current = getRowState(entry.key)
    const totalDays = current.days + current.months * 30 + current.years * 365
    const lineTotal = totalDays * entry.pricePerDay * current.quantity

    const cartItems = loadCartItems().filter((item: { name?: string }) => item.name !== `Adoption: ${entry.name}`)
    const item = { name: `Adoption: ${entry.name}`, price: lineTotal, quantity: 1 }
    cartItems.push(item)
    try {
      localStorage.setItem('cartItems', JSON.stringify(cartItems))
    } catch (err) {
      console.error('Failed to save cart items', err)
    }
    updateCartTotal(cartItems)
  }

  const buildAdoptionSelections = (): AdoptionSelection[] => {
    return catalogEntries.reduce<AdoptionSelection[]>((acc, entry) => {
      const current = getRowState(entry.key)
      const totalDays = current.days + current.months * 30 + current.years * 365
      if (current.quantity < 1 || totalDays <= 0) return acc

      const lineTotal = totalDays * entry.pricePerDay * current.quantity
      const durationMonths = current.months + current.years * 12

      acc.push({
        name: entry.name,
        category: entry.category,
        quantity: current.quantity,
        durationDays: current.days,
        durationMonths,
        priceINR: lineTotal,
      })

      return acc
    }, [])
  }

  const persistAdoptionSelections = () => {
    const selections = buildAdoptionSelections()
    if (!selections.length) {
      localStorage.removeItem('adoptionSelections')
      localStorage.removeItem('adoptionSelection')
      localStorage.removeItem('adoptionFlow')
      return selections
    }

    const total = selections.reduce((sum, item) => sum + (item.priceINR || 0), 0)
    localStorage.setItem('adoptionSelections', JSON.stringify(selections))
    localStorage.setItem('adoptionSelection', JSON.stringify({ items: selections, amount: total }))
    localStorage.setItem('adoptionFlow', 'true')
    return selections
  }

  const confirmRow = (entry: { key: string; name: string; pricePerDay: number }) => {
    const errors = validateRow(entry.key)
    setRowErrors((prev) => ({ ...prev, [entry.key]: errors }))
    if (errors.quantity || errors.duration) {
      return
    }

    saveRowToCart(entry)

    const current = getRowState(entry.key)
    setSnapshots((prev) => ({
      ...prev,
      [entry.key]: { ...current },
    }))

    setRowState((prev) => ({
      ...prev,
      [entry.key]: { ...current, mode: 'CONFIRMED' },
    }))
    persistAdoptionSelections()
    showToast(`${entry.name} added to cart`)
  }

  const handleProceed = () => {
    const cartItems = loadCartItems()
    if (!cartItems.length) {
      showToast('Add at least one adoption before proceeding to payment.')
      return
    }
    persistAdoptionSelections()
    window.location.href = '/review-adoption.html'
  }

  const grandTotalDisplay = `₹ ${formatCurrency(cartTotal)}`

  return (
    <div className="page-enter space-y-16 bg-soft-bg pb-32">
      <section className="relative isolate overflow-hidden">
        <div className="absolute inset-0">
          <img
            src={aboutParkImage}
            alt="Leafy canopy across the park"
            className="h-full w-full object-cover opacity-35"
            loading="lazy"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-forest-green/40 via-forest-green/15 to-soft-bg/80" />
        </div>
        <div className="relative z-10">
          <div className="container py-16">
            <div className="mx-auto max-w-3xl space-y-4 text-center text-white">
              <span className="inline-flex items-center justify-center rounded-[26px] bg-[#8B5E3C] px-6 py-3 text-lg font-black uppercase tracking-[0.28em] text-[#FCE7C8] shadow-[0_16px_32px_rgba(77,52,28,0.35)]">
                Choose Your Wild Animal for Adoption
              </span>
              <p className="text-base font-medium text-white/85 md:text-lg">
                Select a species, choose the duration, and see your contribution come to life instantly.
              </p>
            </div>
            <div className="mt-6 flex flex-col items-center gap-3">
              <Button asChild variant="sunshine" size="sm" className="min-w-[200px]">
                <Link to="/animal-info">Explore Wild Animals</Link>
              </Button>
              <p className="text-sm text-white/90 max-w-xl text-center">
                For detailed profiles of each species (habitat, diet, and conservation notes), visit the
                {' '}
                <Link to="/animal-info" className="underline font-semibold">
                  Wild Animal Info
                </Link>
                {' '}page.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="pb-12">
        <div className="container">
          <div className="grid gap-10">
            <aside className="rounded-3xl border border-accent-yellow/40 bg-accent-yellow px-6 py-8 text-forest-green shadow-lg">
              <h2 className="text-xl font-black uppercase tracking-[0.25em] text-forest-green/80">How to Adopt</h2>
              <ul className="mt-5 space-y-3 text-sm font-semibold text-forest-green/90">
                <li className="rounded-2xl bg-white/70 px-4 py-3 shadow">Select the animal you want to adopt from the tariff below.</li>
                <li className="rounded-2xl bg-white/70 px-4 py-3 shadow">Set the duration and click "Adopt" to move to the contribution form.</li>
                <li className="rounded-2xl bg-white/70 px-4 py-3 shadow">Use the footer to proceed to payment once items are added.</li>
              </ul>
            </aside>
          </div>
        </div>
      </section>

      <section className="pb-24">
        <div className="container space-y-6">
          <div className="flex flex-col gap-4 rounded-3xl border border-forest-green/15 bg-white/95 p-6 shadow-xl backdrop-blur md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.4em] text-forest-green/60">Live Adoption Tariff</p>
              <h2 className="text-2xl font-black text-forest-green">Understand Costs Before You Commit</h2>
              <p className="mt-1 text-sm text-forest-green/70">
                Use the per-row calculator to set quantity and duration. Totals refresh instantly.
              </p>
            </div>
          </div>

          <div className="overflow-x-auto rounded-3xl border border-forest-green/15 bg-white/95 shadow-xl">
            <div className="min-w-[720px]">
              <div className="grid grid-cols-[1.1fr_1.5fr_1fr_0.9fr_1.7fr_1.2fr_1fr] gap-3 bg-forest-green px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.35em] text-white md:text-xs">
                <span>Category</span>
                <span>Wild Animal</span>
                <span className="text-center">Daily Rate</span>
                <span className="text-center">Quantity</span>
                <span className="text-center">Duration (D / M / Y)</span>
                <span className="text-center">Total Amount</span>
                <span className="text-center">Action</span>
              </div>
              <div className="divide-y divide-forest-green/10">
                {catalogEntries.map((entry) => {
                  const current = getRowState(entry.key)
                  const rowTotal = computeRowTotal(entry.key, entry.pricePerDay)
                  const formattedRowTotal = formatCurrency(rowTotal)
                  const errors = rowErrors[entry.key] || {}
                  const totalDays = current.days + current.months * 30 + current.years * 365
                  const quantityError = errors.quantity || (current.quantity < 1 ? 'Quantity must be at least 1.' : undefined)
                  const durationError = errors.duration || (totalDays <= 0 ? 'Set at least one day, month, or year.' : undefined)

                  const quantityDisabled = current.mode === 'CONFIRMED'
                  const durationDisabled = current.mode === 'CONFIRMED' || current.quantity === 0

                  const isValid = current.quantity >= 1 && totalDays > 0
                  const buttonLabel = current.mode === 'IDLE' ? 'Adopt' : current.mode === 'EDITING' ? 'Update' : 'Edit'

                  // Single-button state machine: IDLE (Adopt) -> CONFIRMED (Edit) -> EDITING (Update/Cancel)
                  const handlePrimaryClick = () => {
                    if (current.mode === 'IDLE') {
                      confirmRow(entry)
                    } else if (current.mode === 'CONFIRMED') {
                      enterEditMode(entry.key)
                    } else {
                      confirmRow(entry)
                    }
                  }

                  return (
                    <div
                      key={entry.key}
                      className="grid grid-cols-[1.1fr_1.5fr_1fr_0.9fr_1.7fr_1.2fr_1fr] items-center gap-3 px-4 py-4 text-sm text-forest-green"
                    >
                      <span className="font-semibold">{entry.category}</span>
                      <span className="font-semibold text-forest-green/80">{entry.name}</span>
                      <span className="text-center font-bold text-forest-green">
                        ₹ <span className="daily-rate">{entry.pricePerDay}</span>
                      </span>
                      <div className="flex flex-col items-center gap-1">
                        <input
                          type="number"
                          className={`qty-input h-10 w-16 rounded-xl border border-forest-green/25 bg-white text-center text-sm font-semibold text-forest-green focus:border-forest-green focus:outline-none focus:ring-2 focus:ring-forest-green/30 ${quantityDisabled ? 'cursor-not-allowed opacity-60' : ''}`}
                          min={0}
                          value={current.quantity === 0 ? '' : current.quantity}
                          onChange={handleRowInputChange(entry.key, 'quantity', 0)}
                          onWheel={(e) => e.currentTarget.blur()}
                          disabled={quantityDisabled}
                        />
                        {quantityError && <span className="text-[11px] font-semibold text-red-600">{quantityError}</span>}
                      </div>
                      <div className="flex flex-col items-center gap-1">
                        <div className="flex items-center justify-center gap-2">
                          <input
                            type="number"
                            className={`day-input h-10 w-14 rounded-lg border border-forest-green/20 bg-soft-bg text-center text-xs font-semibold text-forest-green placeholder:text-forest-green/40 focus:border-forest-green focus:outline-none focus:ring-2 focus:ring-forest-green/30 ${durationDisabled ? 'cursor-not-allowed opacity-60' : ''}`}
                            min={0}
                            placeholder="D"
                            value={current.days === 0 ? '' : current.days}
                            onChange={handleRowInputChange(entry.key, 'days', 0)}
                            onWheel={(e) => e.currentTarget.blur()}
                            disabled={durationDisabled}
                          />
                          <input
                            type="number"
                            className={`month-input h-10 w-14 rounded-lg border border-forest-green/20 bg-soft-bg text-center text-xs font-semibold text-forest-green placeholder:text-forest-green/40 focus:border-forest-green focus:outline-none focus:ring-2 focus:ring-forest-green/30 ${durationDisabled ? 'cursor-not-allowed opacity-60' : ''}`}
                            min={0}
                            placeholder="M"
                            value={current.months === 0 ? '' : current.months}
                            onChange={handleRowInputChange(entry.key, 'months', 0)}
                            onWheel={(e) => e.currentTarget.blur()}
                            disabled={durationDisabled}
                          />
                          <input
                            type="number"
                            className={`year-input h-10 w-14 rounded-lg border border-forest-green/20 bg-soft-bg text-center text-xs font-semibold text-forest-green placeholder:text-forest-green/40 focus:border-forest-green focus:outline-none focus:ring-2 focus:ring-forest-green/30 ${durationDisabled ? 'cursor-not-allowed opacity-60' : ''}`}
                            min={0}
                            placeholder="Y"
                            value={current.years === 0 ? '' : current.years}
                            onChange={handleRowInputChange(entry.key, 'years', 0)}
                            onWheel={(e) => e.currentTarget.blur()}
                            disabled={durationDisabled}
                          />
                        </div>
                        {durationError && <span className="text-[11px] font-semibold text-red-600">{durationError}</span>}
                      </div>
                      <p className="row-total text-center text-base font-bold text-forest-green">₹ {formattedRowTotal}</p>
                      <div className="flex items-center justify-center gap-2">
                        <button
                          type="button"
                          className="adopt-btn rounded-full bg-[#FFD700] px-4 py-2 text-xs font-black uppercase tracking-[0.3em] text-[#1F5135] shadow transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-70"
                          onClick={handlePrimaryClick}
                          disabled={!isValid && current.mode !== 'CONFIRMED'}
                        >
                          {buttonLabel}
                        </button>
                        {current.mode === 'EDITING' && (
                          <button
                            type="button"
                            className="text-xs font-semibold uppercase tracking-[0.2em] text-forest-green underline"
                            onClick={() => cancelEdit(entry.key)}
                          >
                            Cancel
                          </button>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </div>
      </section>

      <footer className="fixed inset-x-0 bottom-0 z-50 border-t border-forest-green/15 bg-white px-4 py-4 text-forest-green shadow-lg">
        <div className="mx-auto flex w-full max-w-[1200px] flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.4em] text-forest-green/70">Grand Total</p>
            <p id="grand-total-display" className="text-3xl font-bold">{grandTotalDisplay}</p>
            <p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.4em] text-forest-green/60">
              Every rupee helps us care for the wild animals.
            </p>
          </div>
          <Button
            type="button"
            variant="sunshine"
            size="lg"
            className="w-full text-[#1F5135] sm:w-auto"
            disabled={cartTotal <= 0}
            onClick={handleProceed}
          >
            Proceed to Pay
          </Button>
        </div>
      </footer>

      {toast && (
        <div className="fixed left-1/2 bottom-24 z-50 -translate-x-1/2 rounded-lg bg-forest-green/95 px-4 py-3 text-white shadow-lg">
          {toast}
        </div>
      )}
    </div>
  )
}
