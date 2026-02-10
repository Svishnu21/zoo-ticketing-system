import { ApiError, asyncHandler } from '../utils/errors.js'
import { User } from '../models/User.js'
import { normaliseEmail, presentUser, signAccessToken, verifyPassword } from '../utils/auth.js'

// Counter/scanner login that issues JWTs and enforces role + status.
export const postCounterLogin = asyncHandler(async (req, res) => {
  const { username, email, password } = req.body || {}
  const identifier = normaliseEmail(email || username)

  if (!identifier || !password) throw ApiError.badRequest('email/username and password are required.')

  const user = await User.findOne({ email: identifier })
  if (!user) throw ApiError.unauthorized('Invalid credentials.')

  if (user.status !== 'ACTIVE') throw ApiError.forbidden('User is disabled.')
  if (user.role !== 'COUNTER') throw ApiError.forbidden('Role not permitted for counter login.')

  const valid = await verifyPassword(password, user.passwordHash)
  if (!valid) throw ApiError.unauthorized('Invalid credentials.')

  await User.updateOne({ _id: user._id }, { $set: { lastLoginAt: new Date() } })

  const accessToken = signAccessToken(user)

  res.json({ success: true, user: presentUser(user), token: accessToken, role: user.role })
})
