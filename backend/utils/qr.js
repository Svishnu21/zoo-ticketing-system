import crypto from 'crypto'
import { ApiError } from './errors.js'

const TOKEN_PREFIX = 'kzp_'
const TOKEN_BYTES = 12 // 96 bits -> short but cryptographically strong

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
