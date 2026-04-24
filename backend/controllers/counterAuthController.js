import { ApiError, asyncHandler } from '../utils/errors.js'
import { User } from '../models/User.js'
import { normaliseEmail, presentUser, signAccessToken, verifyPassword } from '../utils/auth.js'

const COUNTER_SESSION_COOKIE = 'admin_session'

const isSecureRequest = (req) => {
  if (req.secure) return true
  const forwardedProto = (req.headers?.['x-forwarded-proto'] || '').toString().split(',')[0].trim().toLowerCase()
  return forwardedProto === 'https'
}

const counterCookieOptions = (req) => ({
  httpOnly: true,
  sameSite: 'lax',
  secure: isSecureRequest(req),
  path: '/',
})

const setCounterSessionCookie = (req, res, token) => {
  res.cookie(COUNTER_SESSION_COOKIE, token, counterCookieOptions(req))
}

const logCounterAuthFailure = (req, loginId, reason) => {
  console.warn('[counter-auth] login_failed', {
    loginId,
    reason,
    ip: req.ip,
    userAgent: req.get('user-agent'),
    at: new Date().toISOString(),
  })
}

// Counter/scanner login that issues JWTs and enforces role + status.
export const postCounterLogin = asyncHandler(async (req, res) => {
  const { username, email, password } = req.body || {}
  const identifier = normaliseEmail(email || username)

  if (!identifier || !password) throw ApiError.badRequest('email/username and password are required.')

  const user = await User.findOne({ email: identifier })
  if (!user) {
    logCounterAuthFailure(req, identifier, 'user_not_found')
    throw ApiError.unauthorized('Invalid credentials.')
  }

  if (user.status !== 'ACTIVE') {
    logCounterAuthFailure(req, identifier, 'inactive_user')
    throw ApiError.forbidden('User is disabled.')
  }
  if (user.role !== 'COUNTER') {
    logCounterAuthFailure(req, identifier, 'invalid_role')
    throw ApiError.forbidden('Role not permitted for counter login.')
  }

  if (user.lockUntil && Number(user.lockUntil) > Date.now()) {
    const minutes = Math.ceil((Number(user.lockUntil) - Date.now()) / 60000)
    throw new ApiError(429, `Account locked. Try again in ${minutes} minutes.`)
  }

  const valid = await verifyPassword(password, user.passwordHash)
  if (!valid) {
    const attempts = Number(user.loginAttempts || 0) + 1
    const update = { loginAttempts: attempts }
    if (attempts >= 5) {
      update.lockUntil = Date.now() + 15 * 60 * 1000
    }
    await User.updateOne({ _id: user._id }, { $set: update })

    logCounterAuthFailure(req, identifier, 'invalid_password')
    throw ApiError.unauthorized('Invalid credentials.')
  }

  await User.updateOne({ _id: user._id }, { $set: { lastLoginAt: new Date(), loginAttempts: 0, lockUntil: 0 } })

  const accessToken = signAccessToken(user)
  setCounterSessionCookie(req, res, accessToken)

  res.json({ success: true, user: presentUser(user), token: accessToken, role: user.role })
})
