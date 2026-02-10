import { ApiError } from '../utils/errors.js'
import { verifyToken, presentUser } from '../utils/auth.js'
import { User } from '../models/User.js'

const cleanEnv = (value) => (value ?? '').toString().trim().replace(/^['"]|['"]$/g, '')

const getEnvAdminUser = () => {
  // TEMP/DEV ONLY: presence of plaintext admin env credentials enables env-admin identity
  const username = cleanEnv(process.env.ADMIN_USERNAME)
  const password = cleanEnv(process.env.ADMIN_PASSWORD)
  if (!username || !password) return null

  const normalizedUsername = username.toLowerCase()
  return {
    username: normalizedUsername,
    user: {
      _id: 'env-admin',
      fullName: 'Administrator',
      email: `${normalizedUsername}@local`,
      role: 'ADMIN',
      status: 'ACTIVE',
    },
  }
}

const extractBearerToken = (req) => {
  const header = req.headers?.authorization || ''
  if (typeof header === 'string' && header.toLowerCase().startsWith('bearer ')) {
    return header.slice(7).trim()
  }
  if (req.headers?.['x-access-token']) {
    return req.headers['x-access-token']
  }
  return null
}

export const requireAuth = async (req, _res, next) => {
  try {
    const token = extractBearerToken(req)
    if (!token) throw ApiError.unauthorized('Authentication required.')

    const payload = verifyToken(token)

    const envAdmin = getEnvAdminUser()
    if (envAdmin && payload.userId === 'env-admin' && payload.role === 'ADMIN') {
      req.user = presentUser(envAdmin.user)
      req.auth = {
        userId: envAdmin.user._id,
        role: envAdmin.user.role,
        status: envAdmin.user.status,
      }
      return next()
    }

    const user = await User.findById(payload.userId)
      .select('fullName email role status lastLoginAt createdAt updatedAt')
      .lean()

    if (!user) throw ApiError.unauthorized('User not found or inactive.')
    if (user.status !== 'ACTIVE') throw ApiError.forbidden('User is disabled.')

    req.user = presentUser(user)
    req.auth = {
      userId: user._id?.toString?.(),
      role: user.role,
      status: user.status,
    }

    return next()
  } catch (error) {
    if (error?.name === 'TokenExpiredError') return next(ApiError.unauthorized('Token expired.'))
    if (error?.name === 'JsonWebTokenError' || error?.name === 'NotBeforeError') {
      return next(ApiError.unauthorized('Invalid token.'))
    }
    return next(error)
  }
}

export const requireRole = (...roles) => (req, _res, next) => {
  if (!req.auth?.role) return next(ApiError.unauthorized('Authentication required.'))
  if (!roles.includes(req.auth.role)) return next(ApiError.forbidden('Forbidden for this role.'))
  return next()
}
