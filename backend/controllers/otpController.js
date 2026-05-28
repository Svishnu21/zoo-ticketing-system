// OTP Controller — send, verify, resend handlers
import crypto from 'crypto'
import { ApiError, asyncHandler } from '../utils/errors.js'
import { OtpSession } from '../models/OtpSession.js'
import { sendOtpSms, isSmsConfigured } from '../services/smsService.js'


const OTP_LENGTH = 4
const OTP_EXPIRY_MINUTES = 5
const RESEND_COOLDOWN_SECONDS = 60
const MAX_VERIFICATION_ATTEMPTS = 5
const OTP_EXPIRY_MS = OTP_EXPIRY_MINUTES * 60 * 1000
const RESEND_COOLDOWN_MS = RESEND_COOLDOWN_SECONDS * 1000




const generateSecureOtp = () => {
  const otp = crypto.randomInt(0, Math.pow(10, OTP_LENGTH))
  return String(otp).padStart(OTP_LENGTH, '0')
}


const hashOtp = (otp) => {
  return crypto.createHash('sha256').update(otp).digest('hex')
}


const sanitizeMobile = (mobile) => {
  if (!mobile || typeof mobile !== 'string') {
    throw ApiError.badRequest('Mobile number is required.')
  }
  const cleaned = mobile.trim().replace(/[\s\-+]/g, '').replace(/^91(?=\d{10}$)/, '')
  if (!/^\d{10}$/.test(cleaned)) {
    throw ApiError.badRequest('Please provide a valid 10-digit mobile number.')
  }
  return cleaned
}


const maskMobile = (mobile) => `${mobile.slice(0, 3)}****${mobile.slice(-3)}`

// Check if still within resend cooldown
const checkCooldown = (session) => {
  if (!session?.lastSentAt) return { inCooldown: false, waitSeconds: 0 }

  const timeSinceLastSend = Date.now() - new Date(session.lastSentAt).getTime()
  if (timeSinceLastSend < RESEND_COOLDOWN_MS) {
    const waitSeconds = Math.ceil((RESEND_COOLDOWN_MS - timeSinceLastSend) / 1000)
    return { inCooldown: true, waitSeconds }
  }
  return { inCooldown: false, waitSeconds: 0 }
}

// Create OTP, send SMS, store hashed session
const createAndSendOtp = async (mobile) => {
  // Invalidate ALL previous OTPs for this number (atomic, idempotent)
  await OtpSession.deleteMany({ mobile })

  const plainOtp = generateSecureOtp()
  const otpHash = hashOtp(plainOtp)
  const now = new Date()
  const expiresAt = new Date(now.getTime() + OTP_EXPIRY_MS)

  // Send SMS first — if gateway is down, we still create the session
  // (with smsStatus=FAILED) so the user can retry via resend.
  const smsResult = await sendOtpSms(mobile, plainOtp)
  const smsStatus = smsResult.success ? 'SENT' : 'FAILED'

  const session = await OtpSession.create({
    mobile,
    otpHash,
    expiresAt,
    lastSentAt: now,
    attempts: 0,
    verified: false,
    smsStatus,
  })

  return { session, smsResult, smsStatus, expiresAt }
}

// POST /api/otp/send
export const sendOtp = asyncHandler(async (req, res) => {
  const mobile = sanitizeMobile(req.body?.mobile)

  // Check for an existing active (non-expired, non-verified) session
  const existingSession = await OtpSession.findOne({
    mobile,
    verified: false,
    expiresAt: { $gt: new Date() },
  }).lean()

  // Enforce resend cooldown — prevent rapid-fire OTP requests
  if (existingSession) {
    const { inCooldown, waitSeconds } = checkCooldown(existingSession)
    if (inCooldown) {
      return res.status(429).json({
        success: false,
        message: `Please wait ${waitSeconds} seconds before requesting a new OTP.`,
        cooldownRemaining: waitSeconds,
      })
    }
  }

  const { smsResult, smsStatus, expiresAt } = await createAndSendOtp(mobile)

  console.info('[otp] OTP_GENERATED', {
    mobile: maskMobile(mobile),
    smsStatus,
    expiresAt: expiresAt.toISOString(),
    at: new Date().toISOString(),
  })

  if (!smsResult.success) {
    console.warn('[otp] SMS_DELIVERY_FAILED', {
      mobile: maskMobile(mobile),
      reason: smsResult.message,
    })
    return res.status(503).json({
      success: false,
      message: 'Unable to send OTP at this time. Please try again shortly.',
    })
  }

  res.json({
    success: true,
    message: 'OTP sent successfully.',
    expiresInSeconds: Math.floor(OTP_EXPIRY_MS / 1000),
    cooldownSeconds: RESEND_COOLDOWN_SECONDS,
  })
})

