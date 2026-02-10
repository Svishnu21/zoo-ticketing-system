import mongoose from 'mongoose'
import { ApiError, asyncHandler } from '../utils/errors.js'
import { User } from '../models/User.js'
import { hashPassword, normaliseEmail, presentUser } from '../utils/auth.js'
import { recordUserAudit } from '../utils/auditTrail.js'

const { isValidObjectId } = mongoose

const ALLOWED_ROLES = ['ADMIN', 'COUNTER', 'SCANNER']
const ALLOWED_STATUSES = ['ACTIVE', 'DISABLED']

const assertRole = (role) => {
  if (!ALLOWED_ROLES.includes(role)) throw ApiError.badRequest('Invalid role.')
}

const assertStatus = (status) => {
  if (!ALLOWED_STATUSES.includes(status)) throw ApiError.badRequest('Invalid status.')
}

const buildSearchFilter = (search) => {
  if (!search) return null
  const escaped = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const regex = new RegExp(escaped, 'i')
  return [{ fullName: regex }, { email: regex }]
}

const actorIdOrNull = (req) => (isValidObjectId(req.auth?.userId) ? req.auth.userId : null)

const buildAuditContext = (req) => {
  const context = {}
  if (req?.ip) context.ip = String(req.ip)
  const userAgent = req?.headers?.['user-agent']
  if (userAgent) context.userAgent = String(userAgent).slice(0, 256)
  return context
}

export const listUsers = asyncHandler(async (req, res) => {
  const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1)
  const limit = Math.min(100, Math.max(1, Number.parseInt(req.query.limit, 10) || 25))
  const skip = (page - 1) * limit

  const search = typeof req.query.search === 'string' ? req.query.search.trim() : ''
  const role = typeof req.query.role === 'string' ? req.query.role.trim().toUpperCase() : ''
  const status = typeof req.query.status === 'string' ? req.query.status.trim().toUpperCase() : ''

  const filter = {}
  const searchFilter = buildSearchFilter(search)
  if (searchFilter) filter.$or = searchFilter
  if (role) {
    assertRole(role)
    filter.role = role
  }
  if (status) {
    assertStatus(status)
    filter.status = status
  }

  const [users, total] = await Promise.all([
    User.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .select('fullName email role status lastLoginAt createdAt updatedAt')
      .lean(),
    User.countDocuments(filter),
  ])

  res.json({
    success: true,
    data: users.map((u) => presentUser(u)),
    pagination: {
      page,
      limit,
      total,
      hasNext: skip + users.length < total,
    },
  })
})

export const createUser = asyncHandler(async (req, res) => {
  const { fullName, email, role, status = 'ACTIVE', password } = req.body || {}

  if (!fullName || !email || !role || !password) {
    throw ApiError.badRequest('fullName, email, role, and password are required.')
  }

  const normalizedEmail = normaliseEmail(email)
  const normalizedRole = role.toUpperCase()
  const normalizedStatus = status.toUpperCase()

  assertRole(normalizedRole)
  assertStatus(normalizedStatus)

  const existing = await User.findOne({ email: normalizedEmail })
  if (existing) throw ApiError.conflict('Email is already in use.')

  if (password.trim().length < 8) {
    throw ApiError.badRequest('Password must be at least 8 characters long.')
  }

  const passwordHash = await hashPassword(password.trim())

  const user = await User.create({
    fullName: fullName.trim(),
    email: normalizedEmail,
    role: normalizedRole,
    status: normalizedStatus,
    passwordHash,
  })

  await recordUserAudit({
    actorId: actorIdOrNull(req),
    action: 'USER_CREATE',
    userId: user._id,
    after: user,
    context: buildAuditContext(req),
  })

  res.status(201).json({ success: true, user: presentUser(user) })
})

export const getUserById = asyncHandler(async (req, res) => {
  const { id } = req.params
  if (!isValidObjectId(id)) throw ApiError.badRequest('Invalid user id.')

  const user = await User.findById(id).select('fullName email role status lastLoginAt createdAt updatedAt').lean()
  if (!user) throw ApiError.notFound('User not found.')

  res.json({ success: true, user: presentUser(user) })
})

