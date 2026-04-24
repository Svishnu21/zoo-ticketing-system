import { ApiError } from '../utils/errors.js'
import { verifyToken } from '../utils/auth.js'
import { User } from '../models/User.js'

const ADMIN_SESSION_COOKIE = 'admin_session'

const parseCookies = (cookieHeader = '') => {
  if (!cookieHeader || typeof cookieHeader !== 'string') return {}

  return cookieHeader.split(';').reduce((acc, part) => {
    const [rawKey, ...rawValue] = part.split('=')
    const key = rawKey?.trim()
    if (!key) return acc

    const value = rawValue.join('=').trim()
    try {
      acc[key] = decodeURIComponent(value)
    } catch (_error) {
      acc[key] = value
    }
    return acc
  }, {})
}

const extractBearerToken = (req) => {
  const header = req.headers?.authorization || ''
  if (typeof header === 'string' && header.toLowerCase().startsWith('bearer ')) {
    return header.slice(7).trim()
  }
  if (req.headers?.['x-access-token']) {
    return req.headers['x-access-token']
  }

  const cookies = parseCookies(req.headers?.cookie)
  if (cookies[ADMIN_SESSION_COOKIE]) {
    return cookies[ADMIN_SESSION_COOKIE]
  }

  return null
}

const isDocumentNavigation = (req) => {
  if ((req.method || '').toUpperCase() !== 'GET') return false

  const destination = (req.headers?.['sec-fetch-dest'] || '').toString().toLowerCase()
  if (destination === 'document') return true

  const accept = (req.headers?.accept || '').toString().toLowerCase()
  return accept.includes('text/html') && !accept.includes('application/json')
}

const rejectOrRedirectAdmin = (req, res, next, error) => {
  const statusCode = Number.isInteger(error?.statusCode) ? error.statusCode : 401
  const message = error?.message || 'Authentication required.'

  console.warn('[authz] admin_session_rejected', {
    path: req.path,
    method: req.method,
    statusCode,
    ip: req.ip,
    reason: message,
    at: new Date().toISOString(),
  })

  if (isDocumentNavigation(req)) {
    return res.redirect('/admin/login')
  }

  if (statusCode === 403) {
    return next(ApiError.forbidden(message))
  }

  return next(ApiError.unauthorized(message))
}

export const requireAuth = async (req, _res, next) => {
  try {
    const token = extractBearerToken(req)
    if (!token) throw ApiError.unauthorized('Authentication required.')

    const payload = verifyToken(token)

    if (payload?.userId && payload.userId !== 'env-admin') {
      const user = await User.findById(payload.userId).select('role status').lean()
      if (!user || user.status !== 'ACTIVE') {
        throw ApiError.unauthorized('Authentication required.')
      }
      payload.role = user.role
    }

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

export const requireAdminSession = async (req, res, next) => {
  try {
    const token = extractBearerToken(req)
    if (!token) throw ApiError.unauthorized('Admin authentication required.')

    const payload = verifyToken(token)
    if (payload?.userId && payload.userId !== 'env-admin') {
      const user = await User.findById(payload.userId).select('role status').lean()
      if (!user || user.status !== 'ACTIVE') {
        throw ApiError.unauthorized('Admin authentication required.')
      }
      payload.role = user.role
    }
    const role = (payload?.role || '').toString().toUpperCase()
    if (role !== 'ADMIN') throw ApiError.forbidden('Admin access required.')

    req.user = payload
    req.auth = payload
    return next()
  } catch (error) {
    if (error?.name === 'TokenExpiredError') {
      return rejectOrRedirectAdmin(req, res, next, ApiError.unauthorized('Admin session expired.'))
    }
    if (error?.name === 'JsonWebTokenError' || error?.name === 'NotBeforeError') {
      return rejectOrRedirectAdmin(req, res, next, ApiError.unauthorized('Invalid admin session.'))
    }
    return rejectOrRedirectAdmin(req, res, next, error)
  }
}

export const requireRole = (...roles) => (req, _res, next) => {
  if (!req.auth?.role) return next(ApiError.unauthorized('Authentication required.'))
  const role = (req.auth.role || '').toString().toLowerCase()
  const allowed = roles.some((r) => (r || '').toString().toLowerCase() === role)
  if (!allowed) {
    console.warn('[authz] role_denied', {
      userId: req.auth?.userId,
      role: req.auth?.role,
      requiredRoles: roles,
      path: req.path,
      method: req.method,
      ip: req.ip,
      at: new Date().toISOString(),
    })
    return next(ApiError.forbidden('Forbidden for this role.'))
  }
  return next()
}
