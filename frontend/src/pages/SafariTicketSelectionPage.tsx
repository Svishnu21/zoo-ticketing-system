import { useCallback, useMemo, useState } from 'react'
import { ArrowLeft, Binoculars, Minus, Plus, Users } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

import { CartOverlay, type CartOverlayItem } from '@/components/booking/CartOverlay'
import { CheckoutConfirmationModal } from '@/components/booking/CheckoutConfirmationModal'
import { ClearCartDialog } from '@/components/booking/ClearCartDialog'
import { Button } from '@/components/ui/Button'
import { tariffItems, type LocalizedText } from '@/data/content'
import { useLanguage } from '@/providers/LanguageProvider'

interface SafariTicketOption {
  id: string
  label: LocalizedText
  description: LocalizedText
  price: number
}

const getTariffPrice = (id: string): number => {
  const match = tariffItems.find((item) => item.id === id)
  return match?.price ?? 0
}

const safariTicketOptions: SafariTicketOption[] = [
  {
    id: 'batteryAdult',
    label: {
      en: 'Adult Safari Seat',
      ta: 'பெரியவர் சஃபாரி இருக்கை',
    },
    description: {
      en: 'Battery vehicle ride with guide · 45 minutes',
      ta: 'வழிகாட்டியுடன் மின்சார சஃபாரி · 45 நிமிடங்கள்',
    },
    price: getTariffPrice('batteryAdult'),
  },
  {
    id: 'batteryChild',
    label: {
      en: 'Child Safari Seat',
      ta: 'குழந்தை சஃபாரி இருக்கை',
    },
    description: {
      en: 'Children aged 5 – 12 years · Must be accompanied by adult',
      ta: '5 – 12 வயது குழந்தைகள் · பெரியவர் உடன் வர வேண்டும்',
    },
    price: getTariffPrice('batteryChild'),
  },
]

const TOTAL_DAYS = 14

