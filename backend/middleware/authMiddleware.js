import { ApiError } from '../utils/errors.js'
import { verifyToken } from '../utils/auth.js'

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

    req.user = payload
    req.auth = payload
    return next()
  } catch (error) {
    if (error?.name === 'TokenExpiredError') {
      return next(ApiError.unauthorized('Token expired.'))
    }
    if (error?.name === 'JsonWebTokenError' || error?.name === 'NotBeforeError') {
      return next(ApiError.unauthorized('Invalid token.'))
    }
    return next(error)
  }
}

export const requireRole = (...roles) => (req, _res, next) => {
  if (!req.auth?.role) return next(ApiError.unauthorized('Authentication required.'))
  const role = (req.auth.role || '').toString().toLowerCase()
  const allowed = roles.some((r) => (r || '').toString().toLowerCase() === role)
  if (!allowed) return next(ApiError.forbidden('Forbidden for this role.'))
  return next()
}
