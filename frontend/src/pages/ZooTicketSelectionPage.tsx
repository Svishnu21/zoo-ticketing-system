import { useCallback, useEffect, useMemo, useState } from 'react'
import { MAX_QTY_PER_ITEM } from '@/constants/limits'
import { ArrowLeft, Megaphone } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

import { CartOverlay, type CartOverlayItem } from '@/components/booking/CartOverlay'
import { BookingBottomBar } from '@/components/booking/BookingBottomBar'
import { CheckoutConfirmationModal } from '@/components/booking/CheckoutConfirmationModal'
import { ClearCartDialog } from '@/components/booking/ClearCartDialog'
import { ClosedDateModal } from '@/components/booking/ClosedDateModal'
import type { LocalizedText } from '@/data/content'
import { useTariffPricing } from '@/hooks/useTariffPricing'
import { useLanguage } from '@/providers/LanguageProvider'


const addOnCategoryLabels: Record<string, LocalizedText> = {
  parking: {
    en: 'Parking',
    ta: 'நிறுத்துமிடம்',
  },
  transport: {
    en: 'Transport',
    ta: 'போக்குவரத்து',
  },
  camera: {
    en: 'Camera',
    ta: 'கேமரா',
  },
}

const addOnCategoryOrder: string[] = ['parking', 'transport', 'camera']

const formatCurrency = (value: number) =>
  `₹ ${Number(value || 0).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`

const labelFallbacks: Record<
  string,
  {
    label: LocalizedText
    description?: LocalizedText
    category?: string
    order?: number
  }
> = {
  zoo_adult: {
    label: { en: 'Adult', ta: 'பெரியவர்' },
    description: { en: 'Adult (12 years and above)', ta: 'பெரியவர் (12 வயது மற்றும் அதற்கு மேல்)' },
    category: 'zoo',
    order: 1,
  },
  zoo_child: {
    label: { en: 'Child (12 years and above)', ta: 'குழந்தை (12 வயது மற்றும் மேல்)' },
    description: { en: 'Child (12 years and above)', ta: 'குழந்தை (12 வயது மற்றும் மேல்)' },
    category: 'zoo',
    order: 2,
  },
  zoo_kid_zone: {
    label: { en: 'Kid Zone (Below 6 Years)', ta: 'குழந்தைகள் விளையாட்டு பகுதி (6 வயதிற்குக் கீழ்)' },
    description: { en: 'Kids play & activity zone', ta: 'குழந்தைகளுக்கான விளையாட்டு மற்றும் செயல்பாட்டு பகுதி' },
    category: 'zoo',
    order: 3,
  },
  zoo_differently_abled: {
    label: { en: 'Differently Abled', ta: 'விதிவிலக்கானவர்கள்' },
    description: { en: 'Differently Abled (accessible entry)', ta: 'விதிவிலக்கானவர்கள் (அணுகக்கூடிய நுழைவு)' },
    category: 'zoo',
    order: 4,
  },
  zoo_child_free: {
    label: { en: 'Children (below 5)', ta: '5-க்கு கீழ் குழந்தைகள்' },
    description: { en: 'Children below 5 years', ta: '5 வயதிற்கு தாழ்ந்த குழந்தைகள்' },
    category: 'zoo',
    order: 5,
  },
  parking_4w_lmv: {
    label: { en: 'Parking - 4 Wheeler (LMV)', ta: 'நிறுத்தம் - 4 சக்கர (LMV)' },
    category: 'parking',
    order: 7,
  },
  parking_4w_hmv: {
    label: { en: 'Parking - 4 Wheeler (HMV)', ta: 'நிறுத்தம் - 4 சக்கர (HMV)' },
    category: 'parking',
    order: 8,
  },
  parking_2w_3w: {
    label: { en: 'Parking - 2 & 3 Wheeler', ta: 'நிறுத்தம் - 2 & 3 சக்கர' },
    category: 'parking',
    order: 9,
  },
  battery_vehicle_adult: {
    label: { en: 'Battery Vehicle - Adult', ta: 'மின்வாகனம் - பெரியவர்' },
    category: 'transport',
    order: 10,
  },
  battery_vehicle_child: {
    label: { en: 'Battery Vehicle - Child (5-12 yrs)', ta: 'மின்வாகனம் - குழந்தை (5-12)' },
    category: 'transport',
    order: 11,
  },
  camera_video: {
    label: { en: 'Video Camera', ta: 'வீடியோ கேமரா' },
    category: 'camera',
    order: 6,
  },
}