export function SafariTicketSelectionPage() {
  const { language } = useLanguage()
  const navigate = useNavigate()
  const [selectedDateIndex, setSelectedDateIndex] = useState(0)
  const [selectedSeats, setSelectedSeats] = useState<Record<string, number>>({})
  const [isCartOpen, setIsCartOpen] = useState(false)
  const [isClearDialogOpen, setIsClearDialogOpen] = useState(false)
  const [isCheckoutConfirmOpen, setIsCheckoutConfirmOpen] = useState(false)
  const totalAmount = useMemo(
    () =>
      safariTicketOptions.reduce(
        (sum, ticket) => sum + (selectedSeats[ticket.id] ?? 0) * ticket.price,
        0,
      ),
    [selectedSeats],
  )
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
        isHoliday: date.getDay() === 2,
      }
    })
  }, [language])

  const incrementSeat = useCallback((id: string) => {
    setSelectedSeats((prev) => ({ ...prev, [id]: (prev[id] ?? 0) + 1 }))
  }, [])

  const decrementSeat = useCallback((id: string) => {
    setSelectedSeats((prev) => {
      const nextCount = (prev[id] ?? 0) - 1
      if (nextCount <= 0) {
        const { [id]: _removed, ...rest } = prev
        return rest
      }
      return { ...prev, [id]: nextCount }
    })
  }, [])

  const totalItems = useMemo(
    () => Object.values(selectedSeats).reduce((sum, count) => sum + count, 0),
    [selectedSeats],
  )

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

  const cartItems: CartOverlayItem[] = useMemo(
    () =>
      safariTicketOptions.map((ticket) => ({
        id: ticket.id,
        label: `${language === 'en' ? 'Safari' : 'சஃபாரி'} (${ticket.label[language]})`,
        price: ticket.price,
        quantity: selectedSeats[ticket.id] ?? 0,
        onIncrement: () => incrementSeat(ticket.id),
        onDecrement: () => decrementSeat(ticket.id),
      })),
    [decrementSeat, incrementSeat, language, selectedSeats],
  )

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
    setSelectedSeats({})
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
        ticketTypeId: 'safari',
        totalAmount,
        formattedTotal,
        selectedDateLabel,
        selectedDateKey: dateKey,
        items: cartSummaryItems,
      },
    })
  }, [cartSummaryItems, dateOptions, formattedTotal, navigate, selectedDateIndex, selectedDateLabel, totalAmount])

  return (
    <section className="min-h-screen bg-[#F4FBF6] pb-36 pt-12">
      <div className="mx-auto w-full max-w-[1200px] space-y-12 px-4 sm:px-6 lg:px-8">
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
              {language === 'en' ? 'Safari Ticket Selection' : 'சஃபாரி டிக்கெட் தேர்வு'}
            </h1>
          </div>
        </header>

        <section className="space-y-4">
          <h2 className="text-xl font-bold text-forest-green md:text-2xl">
            {language === 'en' ? 'Reserve Your Slot' : 'உங்கள் இடத்தை முன்பதிவு செய்யுங்கள்'}
          </h2>
          <div className="overflow-x-auto">
            <div className="flex gap-3 pb-2">
              {dateOptions.map((date, index) => {
                const isSelected = index === selectedDateIndex
                const buttonClasses = `flex min-w-[88px] flex-col items-center justify-center rounded-2xl border px-5 py-3 text-center transition ${
                  date.isHoliday
                    ? isSelected
                      ? 'border-red-600 bg-red-600 text-white shadow-lg'
                      : 'border-red-300 bg-red-50 text-red-600 hover:border-red-400 hover:bg-red-100 hover:text-red-700'
                    : isSelected
                      ? 'border-transparent bg-[#FBD96B] text-[#1F1F1F] shadow-lg hover:bg-[#FCE28C]'
                      : 'border-forest-green/20 bg-white text-forest-green hover:border-forest-green/40 hover:shadow-md'
                }`
                return (
                  <button
                    key={date.key}
                    type="button"
                    onClick={() => setSelectedDateIndex(index)}
                    className={buttonClasses}
                  >
                    <span className="text-xs font-semibold tracking-[0.3em]">{date.day}</span>
                    <span className="text-2xl font-bold">{date.date}</span>
                    <span className="text-xs font-medium tracking-[0.3em]">{date.month}</span>
                    {date.isHoliday && (
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

        <section className="space-y-4">
          <h2 className="text-xl font-bold text-forest-green md:text-2xl">
            {language === 'en' ? 'Safari Passes' : 'சஃபாரி அனுமதிகள்'}
          </h2>
          <div className="space-y-4">
            {safariTicketOptions.map((ticket) => {
              const count = selectedSeats[ticket.id] ?? 0
              const Icon = ticket.id === 'batteryAdult' ? Binoculars : Users
              return (
                <article
                  key={ticket.id}
                  className="flex flex-col gap-5 rounded-3xl border border-forest-green/15 bg-white p-6 shadow-lg transition hover:shadow-2xl sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="flex items-start gap-4">
                    <span className="hidden rounded-full bg-forest-green/10 p-3 text-forest-green md:inline-flex">
                      <Icon size={24} />
                    </span>
                    <div className="space-y-1">
                      <h3 className="text-lg font-semibold text-forest-green">{ticket.label[language]}</h3>
                      <p className="text-sm text-muted-foreground">{ticket.description[language]}</p>
                      <p className="text-sm font-semibold text-forest-green">₹ {ticket.price}</p>
                    </div>
                  </div>
                  <div className="flex w-full items-center justify-between gap-3 sm:w-auto sm:justify-end">
                    {count > 0 ? (
                      <div className="flex w-full items-center justify-between gap-2 rounded-2xl border border-forest-green/30 bg-forest-green/5 px-3 py-2 text-forest-green sm:w-auto sm:justify-center">
                        <button
                          type="button"
                          onClick={() => decrementSeat(ticket.id)}
                          className="flex h-9 w-9 items-center justify-center rounded-full border border-forest-green/20 bg-white text-forest-green transition hover:bg-forest-green hover:text-white"
                          aria-label={language === 'en' ? 'Decrease seats' : 'இருப்பிடங்களை குறை'}
                        >
                          <Minus size={18} aria-hidden="true" />
                        </button>
                        <span className="w-6 text-center text-sm font-semibold">{count}</span>
                        <button
                          type="button"
                          onClick={() => incrementSeat(ticket.id)}
                          className="flex h-9 w-9 items-center justify-center rounded-full border border-forest-green/20 bg-white text-forest-green transition hover:bg-forest-green hover:text-white"
                          aria-label={language === 'en' ? 'Increase seats' : 'இருப்பிடங்களை அதிகரிக்க'}
                        >
                          <Plus size={18} aria-hidden="true" />
                        </button>
                      </div>
                    ) : (
                      <Button
                        type="button"
                        variant="hero"
                        size="sm"
                        onClick={() => incrementSeat(ticket.id)}
                        className="w-full sm:w-auto"
                      >
                        {language === 'en' ? 'Add' : 'சேர்க்கவும்'}
                      </Button>
                    )}
                  </div>
                </article>
              )
            })}
          </div>
        </section>
      </div>

      {totalAmount > 0 && (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-white/20 bg-forest-green px-4 py-4 text-white shadow-2xl">
          <div className="mx-auto flex w-full max-w-[1200px] flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.4em] text-white/70">
                {language === 'en' ? 'Current total' : 'தற்போதைய மொத்தம்'}
              </p>
              <p className="text-3xl font-bold">₹ {formattedTotal}</p>
              <p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.4em] text-white/60">
                © Kurumbapatti Zoo. All rights reserved.
              </p>
            </div>
            <Button
              variant="sunshine"
              size="lg"
              className="w-full text-[#1F5135] sm:w-auto"
              onClick={() => setIsCartOpen(true)}
            >
              {language === 'en' ? 'View Cart' : 'கூடை காண்க'}
            </Button>
          </div>
        </div>
      )}

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
    </section>
  )
}
