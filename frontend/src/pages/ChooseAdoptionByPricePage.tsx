import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'

import aboutParkImage from '@/assets/images/heroslide1.webp'
import { Button } from '@/components/ui/Button'

type TierAnimal = {
  name: string
}

type TierDefinition = {
  pricePerDay: number
  animals: TierAnimal[]
}

const adoptionPriceTiers: TierDefinition[] = [
  {
    pricePerDay: 100,
    animals: [
      { name: 'Star Tortoise' },
      { name: 'Indian Black Turtle' },
      { name: 'Cockatiel' },
    ],
  },
  {
    pricePerDay: 200,
    animals: [
      { name: 'Rose-ringed Parrot' },
      { name: 'Grey Partridge' },
      { name: 'Monitor Lizard' },
    ],
  },
  {
    pricePerDay: 300,
    animals: [
      { name: 'Indian Peafowl' },
      { name: 'Bonnet Macaque' },
      { name: 'Common Langur' },
    ],
  },
  {
    pricePerDay: 500,
    animals: [
      { name: 'Spotted Deer' },
      { name: 'Bengal Fox' },
      { name: 'Indian Python' },
    ],
  },
  {
    pricePerDay: 800,
    animals: [
      { name: 'Sambar Deer' },
      { name: 'Grey Pelican' },
      { name: 'Jackal' },
    ],
  },
  {
    pricePerDay: 1000,
    animals: [
      { name: 'Mugger Crocodile' },
      { name: 'Leopard (Placeholder)' },
      { name: 'Royal Bengal Tiger (Placeholder)' },
    ],
  },
]

type AdoptionRowState = {
  days: string
  months: string
  years: string
  committedTotal: number
  isDirty: boolean
}

const formatCurrency = (value: number): string =>
  value.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 })

