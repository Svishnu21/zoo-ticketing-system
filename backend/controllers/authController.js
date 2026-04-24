import { ApiError, asyncHandler } from '../utils/errors.js'
import { User } from '../models/User.js'
import { hashPassword, verifyPassword, signAccessToken, normaliseEmail, presentUser } from '../utils/auth.js'

const ADMIN_SESSION_COOKIE = 'admin_session'

const isSecureRequest = (req) => {
  if (req.secure) return true
  const forwardedProto = (req.headers?.['x-forwarded-proto'] || '').toString().split(',')[0].trim().toLowerCase()
  return forwardedProto === 'https'
}

const adminCookieOptions = (req) => ({
  httpOnly: true,
  sameSite: 'lax',
  secure: isSecureRequest(req),
  path: '/',
})

const setAdminSessionCookie = (req, res, token) => {
  res.cookie(ADMIN_SESSION_COOKIE, token, adminCookieOptions(req))
}

const clearAdminSessionCookie = (req, res) => {
  res.clearCookie(ADMIN_SESSION_COOKIE, adminCookieOptions(req))
}

// Strip quotes and whitespace from environment values to avoid accidental mismatches
const cleanEnv = (value) => (value ?? '').toString().trim().replace(/^['"]|['"]$/g, '')

const logAuthFailure = (req, loginId, reason) => {
  console.warn('[auth] login_failed', {
    loginId,
    reason,
    ip: req.ip,
    userAgent: req.get('user-agent'),
    at: new Date().toISOString(),
  })
}

const verifyEnvAdminPassword = async (password, envAdminPassword, envAdminPasswordHash) => {
  if (envAdminPasswordHash) return verifyPassword(password, envAdminPasswordHash)
  if (envAdminPassword) return password === envAdminPassword
  return false
}

export const login = asyncHandler(async (req, res) => {
  const { username, email, password, secretCode } = req.body || {}
  const normalizedUsername = (username ?? '').toString().trim().toLowerCase()
  const loginId = (username ?? email ?? '').toString().trim()
  const normalizedLoginId = loginId.toLowerCase()
  const adminLoginId = normalizedUsername || normalizedLoginId

  if (!normalizedLoginId || !password) {
    throw ApiError.badRequest('Username and password are required.')
  }

  const envAdminUsername = cleanEnv(process.env.ADMIN_USERNAME).toLowerCase()
  const envAdminPassword = cleanEnv(process.env.ADMIN_PASSWORD)
  const envAdminPasswordHash = cleanEnv(process.env.ADMIN_PASSWORD_HASH)
  const envAdminSecret = cleanEnv(process.env.ADMIN_SECRET_CODE)

  // TEMP/DEV ONLY: environment-based admin login with plaintext password. Replace with bcrypt later.
  if (envAdminUsername && adminLoginId === envAdminUsername) {
    const validAdminPassword = await verifyEnvAdminPassword(password, envAdminPassword, envAdminPasswordHash)
    if (!validAdminPassword) {
      logAuthFailure(req, normalizedLoginId, 'invalid_password')
      throw ApiError.unauthorized('Invalid username or password.')
    }
    if (!envAdminSecret || !secretCode || secretCode !== envAdminSecret) {
      logAuthFailure(req, normalizedLoginId, 'invalid_secret_code')
      throw ApiError.unauthorized('Invalid username or password.')
    }

    const adminUser = {
      _id: 'env-admin',
      fullName: 'Administrator',
      email: `${envAdminUsername}@local`,
      role: 'ADMIN',
      status: 'ACTIVE',
      isActive: true,
    }

    const accessToken = signAccessToken(adminUser)
    setAdminSessionCookie(req, res, accessToken)
    return res.json({ success: true, token: accessToken, role: 'ADMIN', user: presentUser(adminUser) })
  }

  // Database-backed login for COUNTER/SCANNER/Admin-from-DB
  const normalizedEmail = normaliseEmail(normalizedLoginId)
  const user = await User.findOne({ email: normalizedEmail })
  if (!user) {
    logAuthFailure(req, normalizedLoginId, 'user_not_found')
    throw ApiError.unauthorized('Invalid credentials.')
  }

  if (user.lockUntil && Number(user.lockUntil) > Date.now()) {
    const minutes = Math.ceil((Number(user.lockUntil) - Date.now()) / 60000)
    throw new ApiError(429, `Account locked. Try again in ${minutes} minutes.`)
  }

  if (user.status !== 'ACTIVE') {
    throw ApiError.forbidden('User is disabled.')
  }

  const valid = await verifyPassword(password, user.passwordHash)
  if (!valid) {
    const attempts = Number(user.loginAttempts || 0) + 1
    const update = { loginAttempts: attempts }
    if (attempts >= 5) {
      update.lockUntil = Date.now() + 15 * 60 * 1000
    }
    await User.updateOne({ _id: user._id }, { $set: update })

    logAuthFailure(req, normalizedLoginId, 'invalid_password')
    throw ApiError.unauthorized('Invalid credentials.')
  }

  await User.updateOne({ _id: user._id }, { $set: { lastLoginAt: new Date(), loginAttempts: 0, lockUntil: 0 } })

  const accessToken = signAccessToken(user)

  setAdminSessionCookie(req, res, accessToken)

  res.json({
    success: true,
    token: accessToken,
    role: user.role,
    user: presentUser(user),
  })
})

export const logout = asyncHandler(async (_req, res) => {
  // Stateless JWT logout; client should discard tokens.
  clearAdminSessionCookie(_req, res)
  res.json({ success: true })
})

export const me = asyncHandler(async (req, res) => {
  res.json({ success: true, user: req.user })
})

export const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body || {}
  if (!currentPassword || !newPassword) {
    throw ApiError.badRequest('Current password and new password are required.')
  }

  const user = await User.findById(req.auth.userId)
  if (!user) throw ApiError.unauthorized('User not found.')

  const valid = await verifyPassword(currentPassword, user.passwordHash)
  if (!valid) throw ApiError.unauthorized('Current password is incorrect.')

  user.passwordHash = await hashPassword(newPassword)
  await user.save()

  res.json({ success: true })
})
