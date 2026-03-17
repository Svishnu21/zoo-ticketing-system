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
  const envAdminSecret = cleanEnv(process.env.ADMIN_SECRET_CODE)

  // TEMP/DEV ONLY: environment-based admin login with plaintext password. Replace with bcrypt later.
  if (envAdminUsername && envAdminPassword && adminLoginId === envAdminUsername) {
    if (password !== envAdminPassword) throw ApiError.unauthorized('Invalid username or password.')
    if (!envAdminSecret) throw ApiError.unauthorized('Admin secret code not configured.')
    if (!secretCode || secretCode !== envAdminSecret) throw ApiError.unauthorized('Invalid admin secret code.')

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
  if (!user) throw ApiError.unauthorized('Invalid credentials.')

  if (user.status !== 'ACTIVE') {
    throw ApiError.forbidden('User is disabled.')
  }

  const valid = await verifyPassword(password, user.passwordHash)
  if (!valid) throw ApiError.unauthorized('Invalid credentials.')

  await User.updateOne({ _id: user._id }, { $set: { lastLoginAt: new Date() } })

  const accessToken = signAccessToken(user)

  if ((user.role || '').toString().toUpperCase() === 'ADMIN') {
    setAdminSessionCookie(req, res, accessToken)
  } else {
    clearAdminSessionCookie(req, res)
  }

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
