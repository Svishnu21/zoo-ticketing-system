// OTPVerification — OTP verification component for booking flow

import { useCallback, useEffect, useRef, useState, useMemo } from 'react'
import type { KeyboardEvent } from 'react'
import { otpService } from '@/services/OTPService'

interface OTPVerificationProps {
  mobileNumber: string
  onVerified: () => void
  language: 'en' | 'ta'
  isMobileValid: boolean
}

const OTP_DIGIT_COUNT = 4
const OTP_EXPIRY_SECONDS = 300
const RESEND_COOLDOWN_SECONDS = 60

export function OTPVerification({
  mobileNumber,
  onVerified,
  language,
  isMobileValid,
}: OTPVerificationProps) {
  const [otpValues, setOtpValues] = useState<string[]>(Array(OTP_DIGIT_COUNT).fill(''))
  const [isOtpSent, setIsOtpSent] = useState(false)
  const [isSending, setIsSending] = useState(false)
  const [isVerifying, setIsVerifying] = useState(false)
  const [isResending, setIsResending] = useState(false)
  const [timeLeft, setTimeLeft] = useState(0)
  const [resendCooldown, setResendCooldown] = useState(0)
  const [statusMessage, setStatusMessage] = useState('')
  const [statusType, setStatusType] = useState<'info' | 'error' | 'success'>('info')

  const otpInputRefs = useRef<Array<HTMLInputElement | null>>([])

  // Cleanup on unmount
  useEffect(() => {
    return () => { otpService.reset() }
  }, [])

  // Expiry countdown
  useEffect(() => {
    if (!isOtpSent || timeLeft <= 0) return
    const timerId = window.setInterval(() => {
      setTimeLeft((prev) => (prev > 0 ? prev - 1 : 0))
    }, 1000)
    return () => window.clearInterval(timerId)
  }, [isOtpSent, timeLeft])

  // Handle expiry
  useEffect(() => {
    if (isOtpSent && timeLeft === 0 && statusType !== 'error') {
      setStatusType('error')
      setStatusMessage(
        language === 'en'
          ? 'OTP expired. Please resend to get a new code.'
          : 'OTP காலாவதியானது. புதிய குறியீட்டிற்கு மீண்டும் அனுப்பவும்.',
      )
    }
  }, [isOtpSent, timeLeft, language, statusType])

  // Resend cooldown
  useEffect(() => {
    if (resendCooldown <= 0) return
    const timerId = window.setInterval(() => {
      setResendCooldown((prev) => (prev > 0 ? prev - 1 : 0))
    }, 1000)
    return () => window.clearInterval(timerId)
  }, [resendCooldown])

  const formattedTimeLeft = useMemo(() => {
    const safeTime = Math.max(timeLeft, 0)
    const minutes = Math.floor(safeTime / 60).toString().padStart(2, '0')
    const seconds = (safeTime % 60).toString().padStart(2, '0')
    return `${minutes}:${seconds}`
  }, [timeLeft])

  const handleOtpChange = useCallback((index: number, value: string) => {
    const digit = value.replace(/\D/g, '').slice(-1)
    setOtpValues((prev) => {
      const next = [...prev]
      next[index] = digit
      return next
    })
    if (digit && index < OTP_DIGIT_COUNT - 1) {
      otpInputRefs.current[index + 1]?.focus()
    }
  }, [])

  const handleOtpKeyDown = useCallback((index: number, event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Backspace' && !otpValues[index] && index > 0) {
      otpInputRefs.current[index - 1]?.focus()
    }
  }, [otpValues])

  const handleOtpPaste = useCallback((event: React.ClipboardEvent<HTMLInputElement>) => {
    event.preventDefault()
    const pasted = event.clipboardData.getData('text').replace(/\D/g, '').slice(0, OTP_DIGIT_COUNT)
    if (pasted.length === 0) return
    const newValues = Array(OTP_DIGIT_COUNT).fill('')
    for (let i = 0; i < pasted.length && i < OTP_DIGIT_COUNT; i++) {
      newValues[i] = pasted[i]
    }
    setOtpValues(newValues)
    const nextEmptyIndex = Math.min(pasted.length, OTP_DIGIT_COUNT - 1)
    otpInputRefs.current[nextEmptyIndex]?.focus()
  }, [])

  const handleSendOTP = useCallback(async () => {
    if (isSending || !isMobileValid) return
    setIsSending(true)
    setStatusType('info')
    setStatusMessage(language === 'en' ? 'Sending OTP...' : 'OTP அனுப்பப்படுகிறது...')

    const result = await otpService.sendOTP(mobileNumber)
    if (result.success) {
      setIsOtpSent(true)
      setTimeLeft(OTP_EXPIRY_SECONDS)
      setResendCooldown(RESEND_COOLDOWN_SECONDS)
      setOtpValues(Array(OTP_DIGIT_COUNT).fill(''))
      setStatusType('info')
      setStatusMessage(
        language === 'en'
          ? 'OTP sent successfully. Please enter the 4-digit code below.'
          : 'OTP வெற்றிகரமாக அனுப்பப்பட்டது. கீழே 4 இலக்க குறியீட்டை உள்ளிடுங்கள்.',
      )
      window.setTimeout(() => { otpInputRefs.current[0]?.focus() }, 100)
    } else {
      setStatusType('error')
      setStatusMessage(result.message)
    }
    setIsSending(false)
  }, [isSending, isMobileValid, mobileNumber, language])

  const handleVerifyOTP = useCallback(async () => {
    const otpCode = otpValues.join('')
    if (otpCode.length !== OTP_DIGIT_COUNT || otpValues.some((d) => !d)) {
      setStatusType('error')
      setStatusMessage(
        language === 'en'
          ? `Enter the complete ${OTP_DIGIT_COUNT}-digit OTP before submitting.`
          : `சமர்ப்பிப்பதற்கு முன் ${OTP_DIGIT_COUNT} இலக்க OTP ஐ முழுமையாக உள்ளிடுங்கள்.`,
      )
      return
    }
    if (timeLeft <= 0) {
      setStatusType('error')
      setStatusMessage(
        language === 'en'
          ? 'OTP has expired. Please resend to get a new code.'
          : 'OTP காலாவதியானது. புதிய குறியீட்டிற்கு மீண்டும் அனுப்பவும்.',
      )
      return
    }

    setIsVerifying(true)
    setStatusType('info')
    setStatusMessage(language === 'en' ? 'Verifying OTP...' : 'OTP சரிபார்க்கப்படுகிறது...')

    const result = await otpService.verifyOTP(otpCode)
    if (result.success) {
      setStatusType('success')
      setStatusMessage(
        language === 'en'
          ? 'OTP verified! Please confirm to proceed to payment.'
          : 'OTP சரிபார்க்கப்பட்டது! கட்டணத்திற்கு செல்ல உறுதிப்படுத்தவும்.',
      )
      onVerified()
    } else {
      setStatusType('error')
      setStatusMessage(result.message)
    }
    setIsVerifying(false)
  }, [otpValues, timeLeft, language, onVerified])

  const handleResendOTP = useCallback(async () => {
    if (isResending || resendCooldown > 0) return
    setIsResending(true)
    setStatusType('info')
    setStatusMessage(language === 'en' ? 'Resending OTP...' : 'OTP மீண்டும் அனுப்பப்படுகிறது...')

    const result = await otpService.resendOTP(mobileNumber)
    if (result.success) {
      setTimeLeft(OTP_EXPIRY_SECONDS)
      setResendCooldown(RESEND_COOLDOWN_SECONDS)
      setOtpValues(Array(OTP_DIGIT_COUNT).fill(''))
      setStatusType('info')
      setStatusMessage(
        language === 'en' ? 'New OTP sent successfully.' : 'புதிய OTP வெற்றிகரமாக அனுப்பப்பட்டது.',
      )
      window.setTimeout(() => { otpInputRefs.current[0]?.focus() }, 100)
    } else {
      setStatusType('error')
      setStatusMessage(result.message)
    }
    setIsResending(false)
  }, [isResending, resendCooldown, mobileNumber, language])

  return (
    <div className="mt-6 space-y-4">
      {statusMessage && (
        <p
          className={
            statusType === 'error'
              ? 'rounded-2xl bg-[#FFEAEA] px-4 py-3 text-sm font-semibold text-[#C62828]'
              : statusType === 'success'
                ? 'rounded-2xl bg-[#E8F5E9] px-4 py-3 text-sm font-semibold text-[#2E7D32]'
                : 'rounded-2xl bg-[#E8F5E9] px-4 py-3 text-sm font-semibold text-forest-green'
          }
        >
          {statusMessage}
        </p>
      )}

      {!isOtpSent && (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <button
            type="button"
            onClick={handleSendOTP}
            disabled={isSending || !isMobileValid}
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-forest-green px-6 py-3 text-sm font-semibold text-white shadow-lg transition hover:bg-forest-green/90 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-forest-green/30 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isSending
              ? language === 'en' ? 'Sending OTP...' : 'OTP அனுப்பப்படுகிறது...'
              : language === 'en' ? 'Generate OTP' : 'OTP உருவாக்கவும்'}
          </button>
        </div>
      )}

      {isOtpSent && (
        <div className="space-y-5">
          <div className="flex justify-center gap-2 sm:gap-3">
            {otpValues.map((value, index) => (
              <input
                key={`otp-digit-${index}`}
                ref={(el) => { otpInputRefs.current[index] = el }}
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={1}
                value={value}
                onChange={(e) => handleOtpChange(index, e.target.value)}
                onKeyDown={(e) => handleOtpKeyDown(index, e)}
                onPaste={index === 0 ? handleOtpPaste : undefined}
                disabled={timeLeft <= 0}
                className="h-12 w-10 rounded-2xl border border-forest-green/30 bg-white text-center text-lg font-semibold text-forest-green shadow-sm transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-forest-green/30 disabled:opacity-50 sm:h-14 sm:w-12"
                aria-label={language === 'en' ? `OTP digit ${index + 1}` : `OTP இலக்கம் ${index + 1}`}
              />
            ))}
          </div>

          <div className="flex flex-col items-center gap-1">
            <p className={`text-center text-xs font-medium ${timeLeft <= 0 ? 'text-[#C62828]' : timeLeft <= 30 ? 'text-amber-600' : 'text-muted-foreground'}`}>
              {timeLeft > 0
                ? `${language === 'en' ? 'OTP expires in' : 'OTP காலாவதி'}: ${formattedTimeLeft}`
                : language === 'en' ? 'OTP expired — please resend' : 'OTP காலாவதியானது — மீண்டும் அனுப்பவும்'}
            </p>
          </div>

          <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
            <button
              type="button"
              onClick={handleVerifyOTP}
              disabled={isVerifying || timeLeft <= 0}
              className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-forest-green px-6 py-3 text-sm font-semibold text-white shadow-lg transition hover:bg-forest-green/90 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-forest-green/30 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
            >
              {isVerifying
                ? language === 'en' ? 'Verifying OTP...' : 'OTP சரிபார்க்கப்படுகிறது...'
                : language === 'en' ? 'Submit OTP' : 'OTP சமர்ப்பிக்கவும்'}
            </button>

            <button
              type="button"
              disabled={resendCooldown > 0 || isResending}
              onClick={handleResendOTP}
              className="rounded-2xl border border-forest-green/30 px-4 py-2 text-sm font-semibold text-forest-green transition hover:bg-forest-green/10 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isResending
                ? language === 'en' ? 'Resending...' : 'அனுப்புகிறது...'
                : resendCooldown > 0
                  ? `${language === 'en' ? 'Resend OTP in' : 'OTP மீண்டும் அனுப்பு'} ${resendCooldown}s`
                  : language === 'en' ? 'Resend OTP' : 'OTP மீண்டும் அனுப்பு'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
