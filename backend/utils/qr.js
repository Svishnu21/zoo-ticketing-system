import crypto from 'crypto'
import { ApiError } from './errors.js'

const TOKEN_PREFIX = 'kzp_'
const TOKEN_BYTES = 12 // 96 bits -> short but cryptographically strong
const VERIFICATION_TOKEN_BYTES = 32 // 256-bit token for URL verification

export const generateQrToken = () => {
  // Token is random, opaque, and prefixed to distinguish our namespace; no ticket data is encoded
  const body = crypto.randomBytes(TOKEN_BYTES).toString('base64url')
  return `${TOKEN_PREFIX}${body}`
}

export const hashQrToken = (token) => {
  if (!token) {
    throw ApiError.badRequest('QR token is required for hashing.')
  }
  return crypto.createHash('sha256').update(token).digest('hex')
}

export const generateVerificationToken = () => crypto.randomBytes(VERIFICATION_TOKEN_BYTES).toString('hex')

export const hashVerificationToken = (token) => {
  if (!token) throw ApiError.badRequest('Verification token is required.')
  return crypto.createHash('sha256').update(token).digest('hex')
}
