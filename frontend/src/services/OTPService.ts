// OTPService — handles OTP send/verify/resend via backend API

export interface OTPResult {
  success: boolean
  message: string
  errorCode?: string
}

const API_BASE = ''

class OTPService {
  private currentPhoneNumber: string | null = null
  private lastSendTimestamp: number = 0
  private readonly COOLDOWN_MS = 60_000

  async sendOTP(phoneNumber: string): Promise<OTPResult> {
    try {
      const cleanNumber = this.cleanPhoneNumber(phoneNumber)
      if (!cleanNumber) {
        return { success: false, message: 'Please enter a valid 10-digit mobile number.', errorCode: 'invalid-phone' }
      }

      const timeSinceLastSend = Date.now() - this.lastSendTimestamp
      if (timeSinceLastSend < this.COOLDOWN_MS && this.lastSendTimestamp > 0) {
        const waitSeconds = Math.ceil((this.COOLDOWN_MS - timeSinceLastSend) / 1000)
        return { success: false, message: `Please wait ${waitSeconds} seconds before requesting a new OTP.`, errorCode: 'cooldown' }
      }

      const headers: Record<string, string> = { 'Content-Type': 'application/json' }
      const csrfToken = this.getCsrfToken()
      if (csrfToken) headers['x-csrf-token'] = csrfToken

      const response = await fetch(`${API_BASE}/api/otp/send`, {
        method: 'POST', headers,
        body: JSON.stringify({ mobile: cleanNumber }),
      })
      const data = await response.json().catch(() => ({}))

      if (response.ok && data?.success) {
        this.currentPhoneNumber = cleanNumber
        this.lastSendTimestamp = Date.now()
        return { success: true, message: data.message || 'OTP sent successfully.' }
      }
      if (response.status === 429) return { success: false, message: data?.message || 'Too many requests. Please wait.', errorCode: 'rate-limited' }
      if (response.status === 503) return { success: false, message: data?.message || 'SMS service unavailable.', errorCode: 'service-unavailable' }
      return { success: false, message: data?.message || 'Failed to send OTP.', errorCode: 'send-failed' }
    } catch {
      return { success: false, message: 'Network error. Please check your connection.', errorCode: 'network-error' }
    }
  }

  async verifyOTP(otpCode: string): Promise<OTPResult> {
    try {
      if (!this.currentPhoneNumber) return { success: false, message: 'No OTP was sent. Please request one first.', errorCode: 'no-otp-sent' }

      const cleanCode = otpCode.replace(/\D/g, '')
      if (cleanCode.length !== 4) return { success: false, message: 'Please enter the complete 4-digit OTP.', errorCode: 'invalid-format' }

      const headers: Record<string, string> = { 'Content-Type': 'application/json' }
      const csrfToken = this.getCsrfToken()
      if (csrfToken) headers['x-csrf-token'] = csrfToken

      const response = await fetch(`${API_BASE}/api/otp/verify`, {
        method: 'POST', headers,
        body: JSON.stringify({ mobile: this.currentPhoneNumber, otp: cleanCode }),
      })
      const data = await response.json().catch(() => ({}))

      if (response.ok && data?.success && data?.verified) return { success: true, message: data.message || 'OTP verified successfully!' }
      if (response.status === 429) return { success: false, message: data?.message || 'Too many incorrect attempts.', errorCode: 'max-attempts' }
      return { success: false, message: data?.message || 'Invalid OTP.', errorCode: 'verify-failed' }
    } catch {
      return { success: false, message: 'Network error. Please check your connection.', errorCode: 'network-error' }
    }
  }

  async resendOTP(phoneNumber?: string): Promise<OTPResult> {
    const targetNumber = phoneNumber ? this.cleanPhoneNumber(phoneNumber) : this.currentPhoneNumber
    if (!targetNumber) return { success: false, message: 'No phone number found.', errorCode: 'no-phone' }

    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' }
      const csrfToken = this.getCsrfToken()
      if (csrfToken) headers['x-csrf-token'] = csrfToken

      const response = await fetch(`${API_BASE}/api/otp/resend`, {
        method: 'POST', headers,
        body: JSON.stringify({ mobile: targetNumber }),
      })
      const data = await response.json().catch(() => ({}))

      if (response.ok && data?.success) {
        this.currentPhoneNumber = targetNumber
        this.lastSendTimestamp = Date.now()
        return { success: true, message: data.message || 'New OTP sent successfully.' }
      }
      if (response.status === 429) return { success: false, message: data?.message || 'Please wait before resending.', errorCode: 'rate-limited' }
      if (response.status === 503) return { success: false, message: data?.message || 'SMS service unavailable.', errorCode: 'service-unavailable' }
      return { success: false, message: data?.message || 'Failed to resend OTP.', errorCode: 'resend-failed' }
    } catch {
      return { success: false, message: 'Network error. Please check your connection.', errorCode: 'network-error' }
    }
  }

  private cleanPhoneNumber(phone: string): string | null {
    if (!phone || typeof phone !== 'string') return null
    const cleaned = phone.trim().replace(/[\s\-()]/g, '')
    const digitsOnly = cleaned.replace(/^\+/, '')
    if (/^91\d{10}$/.test(digitsOnly)) return digitsOnly.slice(2)
    if (/^\d{10}$/.test(digitsOnly)) return digitsOnly
    return null
  }

  private maskPhone(phone: string): string {
    if (phone.length < 6) return '***'
    return `${phone.slice(0, 3)}****${phone.slice(-3)}`
  }

  private getCsrfToken(): string {
    return document.cookie.split('; ').find(row => row.startsWith('_csrf='))?.split('=')[1] ?? ''
  }

  reset(): void {
    this.currentPhoneNumber = null
    this.lastSendTimestamp = 0
  }

  getCooldownRemaining(): number {
    if (this.lastSendTimestamp === 0) return 0
    const elapsed = Date.now() - this.lastSendTimestamp
    if (elapsed >= this.COOLDOWN_MS) return 0
    return Math.ceil((this.COOLDOWN_MS - elapsed) / 1000)
  }
}

export const otpService = new OTPService()
