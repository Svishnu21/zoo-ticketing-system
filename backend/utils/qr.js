import crypto from 'crypto'
import { ApiError } from './errors.js'

const TOKEN_PREFIX = 'kzp_'
const TOKEN_BYTES = 12

export const generateQrToken = () => {
  const body = crypto.randomBytes(TOKEN_BYTES).toString('base64url')
  return `${TOKEN_PREFIX}${body}`
}

export const hashQrToken = (token) => {
  if (!token) {
    throw ApiError.badRequest('QR token is required for hashing.')
  }
  return crypto.createHash('sha256').update(token).digest('hex')
}

export const generateVerificationToken = () => crypto.randomBytes(32).toString('hex')

export const hashVerificationToken = (token) => {
  if (!token) throw ApiError.badRequest('Verification token is required.')
  return crypto.createHash('sha256').update(token).digest('hex')
}