const TOTAL_DAYS = 14

export function ZooTicketSelectionPage() {
  const { language } = useLanguage()
  const navigate = useNavigate()
  const [selectedDateIndex, setSelectedDateIndex] = useState(0)
  const [addOnQuantities, setAddOnQuantities] = useState<Record<string, number>>({})
  const [selectedTickets, setSelectedTickets] = useState<Record<string, number>>({})
  const [isCartOpen, setIsCartOpen] = useState(false)
  const [isClearDialogOpen, setIsClearDialogOpen] = useState(false)
  const [isCheckoutConfirmOpen, setIsCheckoutConfirmOpen] = useState(false)
  const [isClosedModalOpen, setIsClosedModalOpen] = useState(false)
  const [closedDayLabel, setClosedDayLabel] = useState('Tuesdays')
  const { getPrice, tariffs } = useTariffPricing()

  const tariffOrder = useCallback(
    (entry: { itemCode?: string; displayOrder?: number }) => {
      if (Number.isFinite(entry.displayOrder) && (entry.displayOrder as number) > 0) return entry.displayOrder as number
      const fallback = labelFallbacks[entry.itemCode || '']?.order
      return Number.isFinite(fallback) ? (fallback as number) : 999
    },
    [],
  )

  const resolvedTariffs = useMemo(() => {
    const list = tariffs && tariffs.length ? tariffs : []
    return [...list].sort((a, b) => tariffOrder(a) - tariffOrder(b))
  }, [tariffs, tariffOrder])

  const zooTicketOptions = useMemo(() => {
    const list = resolvedTariffs.filter((t) => (t.category || 'zoo').toLowerCase() === 'zoo')
    const ordered = [...list].sort((a, b) => tariffOrder(a) - tariffOrder(b))
    return ordered.map((t) => {
      const meta = labelFallbacks[t.itemCode || '']
      return {
        id: t.itemCode || 'unknown',
        label: meta?.label ?? { en: t.label || t.itemCode || 'Ticket', ta: t.label || t.itemCode || 'Ticket' },
        description:
          meta?.description ??
          ({ en: t.label || t.itemCode || 'Ticket', ta: t.label || t.itemCode || 'Ticket' } as LocalizedText),
        price: getPrice(t.itemCode || ''),
      }
    })
  }, [getPrice, resolvedTariffs])

  const addOnOptions = useMemo(() => {
    const list = resolvedTariffs.filter((t) => (t.category || '').toLowerCase() !== 'zoo')
    const ordered = [...list].sort((a, b) => tariffOrder(a) - tariffOrder(b))
    return ordered.map((t) => {
      const meta = labelFallbacks[t.itemCode || '']
      const category = (t.category || meta?.category || 'other').toLowerCase()
      return {
        id: t.itemCode || 'unknown',
        label: meta?.label ?? { en: t.label || t.itemCode || 'Add-on', ta: t.label || t.itemCode || 'Add-on' },
        price: getPrice(t.itemCode || ''),
        category,
      }
    })
  }, [getPrice, resolvedTariffs, tariffOrder])
  const schoolNotice =
    language === 'en'
      ? 'School group tickets have to be booked at the ticket counter on the day of the visit.'
      : 'பள்ளி குழு டிக்கெட்டுகள் வருகை நாளில் டிக்கெட் கவுண்டரில் முன்பதிவு செய்யப்பட வேண்டும்.'
  const totalAmount = useMemo(() => {
    const ticketTotal = zooTicketOptions.reduce(
      (sum, ticket) => sum + (selectedTickets[ticket.id] ?? 0) * ticket.price,
      0,
    )
    const addOnTotal = addOnOptions.reduce(
      (sum, addOn) => sum + (addOnQuantities[addOn.id] ?? 0) * addOn.price,
      0,
    )
    return ticketTotal + addOnTotal
  }, [addOnOptions, addOnQuantities, selectedTickets, zooTicketOptions])
  const formattedTotal = useMemo(
    () => totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 }),
    [totalAmount],
  )

  const dateOptions = useMemo(() => {
    const today = new Date()
    return Array.from({ length: TOTAL_DAYS }, (_, offset) => {
      const date = new Date(today)
      date.setDate(today.getDate() + offset)

      const locale = language === 'ta' ? 'ta-IN' : 'en-IN'

      return {
        key: date.toISOString().split('T')[0],
        day: date.toLocaleDateString(locale, { weekday: 'short' }).toUpperCase(),
        date: date.getDate().toString(),
        month: date.toLocaleDateString(locale, { month: 'short' }).toUpperCase(),
        isClosed: date.getDay() === 2,
      }
    })
  }, [language])

  useEffect(() => {
    const firstOpenIndex = dateOptions.findIndex((day) => !day.isClosed)
    setSelectedDateIndex((prev) => {
      if (!dateOptions[prev] || dateOptions[prev].isClosed) {
        return firstOpenIndex >= 0 ? firstOpenIndex : 0
      }
      return prev
    })
  }, [dateOptions])

  const handleDateClick = useCallback(
    (index: number) => {
      const date = dateOptions[index]
      if (!date) return

      if (date.isClosed) {
        const dayName = new Date(date.key).toLocaleDateString('en-US', { weekday: 'long' })
        setClosedDayLabel(`${dayName}s`)
        setIsClosedModalOpen(true)
        return
      }

      setSelectedDateIndex(index)
      setIsClosedModalOpen(false)
    },
    [dateOptions],
  )

  const updateTicketQuantity = useCallback((id: string, quantity: number) => {
    let sanitized = Number.isNaN(quantity) ? 0 : Math.max(0, quantity)
    if (sanitized > MAX_QTY_PER_ITEM) {
      sanitized = MAX_QTY_PER_ITEM
      window.alert(`Maximum allowed quantity per ticket type is ${MAX_QTY_PER_ITEM}.`)
    }
    setSelectedTickets((prev) => {
      if (sanitized <= 0) {
        if (!(id in prev)) {
          return prev
        }
        const { [id]: _removed, ...rest } = prev
        return rest
      }
      if (prev[id] === sanitized) {
        return prev
      }
      return { ...prev, [id]: sanitized }
    })
  }, [])

  const incrementTicket = useCallback(
    (id: string) => {
      const current = selectedTickets[id] ?? 0
      updateTicketQuantity(id, current + 1)
    },
    [selectedTickets, updateTicketQuantity],
  )

  const decrementTicket = useCallback(
    (id: string) => {
      const current = selectedTickets[id] ?? 0
      updateTicketQuantity(id, current - 1)
    },
    [selectedTickets, updateTicketQuantity],
  )

  const updateAddOnQuantity = useCallback((id: string, quantity: number) => {
    let sanitized = Number.isNaN(quantity) ? 0 : Math.max(0, quantity)
    if (sanitized > MAX_QTY_PER_ITEM) {
      sanitized = MAX_QTY_PER_ITEM
      window.alert(`Maximum allowed quantity per ticket type is ${MAX_QTY_PER_ITEM}.`)
    }
    setAddOnQuantities((prev) => {
      if (sanitized <= 0) {
        if (!(id in prev)) {
          return prev
        }
        const { [id]: _removed, ...rest } = prev
        return rest
      }
      if (prev[id] === sanitized) {
        return prev
      }
      return { ...prev, [id]: sanitized }
    })
  }, [])

  const incrementAddOn = useCallback(
    (id: string) => {
      const current = addOnQuantities[id] ?? 0
      updateAddOnQuantity(id, current + 1)
    },
    [addOnQuantities, updateAddOnQuantity],
  )

  const decrementAddOn = useCallback(
    (id: string) => {
      const current = addOnQuantities[id] ?? 0
      updateAddOnQuantity(id, current - 1)
    },
    [addOnQuantities, updateAddOnQuantity],
  )

  const totalItems = useMemo(() => {
    const ticketCount = Object.values(selectedTickets).reduce((sum, count) => sum + count, 0)
    const addOnCount = Object.values(addOnQuantities).reduce((sum, count) => sum + count, 0)
    return ticketCount + addOnCount
  }, [selectedTickets, addOnQuantities])

  const selectedDateLabel = useMemo(() => {
    const selected = dateOptions[selectedDateIndex]
    if (!selected) {
      return ''
    }
    const date = new Date(selected.key)
    const locale = language === 'ta' ? 'ta-IN' : 'en-IN'
    return date.toLocaleDateString(locale, {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    })
  }, [dateOptions, selectedDateIndex, language])

  const cartItems: CartOverlayItem[] = useMemo(() => {
    const ticketEntries: CartOverlayItem[] = zooTicketOptions.map((ticket) => ({
      id: ticket.id,
      label: `${language === 'en' ? 'Zoo' : 'ஜூ'} (${ticket.label[language]})`,
      price: ticket.price,
      quantity: selectedTickets[ticket.id] ?? 0,
      onIncrement: () => incrementTicket(ticket.id),
      onDecrement: () => decrementTicket(ticket.id),
    }))

    const addOnEntries: CartOverlayItem[] = addOnOptions.map((addOn) => {
      const quantity = addOnQuantities[addOn.id] ?? 0
      const categoryLabel = addOnCategoryLabels[addOn.category]?.[language] ?? addOn.category
      return {
        id: addOn.id,
        label: `${categoryLabel} - ${addOn.label[language]}`,
        price: addOn.price,
        quantity,
        onIncrement: () => incrementAddOn(addOn.id),
        onDecrement: () => decrementAddOn(addOn.id),
      }
    })

    return [...ticketEntries, ...addOnEntries]
  }, [addOnOptions, addOnQuantities, decrementAddOn, decrementTicket, incrementAddOn, incrementTicket, language, selectedTickets, zooTicketOptions])

  const cartSummaryItems = useMemo(
    () =>
      cartItems
        .filter((item) => item.quantity > 0)
        .map((item) => ({
          id: item.id,
          label: item.label,
          quantity: item.quantity,
          price: item.price,
          total: item.price * item.quantity,
        })),
    [cartItems],
  )

  const handleClearCart = useCallback(() => {
    setSelectedTickets({})
    setAddOnQuantities({})
    setIsCartOpen(false)
    setIsClearDialogOpen(false)
  }, [])

  const handleCheckout = useCallback(() => {
    if (totalAmount > 0) {
      setIsCheckoutConfirmOpen(true)
    }
  }, [totalAmount])

  const handleCheckoutConfirm = useCallback(() => {
    const selected = dateOptions[selectedDateIndex]
    const dateKey = selected?.key ?? ''
    setIsCheckoutConfirmOpen(false)
    setIsCartOpen(false)
    navigate('/tickets/review', {
      state: {
        ticketTypeId: 'zoo',
        totalAmount,
        formattedTotal,
        selectedDateLabel,
        selectedDateKey: dateKey,
        items: cartSummaryItems,
      },
    })
  }, [cartSummaryItems, dateOptions, formattedTotal, navigate, selectedDateIndex, selectedDateLabel, totalAmount])

  const addOnCategories = useMemo(() => {
    const codes = Array.from(new Set(addOnOptions.map((o) => o.category)))
    const ordered = [...addOnCategoryOrder.filter((c) => codes.includes(c)), ...codes.filter((c) => !addOnCategoryOrder.includes(c))]
    return ordered
  }, [addOnOptions])

  const categoryLabelFor = useCallback(
    (cat: string) => addOnCategoryLabels[cat]?.[language] ?? cat.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
    [language],
  )

  const ticketGroups = [
    {
      id: 'entry',
      label: language === 'en' ? 'Entry Tickets' : 'நுழைவு டிக்கெட்டுகள்',
      items: zooTicketOptions,
    },
    ...addOnCategories.map((cat) => ({
      id: cat,
      label: categoryLabelFor(cat),
      items: addOnOptions.filter((o) => o.category === cat),
    })),
  ]

  return (
    <>
      <section className="min-h-screen h-auto bg-[#F4FBF6] pb-40 pt-12">
      <div className="mx-auto w-full max-w-[1200px] space-y-12 px-4 sm:px-6 lg:px-8">
        <div className="rounded-3xl border border-[#F3D491] bg-[#FFF6DA] p-5 shadow-lg">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex items-start gap-3 text-[#6E4B09]">
              <span className="flex h-12 w-12 items-center justify-center rounded-full bg-white/70 text-[#8C5B00] shadow-inner">
                <Megaphone size={24} aria-hidden="true" />
              </span>
              <p className="text-sm font-semibold leading-relaxed md:text-base">{schoolNotice}</p>
            </div>
            <span className="inline-flex shrink-0 items-center rounded-full border border-[#F3D491] bg-white px-4 py-1 text-xs font-semibold uppercase tracking-[0.3em] text-[#8C5B00]">
              {language === 'en' ? 'Counter Only' : 'கவுண்டர் மட்டும்'}
            </span>
          </div>
        </div>

        <header className="flex items-center gap-4 rounded-3xl bg-forest-green px-6 py-4 text-white shadow-lg">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-white/15 text-white transition hover:bg-white/25 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-white/40"
            aria-label={language === 'en' ? 'Go back' : 'மீண்டும் செல்ல'}
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-white/70">
              {language === 'en' ? 'Kurumbapatti Zoological Park' : 'குரும்பப்பட்டி உயிரியல் பூங்கா'}
            </p>
            <h1 className="text-2xl font-bold md:text-3xl">
              {language === 'en' ? 'Zoo Ticket Selection' : 'ஜூ டிக்கெட் தேர்வு'}
            </h1>
          </div>
        </header>

        <section className="space-y-4">
          <h2 className="text-xl font-bold text-forest-green md:text-2xl">
            {language === 'en' ? 'Choose a Date' : 'ஒரு தேதியைத் தேர்வு செய்யுங்கள்'}
          </h2>
          <div className="overflow-x-auto">
            <div className="flex gap-3 pb-2">
              {dateOptions.map((date, index) => {
                const isSelected = index === selectedDateIndex
                const isClosed = date.isClosed
                const buttonClasses = `flex min-w-[88px] flex-col items-center justify-center rounded-2xl border px-5 py-3 text-center transition ${
                  isClosed
                    ? isSelected
                      ? 'border-red-600 bg-red-600 text-white shadow-lg'
                      : 'border-red-200 bg-red-50 text-red-500 hover:border-red-300'
                    : isSelected
                      ? 'border-transparent bg-[#FBD96B] text-[#1F1F1F] shadow-lg hover:bg-[#FCE28C]'
                      : 'border-forest-green/20 bg-white text-forest-green hover:border-forest-green/40 hover:shadow-md'
                } ${isClosed ? 'cursor-not-allowed opacity-80 saturate-50' : ''}`
                return (
                  <button
                    key={date.key}
                    type="button"
                    onClick={() => handleDateClick(index)}
                    className={buttonClasses}
                  >
                    <span className="text-xs font-semibold tracking-[0.3em]">{date.day}</span>
                    <span className="text-2xl font-bold">{date.date}</span>
                    <span className="text-xs font-medium tracking-[0.3em]">{date.month}</span>
                    {isClosed && (
                      <span className="mt-1 text-[10px] font-semibold uppercase tracking-[0.3em]">
                        {language === 'en' ? 'Closed' : 'விடுமுறை'}
                      </span>
                    )}
                  </button>
                )
              })}
            </div>
          </div>
        </section>

        {dateOptions[selectedDateIndex]?.isClosed ? (
          <section className="space-y-3 rounded-3xl border border-red-200 bg-red-50 p-6 text-center text-red-700 shadow">
            <h2 className="text-lg font-bold">{language === 'en' ? 'Closed Day' : 'விடுமுறை நாள்'}</h2>
            <p className="text-sm text-red-800">
              {language === 'en'
                ? 'The zoo is closed on this date. Please pick another open date to continue booking tickets.'
                : 'இந்த தேதியில் பூங்கா மூடப்பட்டுள்ளது. முன்பதிவை தொடர வேறு ஒரு திறந்த தேதியைத் தேர்ந்தெடுக்கவும்.'}
            </p>
          </section>
        ) : (
          <>
            <section className="space-y-4">
              <h2 className="text-xl font-bold text-forest-green md:text-2xl">
                {language === 'en' ? 'Ticket Types' : 'டிக்கெட் வகைகள்'}
              </h2>

              <div className="overflow-hidden rounded-3xl border border-forest-green/15 bg-white shadow-lg">
                <div className="w-full overflow-x-auto pb-4">
                  <div className="min-w-[640px]">
                    <div className="bg-forest-green px-4 py-2 text-sm font-semibold uppercase tracking-[0.25em] text-white">
                      {language === 'en' ? 'Tickets & Add-ons' : 'டிக்கெட்டுகள் மற்றும் கூடுதல்கள்'}
                    </div>

                    <div className="grid grid-cols-4 items-center bg-forest-green text-white">
                      <div className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.2em]">Ticket</div>
                      <div className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.2em]">Price</div>
                      <div className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-[0.2em]">Quantity</div>
                      <div className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-[0.2em]">Amount</div>
                    </div>

                    <div className="divide-y divide-forest-green/10">
                      {ticketGroups.map((group) => (
                        <div key={group.id}>
                          <div className="grid grid-cols-4 items-center px-4 py-2 bg-gray-50 text-sm font-semibold text-forest-green">
                            <div className="col-span-1 text-left">{group.label}</div>
                            <div />
                            <div />
                            <div />
                          </div>

                          {group.items.map((item) => {
                            const id = item.id
                            const quantity = group.id === 'entry' ? selectedTickets[id] ?? 0 : addOnQuantities[id] ?? 0
                            const displayQty = quantity > 0 ? quantity : ''
                            const price = (item as any).price ?? 0
                            const lineTotal = quantity * price

                            const onChange = (e: React.ChangeEvent<HTMLInputElement>) => {
                              const raw = e.target.value
                              const parsed = raw === '' ? 0 : Number(raw)
                              if (group.id === 'entry') {
                                updateTicketQuantity(id, Number.isNaN(parsed) ? 0 : parsed)
                              } else {
                                updateAddOnQuantity(id, Number.isNaN(parsed) ? 0 : parsed)
                              }
                            }

                            return (
                              <div key={id} className="grid grid-cols-4 items-center px-4 py-3 text-sm text-forest-green">
                                <div className="pr-3">
                                  <p className="font-semibold">{(item as any).label[language]}</p>
                                  {group.id === 'entry' && (
                                    <p className="text-xs text-forest-green/70">{(item as any).description?.[language]}</p>
                                  )}
                                </div>
                                <div className="font-semibold">{formatCurrency(price)}</div>
                                <div className="flex justify-center">
                                  <input
                                    type="number"
                                    min={0}
                                    inputMode="numeric"
                                    value={displayQty}
                                    onChange={onChange}
                                    onWheel={(e) => e.currentTarget.blur()}
                                    className="w-24 rounded-lg border border-forest-green/30 px-2 py-1 text-center text-sm focus:outline-none focus:ring-2 focus:ring-forest-green/40"
                                  />
                                </div>
                                <div className="text-right font-semibold">{formatCurrency(lineTotal)}</div>
                              </div>
                            )
                          })}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </section>
          </>
        )}
      </div>

      <CartOverlay
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        totalItems={totalItems}
        items={cartItems}
        totalAmount={totalAmount}
        formattedTotal={formattedTotal}
        onCheckout={handleCheckout}
        onClearRequest={() => setIsClearDialogOpen(true)}
      />

      <ClearCartDialog
        isOpen={isClearDialogOpen}
        onCancel={() => setIsClearDialogOpen(false)}
        onConfirm={handleClearCart}
      />

      <CheckoutConfirmationModal
        isOpen={isCheckoutConfirmOpen}
        selectedDateLabel={selectedDateLabel}
        onCancel={() => setIsCheckoutConfirmOpen(false)}
        onConfirm={handleCheckoutConfirm}
      />

      <ClosedDateModal
        isOpen={isClosedModalOpen}
        onClose={() => setIsClosedModalOpen(false)}
        closedDay={closedDayLabel}
      />
    </section>

    <BookingBottomBar
      totalAmount={totalAmount}
      formattedTotal={formattedTotal}
      onCheckout={handleCheckout}
      disabled={totalAmount <= 0}
      checkoutLabel={language === 'en' ? 'Proceed to Payment' : 'கட்டணத்திற்கு செல்லவும்'}
    />
    </>
  )
}