// POST /api/otp/verify
export const verifyOtp = asyncHandler(async (req, res) => {
  const mobile = sanitizeMobile(req.body?.mobile)
  const otpInput = (req.body?.otp || '').toString().trim()

  if (!otpInput || otpInput.length !== OTP_LENGTH || !/^\d+$/.test(otpInput)) {
    throw ApiError.badRequest(`Please enter a valid ${OTP_LENGTH}-digit OTP.`)
  }

  // Find the active (non-expired, non-verified) session for this mobile
  const session = await OtpSession.findOne({
    mobile,
    verified: false,
    expiresAt: { $gt: new Date() },
  })

  if (!session) {
    return res.status(400).json({
      success: false,
      message: 'OTP has expired or was not generated. Please request a new OTP.',
      verified: false,
    })
  }

  // Max attempts exceeded — force new OTP
  if (session.attempts >= MAX_VERIFICATION_ATTEMPTS) {
    // Delete the exhausted session so user must generate a fresh OTP
    await OtpSession.deleteOne({ _id: session._id })
    console.warn('[otp] MAX_ATTEMPTS_EXCEEDED', {
      mobile: maskMobile(mobile),
      attempts: session.attempts,
    })
    return res.status(429).json({
      success: false,
      message: 'Too many incorrect attempts. Please generate a new OTP.',
      verified: false,
    })
  }

  // Constant-time comparison to prevent timing attacks
  const submittedHash = hashOtp(otpInput)
  const isMatch = crypto.timingSafeEqual(
    Buffer.from(submittedHash, 'hex'),
    Buffer.from(session.otpHash, 'hex'),
  )

  if (!isMatch) {
    // Atomically increment attempts to prevent race conditions
    const updated = await OtpSession.findOneAndUpdate(
      { _id: session._id, verified: false },
      { $inc: { attempts: 1 } },
      { returnDocument: 'after' },
    )

    const currentAttempts = updated?.attempts ?? session.attempts + 1
    const remainingAttempts = Math.max(0, MAX_VERIFICATION_ATTEMPTS - currentAttempts)

    console.info('[otp] VERIFY_FAILED', {
      mobile: maskMobile(mobile),
      attempt: currentAttempts,
      remaining: remainingAttempts,
    })

    return res.status(400).json({
      success: false,
      message: remainingAttempts > 0
        ? `Invalid OTP. ${remainingAttempts} attempt(s) remaining.`
        : 'Too many incorrect attempts. Please generate a new OTP.',
      verified: false,
    })
  }

  // Mark as verified atomically — prevents reuse even under concurrent requests
  const verifyResult = await OtpSession.findOneAndUpdate(
    { _id: session._id, verified: false },
    { $set: { verified: true } },
    { returnDocument: 'after' },
  )

  // If verifyResult is null, another concurrent request already verified it
  if (!verifyResult) {
    return res.status(400).json({
      success: false,
      message: 'OTP has already been used. Please request a new OTP.',
      verified: false,
    })
  }

  console.info('[otp] VERIFY_SUCCESS', {
    mobile: maskMobile(mobile),
    at: new Date().toISOString(),
  })

  res.json({ success: true, message: 'OTP verified successfully.', verified: true })
})

// POST /api/otp/resend
export const resendOtp = asyncHandler(async (req, res) => {
  const mobile = sanitizeMobile(req.body?.mobile)

  // Check for an existing active session to enforce cooldown
  const existingSession = await OtpSession.findOne({
    mobile,
    verified: false,
    expiresAt: { $gt: new Date() },
  }).lean()

  if (existingSession) {
    const { inCooldown, waitSeconds } = checkCooldown(existingSession)
    if (inCooldown) {
      return res.status(429).json({
        success: false,
        message: `Please wait ${waitSeconds} seconds before resending OTP.`,
        cooldownRemaining: waitSeconds,
      })
    }
  }

  // Create a brand-new OTP — old one is invalidated inside createAndSendOtp
  const { smsResult, smsStatus, expiresAt } = await createAndSendOtp(mobile)

  console.info('[otp] OTP_RESENT', {
    mobile: maskMobile(mobile),
    smsStatus,
    at: new Date().toISOString(),
  })

  if (!smsResult.success) {
    return res.status(503).json({
      success: false,
      message: 'Unable to resend OTP. Please try again shortly.',
    })
  }

  res.json({
    success: true,
    message: 'OTP resent successfully.',
    expiresInSeconds: Math.floor(OTP_EXPIRY_MS / 1000),
    cooldownSeconds: RESEND_COOLDOWN_SECONDS,
  })
})

// GET /api/otp/health
export const otpHealth = asyncHandler(async (_req, res) => {
  const { configured, missing } = isSmsConfigured()
  res.json({
    success: true,
    smsConfigured: configured,
    missingFields: configured ? [] : missing,
  })
})
