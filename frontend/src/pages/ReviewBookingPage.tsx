import { useEffect, useMemo, useRef, useState } from 'react'
import type { FormEvent, KeyboardEvent } from 'react'
import { ArrowLeft, CalendarDays, ReceiptIndianRupee, Ticket } from 'lucide-react'
import { useLocation, useNavigate } from 'react-router-dom'

import { Button } from '@/components/ui/Button'
import { useLanguage } from '@/providers/LanguageProvider'

interface ReviewBookingStateItem {
  id: string
  label: string
  quantity: number
  price: number
  total: number
}

interface ReviewBookingState {
  ticketTypeId: 'zoo' | 'parking' | 'safari'
  totalAmount: number
  formattedTotal?: string
  selectedDateLabel?: string
  selectedDateKey?: string
  items?: ReviewBookingStateItem[]
}

const ticketTypeLabels: Record<ReviewBookingState['ticketTypeId'], { en: string; ta: string }> = {
  zoo: { en: 'Zoo', ta: 'ஜூ' },
  parking: { en: 'Parking', ta: 'நிறுத்துமிடம்' },
  safari: { en: 'Safari', ta: 'சஃபாரி' },
}

const apiBase = '' // Use relative paths; Vite proxy handles backend routing in dev
const defaultPaymentMode = import.meta.env.VITE_DEFAULT_PAYMENT_MODE ?? 'online'