export function ChooseAdoptionByPricePage() {
  useEffect(() => {
    document.body.classList.add('no-floating-buttons')
    return () => {
      document.body.classList.remove('no-floating-buttons')
    }
  }, [])

  const initialRows = useMemo(() => {
    const initialState: Record<string, AdoptionRowState> = {}
    adoptionPriceTiers.forEach((tier) => {
      tier.animals.forEach((animal) => {
        const key = `${tier.pricePerDay}-${animal.name}`
        initialState[key] = {
          days: '',
          months: '',
          years: '',
          committedTotal: 0,
          isDirty: true,
        }
      })
    })
    return initialState
  }, [])

  const [rows, setRows] = useState(initialRows)

  const grandTotal = useMemo(
    () =>
      Object.values(rows).reduce((sum, row) => sum + row.committedTotal, 0),
    [rows],
  )

  const grandTotalDisplay = `₹ ${formatCurrency(grandTotal)}`

  const handleNumericChange = (key: string, field: keyof Omit<AdoptionRowState, 'committedTotal' | 'isDirty'>) =>
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const rawValue = event.target.value
      const trimmed = rawValue.trim()
      const nextValue = trimmed === '' ? '' : Math.max(0, Number.parseInt(trimmed, 10) || 0).toString()
      setRows((prev) => {
        const current = prev[key]
        if (!current) {
          return prev
        }
        return {
          ...prev,
          [key]: {
            ...current,
            [field]: nextValue,
            isDirty: true,
          },
        }
      })
    }

  const handleAdd = (key: string, pricePerDay: number) => () => {
    setRows((prev) => {
      const current = prev[key]
      if (!current) {
        return prev
      }

      const parseSegment = (value: string) => {
        if (value === '') {
          return 0
        }
        const parsed = Number.parseInt(value, 10)
        return Number.isNaN(parsed) ? 0 : Math.max(0, parsed)
      }

      const days = parseSegment(current.days)
      const months = parseSegment(current.months)
      const years = parseSegment(current.years)
      const totalDays = days + months * 30 + years * 365
      const committedTotal = totalDays * pricePerDay

      return {
        ...prev,
        [key]: {
          days: days > 0 ? days.toString() : '',
          months: months > 0 ? months.toString() : '',
          years: years > 0 ? years.toString() : '',
          committedTotal,
          isDirty: false,
        },
      }
    })
  }

  const handleProceed = () => {
    if (grandTotal <= 0) {
      return
    }
    window.location.href = '/payment.html'
  }

  return (
    <div className="page-enter space-y-16 bg-soft-bg pb-32">
      <section className="relative isolate overflow-hidden">
        <div className="absolute inset-0">
          <img
            src={aboutParkImage}
            alt="Leafy canopy welcoming visitors"
            className="h-full w-full object-cover opacity-35"
            loading="eager"
            decoding="async"
            fetchPriority="high"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-forest-green/40 via-forest-green/15 to-soft-bg/80" />
        </div>
        <div className="relative z-10">
          <div className="container py-16">
            <div className="mx-auto max-w-3xl space-y-4 text-center text-white">
              <h1 className="inline-flex items-center justify-center rounded-[26px] bg-[#8B5E3C] px-6 py-3 text-lg font-black uppercase tracking-[0.28em] text-[#FCE7C8] shadow-[0_16px_32px_rgba(77,52,28,0.35)]">
                Choose Your Animal for Adoption
              </h1>
              <p className="text-base font-medium text-white/85 md:text-lg">
                Pick a price tier that matches your conservation commitment.
              </p>
            </div>
            <div className="mt-6 flex justify-center">
              <Button asChild variant="sunshine" size="sm" className="min-w-[200px]">
                <Link to="/adoption/choose">Choose by Animal</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      <section className="pb-12">
        <div className="container space-y-10">
          {adoptionPriceTiers.map((tier) => (
            <section
              key={tier.pricePerDay}
              className="space-y-4 rounded-3xl border border-forest-green/15 bg-white/95 p-6 shadow-xl backdrop-blur"
            >
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <h2 className="text-2xl font-bold text-forest-green md:text-3xl">
                  Rs. {tier.pricePerDay} / Day
                </h2>
                <p className="text-sm font-semibold uppercase tracking-[0.3em] text-forest-green/60">
                  Flat daily rate across all wild animals in this tier
                </p>
              </div>

              <div className="hidden md:block">
                <div className="w-full overflow-x-auto pb-4">
                  <div className="min-w-[700px] rounded-2xl border border-forest-green/10">
                    <div className="grid grid-cols-[1.6fr_repeat(3,0.6fr)_0.9fr] items-center gap-3 bg-forest-green px-4 py-3 text-xs font-semibold uppercase tracking-[0.25em] text-white">
                      <span>English Name</span>
                      <span className="text-center">Days</span>
                      <span className="text-center">Months</span>
                      <span className="text-center">Year</span>
                      <span className="text-center">Action</span>
                    </div>
                    <div className="divide-y divide-forest-green/10">
                      {tier.animals.map((animal) => {
                        const key = `${tier.pricePerDay}-${animal.name}`
                        const state = rows[key]
                        return (
                          <div
                            key={animal.name}
                            className="grid grid-cols-[1.6fr_repeat(3,0.6fr)_0.9fr] items-center gap-3 bg-white px-4 py-4 text-sm text-forest-green/90"
                          >
                            <div className="font-semibold">{animal.name}</div>
                            <div className="flex justify-center">
                              <input
                                type="number"
                                min={0}
                                placeholder="0"
                                value={state?.days ?? ''}
                                onChange={handleNumericChange(key, 'days')}
                                onWheel={(e) => e.currentTarget.blur()}
                                className="h-10 w-14 rounded-lg border border-forest-green/20 bg-soft-bg px-2 text-center text-sm font-semibold text-forest-green focus:border-forest-green focus:outline-none focus:ring-2 focus:ring-forest-green/30"
                              />
                            </div>
                            <div className="flex justify-center">
                              <input
                                type="number"
                                min={0}
                                placeholder="0"
                                value={state?.months ?? ''}
                                onChange={handleNumericChange(key, 'months')}
                                onWheel={(e) => e.currentTarget.blur()}
                                className="h-10 w-14 rounded-lg border border-forest-green/20 bg-soft-bg px-2 text-center text-sm font-semibold text-forest-green focus:border-forest-green focus:outline-none focus:ring-2 focus:ring-forest-green/30"
                              />
                            </div>
                            <div className="flex justify-center">
                              <input
                                type="number"
                                min={0}
                                placeholder="0"
                                value={state?.years ?? ''}
                                onChange={handleNumericChange(key, 'years')}
                                onWheel={(e) => e.currentTarget.blur()}
                                className="h-10 w-14 rounded-lg border border-forest-green/20 bg-soft-bg px-2 text-center text-sm font-semibold text-forest-green focus:border-forest-green focus:outline-none focus:ring-2 focus:ring-forest-green/30"
                              />
                            </div>
                            <div className="flex justify-center">
                              <Button
                                type="button"
                                variant="default"
                                size="sm"
                                className="px-5"
                                onClick={handleAdd(key, tier.pricePerDay)}
                              >
                                {state?.isDirty ? 'Add' : 'Update ✓'}
                              </Button>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-4 md:hidden">
                {tier.animals.map((animal) => {
                  const key = `${tier.pricePerDay}-${animal.name}`
                  const state = rows[key]
                  return (
                    <div
                      key={animal.name}
                      className="space-y-3 rounded-2xl border border-forest-green/10 bg-white p-4 text-sm text-forest-green/90 shadow-sm"
                    >
                      <div className="flex items-start justify-between">
                        <span className="text-base font-semibold">{animal.name}</span>
                      </div>
                      <div className="grid grid-cols-3 gap-3">
                        <label className="space-y-1 text-center">
                          <span className="text-[11px] font-semibold uppercase tracking-[0.3em] text-forest-green/60">Days</span>
                          <input
                            type="number"
                            min={0}
                            placeholder="0"
                            value={state?.days ?? ''}
                            onChange={handleNumericChange(key, 'days')}
                            onWheel={(e) => e.currentTarget.blur()}
                            className="h-10 w-full rounded-lg border border-forest-green/20 bg-soft-bg px-2 text-center text-sm font-semibold text-forest-green focus:border-forest-green focus:outline-none focus:ring-2 focus:ring-forest-green/30"
                          />
                        </label>
                        <label className="space-y-1 text-center">
                          <span className="text-[11px] font-semibold uppercase tracking-[0.3em] text-forest-green/60">Months</span>
                          <input
                            type="number"
                            min={0}
                            placeholder="0"
                            value={state?.months ?? ''}
                            onChange={handleNumericChange(key, 'months')}
                            onWheel={(e) => e.currentTarget.blur()}
                            className="h-10 w-full rounded-lg border border-forest-green/20 bg-soft-bg px-2 text-center text-sm font-semibold text-forest-green focus:border-forest-green focus:outline-none focus:ring-2 focus:ring-forest-green/30"
                          />
                        </label>
                        <label className="space-y-1 text-center">
                          <span className="text-[11px] font-semibold uppercase tracking-[0.3em] text-forest-green/60">Year</span>
                          <input
                            type="number"
                            min={0}
                            placeholder="0"
                            value={state?.years ?? ''}
                            onChange={handleNumericChange(key, 'years')}
                            onWheel={(e) => e.currentTarget.blur()}
                            className="h-10 w-full rounded-lg border border-forest-green/20 bg-soft-bg px-2 text-center text-sm font-semibold text-forest-green focus:border-forest-green focus:outline-none focus:ring-2 focus:ring-forest-green/30"
                          />
                        </label>
                      </div>
                      <Button
                        type="button"
                        variant="default"
                        size="sm"
                        className="w-full"
                        onClick={handleAdd(key, tier.pricePerDay)}
                      >
                        {state?.isDirty ? 'Add' : 'Update ✓'}
                      </Button>
                    </div>
                  )
                })}
              </div>
            </section>
          ))}
        </div>
      </section>

      <footer className="fixed inset-x-0 bottom-0 z-50 border-t border-forest-green/15 bg-white px-4 py-4 text-forest-green shadow-lg">
        <div className="mx-auto flex w-full max-w-[1200px] flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.4em] text-forest-green/70">Total</p>
            <p className="text-3xl font-bold">{grandTotalDisplay}</p>
            <p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.4em] text-forest-green/60">
              Your adoption keeps our residents thriving.
            </p>
          </div>
          <Button
            type="button"
            variant="sunshine"
            size="lg"
            className="w-full text-[#1F5135] sm:w-auto"
            disabled={grandTotal <= 0}
            onClick={handleProceed}
          >
            Proceed to Pay
          </Button>
        </div>
      </footer>
    </div>
  )
}
