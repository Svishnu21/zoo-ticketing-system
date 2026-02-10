import crypto from 'crypto'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'

const getAccessTokenTtl = () => {
  const ttl = process.env.JWT_EXPIRES_IN
  if (!ttl) throw new Error('JWT_EXPIRES_IN is required for signing tokens.')
  return ttl
}

const getJwtSecret = () => {
  const secret = process.env.JWT_SECRET
  if (!secret) throw new Error('JWT_SECRET is required for signing tokens.')
  return secret
}

export const hashPassword = async (plain) => {
  if (!plain || typeof plain !== 'string') {
    throw new Error('Password is required to hash.')
  }
  const rounds = Number.parseInt(process.env.BCRYPT_SALT_ROUNDS, 10)
  if (!Number.isInteger(rounds) || rounds < 4) {
    throw new Error('BCRYPT_SALT_ROUNDS must be set to a safe integer (>=4).')
  }
  return bcrypt.hash(plain, rounds)
}

export const verifyPassword = async (plain, hash) => bcrypt.compare(plain, hash)

const buildPayload = (user) => ({
  userId: user._id?.toString?.() || user.id || user,
  role: user.role,
})

export const signAccessToken = (user) =>
  jwt.sign(buildPayload(user), getJwtSecret(), { expiresIn: getAccessTokenTtl(), algorithm: 'HS256' })

export const verifyToken = (token) => jwt.verify(token, getJwtSecret())

export const normaliseEmail = (email) => (typeof email === 'string' ? email.trim().toLowerCase() : '')

export const generateTempPassword = (length = 12) => {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@$%*?'
  const bytes = crypto.randomBytes(length)
  return Array.from(bytes, (b) => alphabet[b % alphabet.length]).join('')
}

export const presentUser = (userDoc) => {
  if (!userDoc) return null
  const user = userDoc.toObject ? userDoc.toObject() : userDoc
  return {
    id: user._id?.toString?.(),
    fullName: user.fullName,
    email: user.email,
    role: user.role,
    status: user.status,
    lastLoginAt: user.lastLoginAt,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  }
}
