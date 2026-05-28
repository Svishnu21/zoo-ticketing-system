// SMS Service — OTP delivery via SMS gateway
import https from 'https'
import http from 'http'

// Config from environment variables
const SMS_CONFIG = {
  get apiUrl() { return (process.env.PING4SMS_API_URL || 'https://site.ping4sms.com/api/smsapi').trim() },
  get apiKey() { return (process.env.PING4SMS_API_KEY || '').trim() },
  get senderId() { return (process.env.PING4SMS_SENDER_ID || '').trim() },
  get templateId() { return (process.env.PING4SMS_TEMPLATE_ID || '').trim() },
  get route() { return (process.env.PING4SMS_ROUTE || '2').trim() },
}

// Check required env vars are set
const validateConfig = () => {
  const required = ['apiKey', 'senderId', 'templateId']
  const missing = required.filter((key) => !SMS_CONFIG[key])
  return { valid: missing.length === 0, missing }
}

// Build the OTP message (must match DLT-approved template)
export const buildOtpMessage = (otp) => {
  return `Dear Customer,${otp} is your verification code -${SMS_CONFIG.senderId}`
}

// HTTP GET helper with timeout
const httpGet = (fullUrl) => {
  return new Promise((resolve, reject) => {
    const parsedUrl = new URL(fullUrl)
    const transport = parsedUrl.protocol === 'https:' ? https : http

    const req = transport.get(fullUrl, { timeout: 15000 }, (res) => {
      let body = ''
      res.on('data', (chunk) => { body += chunk })
      res.on('end', () => resolve({ statusCode: res.statusCode, body }))
    })

    req.on('error', (err) => reject(err))
    req.on('timeout', () => {
      req.destroy()
      reject(new Error('SMS gateway request timed out.'))
    })
  })
}

// Send OTP SMS to a 10-digit mobile number
export const sendOtpSms = async (mobile, otp) => {
  const { valid, missing } = validateConfig()
  if (!valid) {
    console.error('[sms] CONFIG_ERROR: Missing:', missing.join(', '))
    return { success: false, message: 'SMS service is not configured. Please contact support.' }
  }

  // Clean mobile: strip +91/91 prefix, spaces, dashes
  const cleanMobile = mobile.replace(/[\s\-+]/g, '').replace(/^91(?=\d{10}$)/, '')
  if (!/^\d{10}$/.test(cleanMobile)) {
    console.warn('[sms] INVALID_MOBILE:', mobile)
    return { success: false, message: 'Invalid mobile number format.' }
  }

  const message = buildOtpMessage(otp)

  // URLSearchParams handles proper encoding
  const params = new URLSearchParams({
    key: SMS_CONFIG.apiKey,
    route: SMS_CONFIG.route,
    sender: SMS_CONFIG.senderId,
    number: cleanMobile,
    sms: message,
    templateid: SMS_CONFIG.templateId,
  })

  const requestUrl = `${SMS_CONFIG.apiUrl}?${params.toString()}`

  try {
    console.info('[sms] SENDING_OTP', {
      mobile: `${cleanMobile.slice(0, 3)}****${cleanMobile.slice(-3)}`,
      at: new Date().toISOString(),
    })

    const response = await httpGet(requestUrl)

    console.info('[sms] GATEWAY_RESPONSE', {
      statusCode: response.statusCode,
      body: (response.body || '').slice(0, 200),
      at: new Date().toISOString(),
    })

    const isHttpSuccess = response.statusCode >= 200 && response.statusCode < 300
    const bodyLower = (response.body || '').toLowerCase()
    const hasErrorKeyword =
      bodyLower.includes('error') ||
      bodyLower.includes('fail') ||
      bodyLower.includes('invalid') ||
      bodyLower.includes('insufficient')

    if (isHttpSuccess && !hasErrorKeyword) {
      return { success: true, message: 'OTP sent successfully.', gatewayResponse: response.body }
    }

    console.error('[sms] GATEWAY_ERROR', { statusCode: response.statusCode, body: response.body })
    return { success: false, message: 'SMS delivery failed. Please try again.', gatewayResponse: response.body }
  } catch (error) {
    console.error('[sms] SEND_FAILED', {
      error: error.message,
      mobile: `${cleanMobile.slice(0, 3)}****${cleanMobile.slice(-3)}`,
      at: new Date().toISOString(),
    })
    return { success: false, message: 'Unable to reach SMS gateway. Please try again later.' }
  }
}

// Health check — reports config status without revealing credentials
export const isSmsConfigured = () => {
  const { valid, missing } = validateConfig()
  return { configured: valid, missing }
}
