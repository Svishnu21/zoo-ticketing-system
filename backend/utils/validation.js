import { ApiError } from './errors.js'

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const sanitisePhone = (value) => value.replace(/\D/g, '')

export const normaliseVisitorDetails = ({ name, email, mobile }) => {
  const visitorName = (name || '').trim()
  const visitorEmail = (email || '').trim()
  const visitorMobile = sanitisePhone(mobile || '')

  if (!visitorName) {
    throw ApiError.badRequest('Visitor name is required.')
  }

  if (!visitorMobile || visitorMobile.length !== 10) {
    throw ApiError.badRequest('Visitor mobile number is required and must contain exactly 10 digits.')
  }

  if (visitorEmail && !EMAIL_REGEX.test(visitorEmail)) {
    throw ApiError.badRequest('Visitor email is invalid.')
  }

  return { visitorName, visitorEmail, visitorMobile }
}
