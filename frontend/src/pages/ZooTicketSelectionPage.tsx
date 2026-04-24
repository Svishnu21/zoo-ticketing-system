import { useCallback, useEffect, useMemo, useState } from 'react'
import { MAX_QTY_PER_ITEM } from '@/constants/limits'
import { AlertTriangle, ArrowLeft, Megaphone, X } from 'lucide-react'
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
const hiddenOnlineAddOnCategories = new Set(['transport', 'camera'])
const ticketTableGridCols = 'grid-cols-[48fr_15fr_20fr_17fr]'
const ticketTableColumnGap = 'gap-x-1 sm:gap-x-2'
const counterOnlyInfoSessionKey = 'zoo-counter-only-info-shown'

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
    label: { en: 'Child', ta: 'குழந்தை (5 முதல் 12 வயது)' },
    description: { en: 'Child (5 to 12 years)', ta: 'குழந்தை (5 முதல் 12 வயது)' },
    category: 'zoo',
    order: 2,
  },
  zoo_kid_zone: {
    label: { en: 'Kid Zone', ta: 'குழந்தைகள் விளையாட்டு பகுதி (6 வயதிற்குக் கீழ்)' },
    description: { en: 'Kids play Below 6 Years', ta: 'குழந்தைகளுக்கான விளையாட்டு மற்றும் செயல்பாட்டு பகுதி' },
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
    label: { en: 'Children', ta: '5-க்கு கீழ் குழந்தைகள்' },
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
    label: { en: 'Parking - 2 Wheeler', ta: 'நிறுத்தம் - 2 & 3 சக்கர' },
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
const DEFAULT_FREEZE_MESSAGE =
  'Online ticket booking is temporarily unavailable due to technical maintenance. Please try again later. We apologize for the inconvenience.'

type BookingDayStatus = 'open' | 'closed'

interface DateOptionBase {
  key: string
  day: string
  date: string
  month: string
  defaultIsClosed: boolean
}

interface DateOption {
  key: string
  day: string
  date: string
  month: string
  isClosed: boolean
}

const normalizeFreezeMessage = (value: unknown) => {
  if (typeof value !== 'string') return DEFAULT_FREEZE_MESSAGE
  const trimmed = value.trim()
  return trimmed || DEFAULT_FREEZE_MESSAGE
}

const formatLocalDateKey = (date: Date) => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

const parseLocalDateKey = (dateKey: string) => {
  const [year, month, day] = dateKey.split('-').map(Number)
  if ([year, month, day].every((part) => Number.isFinite(part))) {
    return new Date(year, month - 1, day)
  }
  return new Date(dateKey)
}

function FrozenBookingNotice({ language, message }: { language: 'en' | 'ta'; message: string }) {
  return (
    <section className="min-h-screen bg-[#F4FBF6] px-4 py-12 sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-[980px]">
        <div className="rounded-3xl border border-amber-300 bg-amber-50 p-6 shadow-lg md:p-8">
          <div className="flex items-start gap-4">
            <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-amber-100 text-amber-700">
              <AlertTriangle size={24} aria-hidden="true" />
            </span>
            <div className="space-y-3">
              <h1 className="text-2xl font-bold text-amber-900 md:text-3xl">
                {language === 'en' ? 'Online Booking Temporarily Unavailable' : 'ஆன்லைன் முன்பதிவு தற்காலிகமாக கிடைக்கவில்லை'}
              </h1>
              <p className="text-base leading-relaxed text-amber-900/90">{message}</p>
              <p className="text-sm font-semibold uppercase tracking-[0.22em] text-amber-800/80">
                {language === 'en' ? 'Please try again later.' : 'தயவுசெய்து பின்னர் மீண்டும் முயற்சிக்கவும்.'}
              </p>
            </div>
          </div>

          <div className="mt-6 rounded-2xl border border-amber-200 bg-white/85 px-4 py-3 text-sm font-medium text-[#1f5135]">
            {language === 'en'
              ? 'For urgent visits, tickets can be purchased at the zoo counter.'
              : 'அவசர வருகைகளுக்கு, டிக்கெட்டுகளை பூங்கா கவுண்டரில் வாங்கலாம்.'}
          </div>
        </div>
      </div>
    </section>
  )
}

export function ZooTicketSelectionPage() {
  const { language } = useLanguage()
  const [isFreezeLoading, setIsFreezeLoading] = useState(true)
  const [freezeOnlineBooking, setFreezeOnlineBooking] = useState(false)
  const [freezeMessage, setFreezeMessage] = useState(DEFAULT_FREEZE_MESSAGE)

  useEffect(() => {
    let cancelled = false

    const loadSystemSettings = async () => {
      try {
        const response = await fetch('/api/system-settings')
        const payload = await response.json().catch(() => null)
        if (!response.ok || !payload || payload?.success !== true) {
          throw new Error('Unable to load system settings.')
        }

        if (!cancelled) {
          setFreezeOnlineBooking(Boolean(payload?.data?.freezeOnlineBooking))
          setFreezeMessage(normalizeFreezeMessage(payload?.data?.freezeMessage))
        }
      } catch (_error) {
        if (!cancelled) {
          setFreezeOnlineBooking(false)
          setFreezeMessage(DEFAULT_FREEZE_MESSAGE)
        }
      } finally {
        if (!cancelled) {
          setIsFreezeLoading(false)
        }
      }
    }

    void loadSystemSettings()

    return () => {
      cancelled = true
    }
  }, [])

  if (isFreezeLoading) {
    return (
      <section className="min-h-screen bg-[#F4FBF6] px-4 py-12 sm:px-6 lg:px-8">
        <div className="mx-auto w-full max-w-[920px] rounded-3xl border border-forest-green/15 bg-white p-6 text-center text-forest-green shadow-lg">
          {language === 'en' ? 'Checking online booking availability...' : 'ஆன்லைன் முன்பதிவு நிலையை சரிபார்க்கிறது...'}
        </div>
      </section>
    )
  }

  if (freezeOnlineBooking) {
    return <FrozenBookingNotice language={language} message={freezeMessage} />
  }

  return <ZooTicketSelectionContent />
}

function ZooTicketSelectionContent() {
  const { language } = useLanguage()
  const navigate = useNavigate()
  const [showCounterOnlyNotice, setShowCounterOnlyNotice] = useState(false)
  const [counterOnlyNoticeVisible, setCounterOnlyNoticeVisible] = useState(false)
  const [selectedDateIndex, setSelectedDateIndex] = useState(0)
  const [hasUserSelectedDate, setHasUserSelectedDate] = useState(false)
  const [addOnQuantities, setAddOnQuantities] = useState<Record<string, number>>({})
  const [selectedTickets, setSelectedTickets] = useState<Record<string, number>>({})
  const [isCartOpen, setIsCartOpen] = useState(false)
  const [isClearDialogOpen, setIsClearDialogOpen] = useState(false)
  const [isCheckoutConfirmOpen, setIsCheckoutConfirmOpen] = useState(false)
  const [isClosedModalOpen, setIsClosedModalOpen] = useState(false)
  const [closedDayLabel, setClosedDayLabel] = useState('Tuesdays')
  const [closedModalContent, setClosedModalContent] = useState<{ title?: string; description?: string }>({})
  const [dayStatusMap, setDayStatusMap] = useState<Record<string, { status: BookingDayStatus; source?: string }>>({})
  const { getPrice, tariffs } = useTariffPricing()

  // Clear stale booking session state when this page mounts so a fresh
  // booking always starts cleanly (fixes BUG 2 for subsequent attempts).
  useEffect(() => {
    sessionStorage.removeItem('bookingFlowState')
    sessionStorage.removeItem('latestTxnId')
    sessionStorage.removeItem('latestBookingId')
    sessionStorage.removeItem('latestVerificationToken')
  }, [])

  useEffect(() => {
    const hasShown = window.sessionStorage.getItem(counterOnlyInfoSessionKey) === '1'
    if (hasShown) return

    window.sessionStorage.setItem(counterOnlyInfoSessionKey, '1')
    setShowCounterOnlyNotice(true)
    const frameId = window.requestAnimationFrame(() => {
      setCounterOnlyNoticeVisible(true)
    })

    return () => {
      window.cancelAnimationFrame(frameId)
    }
  }, [])

  const dismissCounterOnlyNotice = useCallback(() => {
    setShowCounterOnlyNotice(false)
    setCounterOnlyNoticeVisible(false)
  }, [])

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
    const list = resolvedTariffs.filter((t) => {
      const isZooCategory = (t.category || 'zoo').toLowerCase() === 'zoo'
      const isSchoolVisit = t.itemCode === 'zoo_school_visit'
      return isZooCategory && !isSchoolVisit
    })
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
    const list = resolvedTariffs.filter((t) => {
      const metaCategory = labelFallbacks[t.itemCode || '']?.category
      const category = (t.category || metaCategory || '').toLowerCase()
      return category !== 'zoo' && !hiddenOnlineAddOnCategories.has(category)
    })
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

  const baseDateOptions = useMemo<DateOptionBase[]>(() => {
    const today = new Date()
    return Array.from({ length: TOTAL_DAYS }, (_, offset) => {
      const date = new Date(today)
      date.setDate(today.getDate() + offset)

      const locale = language === 'ta' ? 'ta-IN' : 'en-IN'

      return {
        key: formatLocalDateKey(date),
        day: date.toLocaleDateString(locale, { weekday: 'short' }).toUpperCase(),
        date: date.getDate().toString(),
        month: date.toLocaleDateString(locale, { month: 'short' }).toUpperCase(),
        defaultIsClosed: date.getDay() === 2,
      }
    })
  }, [language])

  useEffect(() => {
    const from = baseDateOptions[0]?.key
    const to = baseDateOptions[baseDateOptions.length - 1]?.key
    if (!from || !to) return

    let cancelled = false

    const loadDayStatus = async () => {
      try {
        const response = await fetch(
          `/api/day-control/calendar?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`,
        )
        const payload = await response.json().catch(() => null)

        if (!response.ok || !payload || payload?.success !== true || !Array.isArray(payload?.data?.days)) {
          throw new Error('Unable to fetch booking day status.')
        }

        const nextStatusMap: Record<string, { status: BookingDayStatus; source?: string }> = {}
        payload.data.days.forEach((day: { date?: string; status?: string; source?: string }) => {
          if (!day?.date) return
          if (day.status !== 'open' && day.status !== 'closed') return
          nextStatusMap[day.date] = {
            status: day.status as BookingDayStatus,
            source: day.source,
          }
        })

        if (!cancelled) {
          setDayStatusMap(nextStatusMap)
        }
      } catch (_error) {
        if (!cancelled) {
          setDayStatusMap({})
        }
      }
    }

    void loadDayStatus()

    return () => {
      cancelled = true
    }
  }, [baseDateOptions])

  const dateOptions = useMemo<DateOption[]>(() => {
    return baseDateOptions.map((date) => {
      const info = dayStatusMap[date.key]
      const isClosed = info ? info.status === 'closed' : date.defaultIsClosed
      return {
        key: date.key,
        day: date.day,
        date: date.date,
        month: date.month,
        isClosed,
      }
    })
  }, [baseDateOptions, dayStatusMap])

  useEffect(() => {
    if (!dateOptions.length) return

    const firstOpenIndex = dateOptions.findIndex((day) => !day.isClosed)
    const todayKey = formatLocalDateKey(new Date())
    const todayOpenIndex = dateOptions.findIndex((day) => day.key === todayKey && !day.isClosed)
    const preferredIndex = todayOpenIndex >= 0 ? todayOpenIndex : firstOpenIndex >= 0 ? firstOpenIndex : 0

    setSelectedDateIndex((prev) => {
      if (hasUserSelectedDate) {
        if (dateOptions[prev] && !dateOptions[prev].isClosed) {
          return prev
        }
        return firstOpenIndex >= 0 ? firstOpenIndex : 0
      }

      return prev === preferredIndex ? prev : preferredIndex
    })
  }, [dateOptions, hasUserSelectedDate])

  const handleDateClick = useCallback(
    (index: number) => {
      const date = dateOptions[index]
      if (!date) return

      if (date.isClosed) {
        const info = dayStatusMap[date.key]
        if (info?.source === 'daily_cutoff') {
          setClosedModalContent({
            title: language === 'en' ? 'Online Booking Closed' : 'ஆன்லைன் முன்பதிவு முடிந்தது',
            description:
              language === 'en'
                ? 'Online booking for today has closed at 4:30 PM. Please choose another date or visit the zoo counter for tickets.'
                : 'இன்றைக்கான ஆன்லைன் முன்பதிவு மாலை 4:30 மணியுடன் முடிந்தது. தயவுசெய்து வேறொரு தேதியைத் தேர்ந்தெடுக்கவும் அல்லது கவுண்டரில் டிக்கெட் பெறவும்.',
          })
        } else {
          const dayName = parseLocalDateKey(date.key).toLocaleDateString('en-US', { weekday: 'long' })
          setClosedDayLabel(`${dayName}s`)
          setClosedModalContent({})
        }
        setIsClosedModalOpen(true)
        return
      }

      setHasUserSelectedDate(true)
      setSelectedDateIndex(index)
      setIsClosedModalOpen(false)
    },
    [dateOptions, dayStatusMap, language],
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

  const handleQuantityInputChange = useCallback(
    (groupId: string, id: string, rawValue: string) => {
      const digitsOnly = rawValue.replace(/\D/g, '')
      const parsed = digitsOnly === '' ? 0 : Number.parseInt(digitsOnly, 10)
      if (groupId === 'entry') {
        updateTicketQuantity(id, Number.isNaN(parsed) ? 0 : parsed)
      } else {
        updateAddOnQuantity(id, Number.isNaN(parsed) ? 0 : parsed)
      }
    },
    [updateAddOnQuantity, updateTicketQuantity],
  )

  const handleQuantityInputPaste = useCallback(
    (event: React.ClipboardEvent<HTMLInputElement>, groupId: string, id: string) => {
      event.preventDefault()
      const pastedText = event.clipboardData.getData('text')
      handleQuantityInputChange(groupId, id, pastedText)
    },
    [handleQuantityInputChange],
  )

  const handleQuantityInputKeyDown = useCallback((event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.ctrlKey || event.metaKey || event.altKey) return

    const allowedKeys = new Set([
      'Backspace',
      'Delete',
      'ArrowLeft',
      'ArrowRight',
      'ArrowUp',
      'ArrowDown',
      'Tab',
      'Home',
      'End',
      'Enter',
    ])

    if (allowedKeys.has(event.key)) return
    if (/^[0-9]$/.test(event.key)) return

    event.preventDefault()
  }, [])

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
    const date = parseLocalDateKey(selected.key)
    const locale = language === 'ta' ? 'ta-IN' : 'en-IN'
    return date.toLocaleDateString(locale, {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    })
  }, [dateOptions, selectedDateIndex, language])

  const closedNotice = useMemo(() => {
    const selected = dateOptions[selectedDateIndex]
    if (!selected || !selected.isClosed) return null

    const info = dayStatusMap[selected.key]
    if (info?.source === 'daily_cutoff') {
      return {
        title: language === 'en' ? 'Online Booking Closed' : 'ஆன்லைன் முன்பதிவு முடிந்தது',
        description:
          language === 'en'
            ? 'Online booking for today has closed at 4:30 PM. Please choose another date or visit the zoo counter for tickets.'
            : 'இன்றைக்கான ஆன்லைன் முன்பதிவு மாலை 4:30 மணியுடன் முடிந்தது. தயவுசெய்து வேறொரு தேதியைத் தேர்ந்தெடுக்கவும் அல்லது கவுண்டரில் டிக்கெட் பெறவும்.',
      }
    }

    const dayName = parseLocalDateKey(selected.key).toLocaleDateString(language === 'ta' ? 'ta-IN' : 'en-US', {
      weekday: 'long',
    })
    return {
      title: language === 'en' ? `Closed on ${dayName}s` : `${dayName} அன்று விடுமுறை`,
      description:
        language === 'en'
          ? 'The zoo is closed on this date. Please pick another open date to continue booking tickets.'
          : 'இந்த தேதியில் பூங்கா மூடப்பட்டுள்ளது. முன்பதிவை தொடர வேறு ஒரு திறந்த தேதியைத் தேர்ந்தெடுக்கவும்.',
    }
  }, [dateOptions, selectedDateIndex, dayStatusMap, language])

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
      {showCounterOnlyNotice && (
        <div className="pointer-events-none fixed inset-x-0 top-4 z-50 flex justify-center px-4 sm:top-6">
          <aside
            role="status"
            aria-live="polite"
            className={`pointer-events-auto w-full max-w-2xl rounded-2xl border border-amber-300/80 bg-[#FFF4CC] p-4 shadow-2xl ring-1 ring-amber-900/10 backdrop-blur transition-all duration-300 ease-out sm:p-5 ${
              counterOnlyNoticeVisible ? 'translate-y-0 opacity-100' : '-translate-y-2 opacity-0'
            }`}
          >
            <div className="flex items-start gap-3">
              <span className="mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-amber-300 bg-amber-100 text-amber-700 shadow-sm">
                <AlertTriangle size={18} aria-hidden="true" />
              </span>
              <div className="min-w-0 flex-1 space-y-2">
                <h2 className="text-base font-extrabold tracking-[0.01em] text-[#1D4D37] sm:text-lg">Important Information</h2>
                <ul className="divide-y divide-amber-300/70 text-sm leading-relaxed text-[#2F2A1F]">
                  <li className="py-2 first:pt-1 last:pb-1">
                    <span className="mr-2 text-amber-700" aria-hidden="true">•</span>
                    School group tickets must be booked at the <span className="font-bold text-[#A32121]">ticket counter</span> on the day of the visit.
                  </li>
                  <li className="py-2">
                    <span className="mr-2 text-amber-700" aria-hidden="true">•</span>
                    Battery vehicles must be booked at the <span className="font-bold text-[#A32121]">ticket counter</span> on the day of the visit.
                  </li>
                  <li className="py-2 first:pt-1 last:pb-1">
                    <span className="mr-2 text-amber-700" aria-hidden="true">•</span>
                    Video cameras for shooting must also be booked at the <span className="font-bold text-[#A32121]">ticket counter</span> on the day of the visit.
                  </li>
                </ul>
              </div>
              <button
                type="button"
                onClick={dismissCounterOnlyNotice}
                className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[#1D4D37]/80 transition hover:bg-amber-200/60 hover:text-[#1D4D37] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/40"
                aria-label={language === 'en' ? 'Close information popup' : 'தகவல் சாளரத்தை மூடவும்'}
              >
                <X size={16} />
              </button>
            </div>
            <div className="mt-3 flex justify-end sm:mt-4">
              <button
                type="button"
                onClick={dismissCounterOnlyNotice}
                className="rounded-xl bg-forest-green px-4 py-2 text-sm font-semibold text-white shadow-[0_8px_18px_rgba(18,102,62,0.25)] transition hover:-translate-y-0.5 hover:bg-[#145C3C] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-forest-green/35"
              >
                {language === 'en' ? 'Got it' : 'சரி'}
              </button>
            </div>
          </aside>
        </div>
      )}

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
            <h2 className="text-lg font-bold">{closedNotice?.title}</h2>
            <p className="text-sm text-red-800">
              {closedNotice?.description}
            </p>
          </section>
        ) : (
          <>
            <section className="space-y-4">
              <h2 className="text-xl font-bold text-forest-green md:text-2xl">
                {language === 'en' ? 'Ticket Types' : 'டிக்கெட் வகைகள்'}
              </h2>

              <div className="overflow-hidden rounded-3xl border border-forest-green/15 bg-white shadow-lg">
                <div className="w-full overflow-x-auto pb-2 pr-1 scroll-smooth [-webkit-overflow-scrolling:touch]">
                  <div className="min-w-[500px] sm:min-w-[620px]">
                    <div className="bg-forest-green px-4 py-2 text-sm font-semibold uppercase tracking-[0.25em] text-white">
                      {language === 'en' ? 'Tickets & Add-ons' : 'டிக்கெட்டுகள் மற்றும் கூடுதல்கள்'}
                    </div>

                    <div className={`grid ${ticketTableGridCols} ${ticketTableColumnGap} items-center bg-forest-green text-white`}>
                      <div className="px-2 py-2 text-left text-[11px] font-semibold uppercase tracking-[0.12em] sm:px-3 sm:py-3 sm:text-xs sm:tracking-[0.18em]">Ticket</div>
                      <div className="px-2 py-2 text-right text-[11px] font-semibold uppercase tracking-[0.12em] tabular-nums sm:px-3 sm:py-3 sm:text-xs sm:tracking-[0.18em]">Price</div>
                      <div className="px-2 py-2 text-center text-[11px] font-semibold uppercase tracking-[0.12em] sm:px-3 sm:py-3 sm:text-xs sm:tracking-[0.18em]">Quantity</div>
                      <div className="px-2 py-2 text-right text-[11px] font-semibold uppercase tracking-[0.12em] tabular-nums sm:px-3 sm:py-3 sm:text-xs sm:tracking-[0.18em]">Amount</div>
                    </div>

                    <div className="divide-y divide-forest-green/10">
                      {ticketGroups.map((group) => (
                        <div key={group.id}>
                          <div className={`grid ${ticketTableGridCols} ${ticketTableColumnGap} items-center bg-gray-50 px-2 py-1.5 text-sm font-semibold text-forest-green sm:px-3 sm:py-2`}>
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

                            return (
                              <div key={id} className={`grid ${ticketTableGridCols} ${ticketTableColumnGap} items-center px-2 py-2 text-forest-green sm:px-3 sm:py-2.5`}>
                                <div className="pr-1.5 sm:pr-2">
                                  <p className="text-[13px] font-semibold leading-tight sm:text-sm">{(item as any).label[language]}</p>
                                  {group.id === 'entry' && (
                                    <p className="text-[11px] leading-tight text-forest-green/70 sm:text-xs">{(item as any).description?.[language]}</p>
                                  )}
                                </div>
                                <div className="text-right text-[13px] font-semibold tabular-nums sm:text-sm">{formatCurrency(price)}</div>
                                <div className="flex justify-center">
                                  <input
                                    type="text"
                                    inputMode="numeric"
                                    pattern="[0-9]*"
                                    autoComplete="off"
                                    value={displayQty}
                                    onChange={(e) => handleQuantityInputChange(group.id, id, e.target.value)}
                                    onPaste={(e) => handleQuantityInputPaste(e, group.id, id)}
                                    onKeyDown={handleQuantityInputKeyDown}
                                    onWheel={(e) => e.currentTarget.blur()}
                                    className="h-8 w-14 rounded-lg border border-forest-green/30 px-1 py-1 text-center text-sm tabular-nums focus:outline-none focus:ring-2 focus:ring-forest-green/40 sm:w-16"
                                  />
                                </div>
                                <div className="text-right text-[13px] font-semibold tabular-nums sm:text-sm">{formatCurrency(lineTotal)}</div>
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
        title={closedModalContent.title}
        description={closedModalContent.description}
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