export function ReviewBookingPage() {
  const { language } = useLanguage()
  const navigate = useNavigate()
  const location = useLocation()
  const state = (location.state ?? {}) as ReviewBookingState

  const ticketTypeId = state.ticketTypeId ?? 'zoo'
  const totalAmount = state.totalAmount ?? 0
  const formattedTotal =
    state.formattedTotal ?? totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 })
  const ticketTypeLabel = ticketTypeLabels[ticketTypeId]?.[language] ?? ticketTypeLabels.zoo[language]

  const bookingDateLabel = useMemo(() => {
    if (state.selectedDateLabel) {
      return state.selectedDateLabel
    }
    if (state.selectedDateKey) {
      const date = new Date(state.selectedDateKey)
      if (!Number.isNaN(date.getTime())) {
        const locale = language === 'ta' ? 'ta-IN' : 'en-IN'
        return date.toLocaleDateString(locale, {
          weekday: 'long',
          day: 'numeric',
          month: 'long',
          year: 'numeric',
        })
      }
    }
    return language === 'en' ? 'Not selected' : 'தேர்வு செய்யப்படவில்லை'
  }, [language, state.selectedDateKey, state.selectedDateLabel])

  const summaryItems = state.items ?? []
  const [visitorName, setVisitorName] = useState('')
  const [visitorEmail, setVisitorEmail] = useState('')
  const [visitorMobile, setVisitorMobile] = useState('')
  const [submissionStatus, setSubmissionStatus] = useState<'idle' | 'info' | 'verifying' | 'success' | 'error'>('idle')
  const [submissionMessage, setSubmissionMessage] = useState('')
  const [isOtpVisible, setIsOtpVisible] = useState(false)
  const [otpValues, setOtpValues] = useState(['', '', '', ''])
  const [timeLeft, setTimeLeft] = useState(0)
  const [isGenerateDisabled, setIsGenerateDisabled] = useState(false)
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false)
  const [isSubmittingBooking, setIsSubmittingBooking] = useState(false)
  const [isConfirmationOpen, setIsConfirmationOpen] = useState(false)
  const [hasAcceptedTerms, setHasAcceptedTerms] = useState(false)
  const [isTermsModalOpen, setIsTermsModalOpen] = useState(false)
  const otpRefs = useRef<Array<HTMLInputElement | null>>([])
  const defaultOtp = import.meta.env.VITE_DEFAULT_OTP ?? '0000'

  const formattedTimeLeft = useMemo(() => {
    const safeTime = Math.max(timeLeft, 0)
    const minutes = Math.floor(safeTime / 60)
      .toString()
      .padStart(2, '0')
    const seconds = (safeTime % 60)
      .toString()
      .padStart(2, '0')
    return `${minutes}:${seconds}`
  }, [timeLeft])

  useEffect(() => {
    if (!isOtpVisible || timeLeft <= 0) {
      return
    }

    const timerId = window.setInterval(() => {
      setTimeLeft((previous) => (previous > 0 ? previous - 1 : 0))
    }, 1000)

    return () => window.clearInterval(timerId)
  }, [isOtpVisible, timeLeft])

  useEffect(() => {
    if (!isOtpVisible || timeLeft !== 0 || !isGenerateDisabled) {
      return
    }

    setSubmissionStatus('error')
    setSubmissionMessage(
      language === 'en' ? 'OTP expired. Please generate a new code.' : 'OTP காலாவதியானது. புதிய குறியீட்டை உருவாக்கவும்.',
    )
    setIsVerifyingOtp(false)
    setIsGenerateDisabled(false)
    setIsConfirmationOpen(false)
    setHasAcceptedTerms(false)
  }, [isOtpVisible, timeLeft, isGenerateDisabled, language])

  const handleGenerateOtp = () => {
    if (!visitorName.trim() || !visitorMobile.trim()) {
      setSubmissionStatus('error')
      setSubmissionMessage(
        language === 'en'
          ? 'Please provide both your name and mobile number before continuing.'
          : 'தொடருவதற்கு முன் உங்கள் பெயர் மற்றும் கைபேசி எண்ணை நிரப்பவும்.',
      )
      return
    }
    setIsOtpVisible(true)
    setIsGenerateDisabled(true)
    setSubmissionStatus('info')
    setSubmissionMessage(
      language === 'en'
        ? 'OTP sent successfully. Please enter the 4-digit code below.'
        : 'OTP வெற்றிகரமாக அனுப்பப்பட்டது. கீழே 4 இலக்க குறியீட்டை உள்ளிடுங்கள்.',
    )
    setTimeLeft(120)
    setOtpValues(['', '', '', ''])
    setIsVerifyingOtp(false)
    setIsConfirmationOpen(false)
    setHasAcceptedTerms(false)

    window.setTimeout(() => {
      otpRefs.current[0]?.focus()
    }, 0)
  }

  const handleOtpChange = (index: number, value: string) => {
    const digit = value.replace(/\D/g, '').slice(-1)
    setOtpValues((prev) => {
      const next = [...prev]
      next[index] = digit
      return next
    })

    if (digit && index < otpRefs.current.length - 1) {
      otpRefs.current[index + 1]?.focus()
    }
  }

  const handleOtpKeyDown = (index: number, event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Backspace' && !otpValues[index] && index > 0) {
      otpRefs.current[index - 1]?.focus()
    }
  }

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!visitorName.trim() || !visitorMobile.trim()) {
      setSubmissionStatus('error')
      setSubmissionMessage(
        language === 'en'
          ? 'Please provide both your name and mobile number before continuing.'
          : 'தொடருவதற்கு முன் உங்கள் பெயர் மற்றும் கைபேசி எண்ணை நிரப்பவும்.',
      )
      return
    }

    const otpCode = otpValues.join('')

    if (!isOtpVisible) {
      setSubmissionStatus('error')
      setSubmissionMessage(
        language === 'en'
          ? 'Generate an OTP first to continue.'
          : 'தொடர முதலில் OTP உருவாக்கவும்.',
      )
      return
    }

    if (otpCode.length !== otpValues.length || otpValues.some((digit) => !digit)) {
      setSubmissionStatus('error')
      setSubmissionMessage(
        language === 'en'
          ? 'Enter the complete 4-digit OTP before submitting.'
          : 'சமர்ப்பிப்பதற்கு முன் 4 இலக்க OTP ஐ முழுமையாக உள்ளிடுங்கள்.',
      )
      return
    }
    setSubmissionStatus('verifying')
    setSubmissionMessage(
      language === 'en' ? 'Verifying OTP...' : 'OTP சரிபார்க்கப்படுகிறது...'
    )
    setIsVerifyingOtp(true)

    if (otpCode === defaultOtp) {
      setSubmissionStatus('success')
      setSubmissionMessage(
        language === 'en'
          ? 'OTP verified! Please confirm to proceed to payment.'
          : 'OTP சரிபார்க்கப்பட்டது! கட்டணத்திற்கு செல்ல உறுதிப்படுத்தவும்.',
      )
      setIsVerifyingOtp(false)
      setIsConfirmationOpen(true)
      setHasAcceptedTerms(false)
    } else {
      setSubmissionStatus('error')
      setSubmissionMessage(
        language === 'en'
          ? 'Invalid OTP, please try again.'
          : 'OTP தவறாக உள்ளது, தயவுசெய்து மீண்டும் முயற்சிக்கவும்.',
      )
      setIsVerifyingOtp(false)
      setIsConfirmationOpen(false)
      setHasAcceptedTerms(false)
    }
  }

  const handleProceedToPayment = () => {
    if (!hasAcceptedTerms || isSubmittingBooking) {
      return
    }

    const visitDate = state.selectedDateKey
    if (!visitDate) {
      setSubmissionStatus('error')
      setSubmissionMessage(
        language === 'en' ? 'Select a visit date before proceeding.' : 'தொடருவதற்கு முன் வருகை தேதியைத் தேர்ந்தெடுக்கவும்.',
      )
      return
    }

    const payload = {
      visitDate,
      paymentMode: defaultPaymentMode,
      paymentStatus: 'PAID',
      items: summaryItems.map((item) => ({
        itemCode: item.id,
        itemLabel: item.label,
        quantity: item.quantity,
      })),
      visitorName: visitorName.trim(),
      visitorEmail: visitorEmail.trim(),
      visitorMobile: visitorMobile.trim(),
    }

    setIsSubmittingBooking(true)
    setSubmissionStatus('verifying')
    setSubmissionMessage(language === 'en' ? 'Confirming your booking…' : 'உங்கள் முன்பதிவை உறுதிப்படுத்துகிறது…')

    fetch(`${apiBase}/api/bookings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
      .then(async (response) => {
        const data = await response.json().catch(() => ({}))
        if (!response.ok || data?.success !== true) {
          const message = data?.message || (language === 'en' ? 'Unable to create booking.' : 'முன்பதிவை உருவாக்க முடியவில்லை.')
          console.error('Booking failed:', message, data)
          throw new Error(message)
        }
        // Always redirect with the ticketId returned by the backend; clients must never invent or reuse IDs
        const ticketId = data?.ticketId
        if (!ticketId) {
          throw new Error(language === 'en' ? 'Ticket ID missing in response.' : 'பதில்-இல் Ticket ID இல்லை.')
        }
        // Persist the latest ticketId for any legacy flows that may need it (e.g., static payment redirect)
        sessionStorage.setItem('latestTicketId', ticketId)
        setSubmissionStatus('success')
        setSubmissionMessage(language === 'en' ? 'Booking confirmed.' : 'முன்பதிவு உறுதிப்படுத்தப்பட்டது.')
        setIsConfirmationOpen(false)
        window.location.href = `/success.html?ticketId=${encodeURIComponent(ticketId)}`
      })
      .catch((error: unknown) => {
        const message = error instanceof Error ? error.message : language === 'en' ? 'Booking failed.' : 'முன்பதிவு தோல்வியடைந்தது.'
        setSubmissionStatus('error')
        setSubmissionMessage(message)
      })
      .finally(() => {
        setIsSubmittingBooking(false)
        setIsVerifyingOtp(false)
      })
  }

  return (
    <section className="min-h-screen bg-[#F4FBF6] pb-40">
      <header className="flex items-center justify-between gap-4 border-b border-forest-green/10 bg-forest-green px-6 py-5 text-white shadow-lg">
        <div className="flex items-center gap-3">
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
            <h1 className="text-2xl font-bold md:text-3xl">{language === 'en' ? 'Review Booking' : 'முன்பதிவை பரிசீலிக்கவும்'}</h1>
          </div>
        </div>
      </header>

      <div className="mx-auto w-full max-w-[1000px] space-y-10 px-4 py-12 sm:px-6 lg:px-8">
        <section className="rounded-3xl border border-forest-green/15 bg-white p-6 shadow-lg">
          <div className="flex flex-wrap items-center gap-6">
            <div className="flex items-center gap-3 text-forest-green">
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-forest-green/10">
                <CalendarDays size={24} aria-hidden="true" />
              </span>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.3em] text-forest-green/70">
                  {language === 'en' ? 'Booking Date' : 'முன்பதிவு தேதி'}
                </p>
                <p className="text-base font-semibold text-forest-green">{bookingDateLabel}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 text-forest-green">
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-forest-green/10">
                <Ticket size={24} aria-hidden="true" />
              </span>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.3em] text-forest-green/70">
                  {language === 'en' ? 'Ticket Type' : 'டிக்கெட் வகை'}
                </p>
                <p className="text-base font-semibold text-forest-green">{ticketTypeLabel}</p>
              </div>
            </div>
          </div>

          {summaryItems.length > 0 && (
            <div className="mt-6 space-y-3">
              <h2 className="text-sm font-semibold uppercase tracking-[0.3em] text-forest-green/70">
                {language === 'en' ? 'Items' : 'பொருட்கள்'}
              </h2>
              <div className="space-y-2">
                {summaryItems.map((item) => (
                  <div
                    key={item.id}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-forest-green/10 bg-forest-green/5 px-4 py-3 text-forest-green"
                  >
                    <span className="text-sm font-semibold">{item.label}</span>
                    <span className="text-sm font-medium">
                      × {item.quantity} · ₹ {item.total.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>

        <section className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-forest-green md:text-2xl">
              {language === 'en' ? 'Visitor Details' : 'பார்வையாளர் விவரங்கள்'}
            </h2>
          </div>
          <form
            className="rounded-3xl border border-forest-green/15 bg-white p-6 shadow-lg"
            onSubmit={handleSubmit}
            noValidate
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-forest-green" htmlFor="visitor-name">
                  {language === 'en' ? 'Visitor Name*' : 'பார்வையாளர் பெயர்*'}
                </label>
                <input
                  id="visitor-name"
                  type="text"
                  placeholder={language === 'en' ? 'Enter your full name' : 'உங்கள் முழுப் பெயரை எழுதவும்'}
                  value={visitorName}
                  onChange={(event) => setVisitorName(event.target.value)}
                  className="w-full rounded-2xl border border-forest-green/20 bg-white px-4 py-3 text-sm text-foreground shadow-sm transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-forest-green/30"
                />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-semibold text-forest-green" htmlFor="visitor-phone">
                    {language === 'en' ? 'Mobile Number*' : 'கைபேசி எண்*'}
                  </label>
                  <span className="text-xs font-medium text-muted-foreground">
                    {language === 'en' ? '* OTP will be sent to this number' : '* OTP இந்த எண்ணிற்கு அனுப்பப்படும்'}
                  </span>
                </div>
                <input
                  id="visitor-phone"
                  type="tel"
                  placeholder={language === 'en' ? '10-digit mobile number' : '10 இலக்க கைபேசி எண்'}
                  value={visitorMobile}
                  onChange={(event) => setVisitorMobile(event.target.value)}
                  className="w-full rounded-2xl border border-forest-green/20 bg-white px-4 py-3 text-sm text-foreground shadow-sm transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-forest-green/30"
                />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <label className="block text-sm font-semibold text-forest-green" htmlFor="visitor-email">
                  {language === 'en' ? 'Email ID' : 'மின்னஞ்சல் ஐடி'}
                </label>
                <input
                  id="visitor-email"
                  type="email"
                  placeholder={language === 'en' ? 'example@email.com' : 'example@email.com'}
                  value={visitorEmail}
                  onChange={(event) => setVisitorEmail(event.target.value)}
                  className="w-full rounded-2xl border border-forest-green/20 bg-white px-4 py-3 text-sm text-foreground shadow-sm transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-forest-green/30"
                />
              </div>
            </div>

            {submissionMessage && (
              <p
                className={
                  submissionStatus === 'error'
                    ? 'mt-6 rounded-2xl bg-[#FFEAEA] px-4 py-3 text-sm font-semibold text-[#C62828]'
                    : 'mt-6 rounded-2xl bg-[#E8F5E9] px-4 py-3 text-sm font-semibold text-forest-green'
                }
              >
                {submissionMessage}
              </p>
            )}

            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <Button
                type="button"
                variant="hero"
                size="lg"
                className="w-full sm:w-auto"
                onClick={handleGenerateOtp}
                disabled={isGenerateDisabled}
              >
                {isGenerateDisabled
                  ? language === 'en'
                    ? 'OTP Sent'
                    : 'OTP அனுப்பப்பட்டது'
                  : language === 'en'
                    ? 'Generate OTP'
                    : 'OTP உருவாக்கவும்'}
              </Button>
            </div>

            {isOtpVisible && (
              <div className="mt-8 space-y-5">
                <div className="flex justify-center gap-3">
                  {otpValues.map((value, index) => (
                    <input
                      key={`otp-field-${index}`}
                      ref={(element) => {
                        otpRefs.current[index] = element
                      }}
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      maxLength={1}
                      value={value}
                      onChange={(event) => handleOtpChange(index, event.target.value)}
                      onKeyDown={(event) => handleOtpKeyDown(index, event)}
                      className="h-12 w-12 rounded-2xl border border-forest-green/30 bg-white text-center text-lg font-semibold text-forest-green shadow-sm transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-forest-green/30 sm:h-14 sm:w-14"
                      aria-label={language === 'en' ? `OTP digit ${index + 1}` : `OTP இலக்கம் ${index + 1}`}
                    />
                  ))}
                </div>
                <p className="text-center text-xs font-medium text-muted-foreground">Time Left: {formattedTimeLeft}</p>
                <div className="flex justify-center">
                  <Button
                    type="submit"
                    variant="hero"
                    size="lg"
                    className="w-full sm:w-auto"
                    disabled={isVerifyingOtp}
                  >
                    {isVerifyingOtp
                      ? language === 'en'
                        ? 'Verifying OTP...'
                        : 'OTP சரிபார்க்கப்படுகிறது...'
                      : language === 'en'
                        ? 'Submit OTP'
                        : 'OTP சமர்ப்பிக்கவும்'}
                  </Button>
                </div>
              </div>
            )}
          </form>
        </section>
      </div>

          {isConfirmationOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
              <div
                className="w-full max-w-xl rounded-[32px] border border-forest-green/10 bg-gradient-to-br from-white via-[#F5FBF7] to-[#E3F5EE] p-10 text-center shadow-2xl"
                role="dialog"
                aria-modal="true"
                aria-labelledby="booking-confirmation-heading"
              >
                <p
                  id="booking-confirmation-heading"
                  className="text-center text-lg font-bold tracking-wide text-[#C62828] sm:text-xl"
                >
                  {language === 'en'
                    ? 'The ticket will be sent to your mobile number via SMS.'
                    : 'டிக்கெட் உங்கள் கைபேசி எண்ணிற்கு SMS மூலம் அனுப்பப்படும்.'}
                </p>
                <div className="mt-6 rounded-3xl border border-forest-green/20 bg-white/70 px-6 py-5 shadow-inner">
                  <p className="text-xs font-semibold uppercase tracking-[0.35em] text-forest-green/70">
                    {language === 'en' ? 'Total Payable' : 'செலுத்த வேண்டிய மொத்த தொகை'}
                  </p>
                  <p className="mt-2 text-3xl font-extrabold text-forest-green sm:text-4xl">
                    ₹ {formattedTotal}
                  </p>
                </div>
                <label className="mt-6 flex items-start gap-3 text-sm font-medium text-forest-green/90">
                  <input
                    type="checkbox"
                    className="mt-1 h-4 w-4 rounded border border-forest-green/40 text-forest-green focus:ring-forest-green"
                    checked={hasAcceptedTerms}
                    onChange={(event) => setHasAcceptedTerms(event.target.checked)}
                  />
                  <span className="text-left text-base font-semibold text-[#1565C0]">
                    {language === 'en' ? 'I accept the ' : 'நான் '}
                    <button
                      type="button"
                      className="text-left text-[#0D47A1] underline transition hover:text-[#42A5F5]"
                      onClick={() => setIsTermsModalOpen(true)}
                    >
                      {language === 'en' ? 'Terms and Conditions' : 'விதிமுறைகள் மற்றும் நிபந்தனைகள்'}
                    </button>
                    {language === 'en' ? '' : ' ஏற்றுக்கொள்கிறேன்.'}
                  </span>
                </label>
                <div className="mt-10 w-full lg:mt-8">
                  <div className="fixed inset-x-0 bottom-0 z-50 border-t border-forest-green/10 bg-white shadow-lg lg:relative lg:rounded-full lg:border lg:shadow-none">
                    <div className="mx-auto flex w-full max-w-2xl items-center justify-between gap-4 px-4 py-4 lg:px-6">
                      <div className="flex flex-col">
                        <span className="text-xs font-semibold uppercase tracking-[0.3em] text-forest-green/70">{language === 'en' ? 'Total Payable' : 'செலுத்த வேண்டிய மொத்த தொகை'}</span>
                        <span className="text-2xl font-extrabold text-forest-green">₹ {formattedTotal}</span>
                      </div>
                      <Button
                        type="button"
                        variant="hero"
                        size="lg"
                        className="w-full rounded-full text-lg font-semibold shadow-[0_18px_35px_rgba(11,59,46,0.25)] transition disabled:cursor-not-allowed disabled:opacity-60 lg:w-auto"
                        onClick={handleProceedToPayment}
                        disabled={!hasAcceptedTerms}
                      >
                        {language === 'en' ? 'Proceed' : 'தொடரவும்'}
                      </Button>
                    </div>
                  </div>
                </div>
                <div className="mt-16 text-xs text-forest-green/70 lg:mt-4">
                  {language === 'en'
                    ? 'You can revisit the booking details any time from your email or SMS confirmation.'
                    : 'மின்னஞ்சல் அல்லது SMS உறுதிப்படுத்தலில் இருந்து எந்த நேரத்திலும் முன்பதிவு விவரங்களை பார்க்கலாம்.'}
                </div>
              </div>
            </div>
          )}

          {isConfirmationOpen && isTermsModalOpen && (
            <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 px-4">
              <div
                className="w-full max-w-2xl rounded-3xl border border-forest-green/15 bg-white p-8 text-left shadow-2xl"
                role="dialog"
                aria-modal="true"
                aria-labelledby="terms-overlay-heading"
              >
                <header className="space-y-2">
                  <h2 id="terms-overlay-heading" className="text-2xl font-bold text-forest-green">
                    {language === 'en' ? 'Terms, Conditions & Refund Policy' : 'விதிமுறைகள், நிபந்தனைகள் & பணம் திருப்பு கொள்கை'}
                  </h2>
                  <p className="text-sm text-forest-green/70">
                    {language === 'en'
                      ? 'Review the complete policy details before confirming your payment.'
                      : 'கட்டணத்தை உறுதிப்படுத்துவதற்கு முன் முழு கொள்கையைப் பார்வையிடுங்கள்.'}
                  </p>
                </header>
                <div className="mt-5 max-h-[360px] space-y-5 overflow-y-auto rounded-2xl border border-forest-green/15 bg-[#F8FCFA] p-5 text-sm leading-relaxed text-forest-green/90">
                  {language === 'en' ? (
                    <>
                      <section className="space-y-2">
                        <h3 className="text-base font-semibold text-forest-green">Terms &amp; Conditions</h3>
                        <p>
                          Welcome to the Kurumbapatti Zoological Park ticket booking portal. By using this website, you agree to
                          comply with and be bound by the following terms and conditions.
                        </p>
                        <p>
                          <strong>Ticket Booking:</strong> All tickets are booked for a specific date and time slot. Tickets are
                          valid only for the date and time specified.
                        </p>
                        <p>
                          <strong>Visitor Conduct:</strong> All visitors must follow the park rules displayed at the entrance and on
                          the Park Rules page. Management may refuse entry or remove anyone who does not comply.
                        </p>
                        <p>
                          <strong>Accuracy of Information:</strong> Provide accurate name, mobile number, and email so your ticket and
                          updates reach you without delay.
                        </p>
                        <p>
                          <strong>Use of Website:</strong> Content on this site is for personal use only. Do not copy or distribute it
                          without written consent.
                        </p>
                      </section>
                      <section className="space-y-2">
                        <h3 className="text-base font-semibold text-forest-green">Privacy Policy</h3>
                        <p>
                          Your privacy is important to us. We collect only the information required to complete your booking—name,
                          email address, and mobile number.
                        </p>
                        <p>
                          <strong>How We Use It:</strong> Details are used exclusively to process your booking and send confirmation
                          updates.
                        </p>
                        <p>
                          <strong>Data Protection:</strong> Security measures are in place to safeguard your data. We never sell or trade
                          your personal information.
                        </p>
                        <p>
                          <strong>Consent:</strong> Completing a booking implies your consent to this privacy policy.
                        </p>
                      </section>
                      <section className="space-y-2">
                        <h3 className="text-base font-semibold text-forest-green">Cancellation &amp; Refund Policy</h3>
                        <p>
                          To manage capacity effectively, all bookings are final.
                        </p>
                        <p>
                          <strong>No Cancellations:</strong> Tickets cannot be cancelled once confirmed.
                        </p>
                        <p>
                          <strong>No Refunds:</strong> Tickets are non-refundable and non-transferable, even for no-shows.
                        </p>
                        <p>
                          <strong>Non-Transferable:</strong> Each ticket is linked to the visitor details entered during booking.
                        </p>
                        <p>
                          Review your booking carefully before payment to ensure the date, time, and quantities are correct.
                        </p>
                      </section>
                    </>
                  ) : (
                    <>
                      <section className="space-y-2">
                        <h3 className="text-base font-semibold text-forest-green">விதிமுறைகள் &amp; நிபந்தனைகள்</h3>
                        <p>
                          குரும்பப்பட்டி உயிரியல் பூங்கா டிக்கெட் முன்பதிவு தளத்தை பயன்படுத்துவதால், கீழ்க்காணும் விதிமுறைகள் மற்றும் நிபந்தனைகளை நீங்கள்
                          ஏற்கிறீர்கள்.
                        </p>
                        <p>
                          <strong>டிக்கெட் முன்பதிவு:</strong> ஒவ்வொரு டிக்கெட்டும் குறிப்பிட்ட தேதி மற்றும் நேரத்திற்கு மட்டுமே செல்லுபடியாகும்.
                        </p>
                        <p>
                          <strong>பார்வையாளர் நடத்தை:</strong> நுழைவாயில் மற்றும் "பூங்கா விதிகள்" பக்கத்தில் உள்ள அனைத்து வழிமுறைகளையும் கடைபிடிக்க வேண்டும்.
                        </p>
                        <p>
                          <strong>தகவல் துல்லியம்:</strong> உங்கள் பெயர், கைபேசி எண், மின்னஞ்சல் ஆகியவை துல்லியமாக உள்ளிடப்பட வேண்டும்.
                        </p>
                        <p>
                          <strong>வலைத்தளம் பயன்பாடு:</strong> இந்த தளம் தனிப்பட்ட பயன்பாட்டிற்காக மட்டுமே. அனுமதியின்றி உள்ளடக்கத்தை பகிர வேண்டாம்.
                        </p>
                      </section>
                      <section className="space-y-2">
                        <h3 className="text-base font-semibold text-forest-green">தனியுரிமைக் கொள்கை</h3>
                        <p>
                          உங்கள் முன்பதிவை நிறைவேற்ற தேவையான பெயர், மின்னஞ்சல் மற்றும் கைபேசி எண் மட்டுமே சேகரிக்கப்படும்.
                        </p>
                        <p>
                          <strong>பயன்பாடு:</strong> டிக்கெட் உறுதிப்படுத்தல் மற்றும் தகவல் புதுப்பிப்புகளுக்காகவே இத்தகவல் பயன்படுத்தப்படுகிறது.
                        </p>
                        <p>
                          <strong>தகவல் பாதுகாப்பு:</strong> உங்கள் தனிப்பட்ட தகவலை பாதுகாக்க தேவையான பாதுகாப்பு நடவடிக்கைகள் உள்ளன; இது மூன்றாம்
                          தரப்புகளுடன் பகிரப்படாது.
                        </p>
                        <p>
                          <strong>சம்மதி:</strong> டிக்கெட் முன்பதிவை நிறைவு செய்வதன் மூலம், இந்த தனியுரிமைக் கொள்கையை நீங்கள் ஏற்கிறீர்கள்.
                        </p>
                      </section>
                      <section className="space-y-2">
                        <h3 className="text-base font-semibold text-forest-green">ரத்து &amp; பணம் திருப்பு கொள்கை</h3>
                        <p>
                          பூங்கா பார்வையாளர்களை திறம்பட மேலாண்மை செய்ய, அனைத்து முன்பதிவுகளும் இறுதியானவை.
                        </p>
                        <p>
                          <strong>ரத்து இல்லை:</strong> உறுதிப்படுத்தப்பட்ட டிக்கெட்டுகளை ரத்து செய்ய முடியாது.
                        </p>
                        <p>
                          <strong>பணம் திருப்பம் இல்லை:</strong> டிக்கெட்டுகள் பணத்தைத் திருப்ப முடியாதவையும் மாற்று வழங்க முடியாதவையும் ஆகும்.
                        </p>
                        <p>
                          <strong>மாற்ற முடியாது:</strong> ஒவ்வொரு டிக்கெட்டும் முன்பதிவில் உள்ள பார்வையாளருக்கே செல்லுபடியாகும்.
                        </p>
                        <p>
                          கட்டணம் செலுத்துவதற்கு முன் தேதி, நேரம் மற்றும் எண்ணிக்கைகளை கவனமாக சரிபார்க்கவும்.
                        </p>
                      </section>
                    </>
                  )}
                </div>
                <div className="mt-6 flex justify-end">
                  <button
                    type="button"
                    onClick={() => setIsTermsModalOpen(false)}
                    className="rounded-full border border-forest-green/40 px-5 py-2 text-sm font-semibold text-forest-green transition hover:bg-forest-green hover:text-white"
                  >
                    {language === 'en' ? 'Close' : 'மூடு'}
                  </button>
                </div>
              </div>
            </div>
          )}

      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-white/20 bg-forest-green px-6 py-5 text-white shadow-2xl">
        <div className="mx-auto flex w-full max-w-[1000px] items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10 text-white">
              <ReceiptIndianRupee size={26} aria-hidden="true" />
            </span>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.4em] text-white/70">
                {language === 'en' ? 'Grand Total' : 'மொத்த தொகை'}
              </p>
              <p className="text-2xl font-bold text-[#FBD96B]">₹ {formattedTotal}</p>
            </div>
          </div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.4em] text-white/60">
            © Kurumbapatti Zoo. All rights reserved.
          </p>
        </div>
      </div>
    </section>
  )
}
