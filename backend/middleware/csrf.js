import crypto from 'crypto'

const AUTH_COOKIE = 'admin_session'

const parseCookies = (cookieHeader = '') => {
  if (!cookieHeader || typeof cookieHeader !== 'string') return {}

  return cookieHeader.split(';').reduce((acc, part) => {
    const [rawKey, ...rawValue] = part.split('=')
    const key = rawKey?.trim()
    if (!key) return acc
    const value = rawValue.join('=').trim()
    try {
      acc[key] = decodeURIComponent(value)
    } catch {
      acc[key] = value
    }
    return acc
  }, {})
}

export const setCsrfCookie = (req, res, next) => {
  const cookies = parseCookies(req.headers?.cookie)
  if (!cookies._csrf) {
    const token = crypto.randomBytes(32).toString('hex')
    res.cookie('_csrf', token, {
      httpOnly: false,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 60 * 60 * 1000,
      path: '/',
    })
  }
  return next()
}

export const verifyCsrfToken = (req, res, next) => {
  const safeMethods = ['GET', 'HEAD', 'OPTIONS']
  if (safeMethods.includes((req.method || '').toUpperCase())) return next()

  const publicRoutes = ['/api/payment/success', '/api/payment/failure', '/api/payment/webhook']
  if (publicRoutes.includes(req.path)) return next()

  const cookies = parseCookies(req.headers?.cookie)

  // Enforce CSRF validation for cookie-authenticated sessions only.
  if (!cookies[AUTH_COOKIE]) return next()

  const cookieToken = cookies._csrf
  const headerToken = req.headers?.['x-csrf-token']
  if (!cookieToken || !headerToken || cookieToken !== headerToken) {
    return res.status(403).json({ success: false, message: 'Session expired or invalid. Please refresh the page and try again.' })
  }

  return next()
}