export const updateUser = asyncHandler(async (req, res) => {
  const { id } = req.params
  if (!isValidObjectId(id)) throw ApiError.badRequest('Invalid user id.')

  const { fullName, email, role, status } = req.body || {}
  if (!fullName && !email && !role && !status) {
    throw ApiError.badRequest('No updates supplied.')
  }

  const existing = await User.findById(id)
  if (!existing) throw ApiError.notFound('User not found.')

  const updates = {}

  if (fullName) updates.fullName = fullName.trim()

  if (email) {
    const normalizedEmail = normaliseEmail(email)
    if (normalizedEmail !== existing.email) {
      const duplicate = await User.findOne({ email: normalizedEmail, _id: { $ne: id } })
      if (duplicate) throw ApiError.conflict('Email is already in use.')
      updates.email = normalizedEmail
    }
  }

  if (role) {
    const normalizedRole = role.toUpperCase()
    assertRole(normalizedRole)
    updates.role = normalizedRole
  }

  if (status) {
    const normalizedStatus = status.toUpperCase()
    assertStatus(normalizedStatus)
    updates.status = normalizedStatus
  }

  const updated = await User.findByIdAndUpdate(id, { $set: updates }, { new: true, runValidators: true })
  if (!updated) throw ApiError.notFound('User not found.')

  await recordUserAudit({
    actorId: actorIdOrNull(req),
    action: 'USER_UPDATE',
    userId: id,
    before: existing,
    after: updated,
    context: buildAuditContext(req),
  })

  res.json({ success: true, user: presentUser(updated) })
})

export const setUserStatus = asyncHandler(async (req, res) => {
  const { id } = req.params
  const { status } = req.body || {}
  if (!isValidObjectId(id)) throw ApiError.badRequest('Invalid user id.')
  if (!status) throw ApiError.badRequest('Status is required.')

  const normalizedStatus = status.toUpperCase()
  assertStatus(normalizedStatus)

  const existing = await User.findById(id)
  if (!existing) throw ApiError.notFound('User not found.')

  if (existing.status === normalizedStatus) {
    res.json({ success: true, user: presentUser(existing) })
    return
  }

  const updated = await User.findByIdAndUpdate(id, { $set: { status: normalizedStatus } }, { new: true })
  if (!updated) throw ApiError.notFound('User not found.')

  await recordUserAudit({
    actorId: actorIdOrNull(req),
    action: 'USER_STATUS_UPDATE',
    userId: id,
    before: existing,
    after: updated,
    context: buildAuditContext(req),
  })

  res.json({ success: true, user: presentUser(updated) })
})

export const deleteUser = asyncHandler(async (req, res) => {
  const { id } = req.params
  if (!isValidObjectId(id)) throw ApiError.badRequest('Invalid user id.')

  const existing = await User.findById(id)
  if (!existing) throw ApiError.notFound('User not found.')

  await User.deleteOne({ _id: id })

  await recordUserAudit({
    actorId: actorIdOrNull(req),
    action: 'USER_DELETE',
    userId: id,
    before: existing,
    context: buildAuditContext(req),
  })

  res.json({ success: true })
})

export const resetPassword = asyncHandler(async (req, res) => {
  const { id } = req.params
  const { password } = req.body || {}
  if (!isValidObjectId(id)) throw ApiError.badRequest('Invalid user id.')
  if (!password || typeof password !== 'string' || password.trim().length < 8) {
    throw ApiError.badRequest('Password must be at least 8 characters long.')
  }

  const existing = await User.findById(id)
  if (!existing) throw ApiError.notFound('User not found.')

  const passwordHash = await hashPassword(password.trim())
  const updated = await User.findByIdAndUpdate(id, { $set: { passwordHash } }, { new: true })
  if (!updated) throw ApiError.notFound('User not found.')

  await recordUserAudit({
    actorId: actorIdOrNull(req),
    action: 'USER_PASSWORD_RESET',
    userId: id,
    before: existing,
    after: updated,
    context: buildAuditContext(req),
  })

  res.json({ success: true })
})
