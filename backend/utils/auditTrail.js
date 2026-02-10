import mongoose from 'mongoose'
import { AuditLog } from '../models/AuditLog.js'
import { presentUser } from './auth.js'

const { isValidObjectId, Types } = mongoose

const toObjectId = (value) => {
  if (!value) return null
  if (value instanceof Types.ObjectId) return value
  if (!isValidObjectId(value)) return null
  return new Types.ObjectId(value)
}

const stripUndefined = (input) => {
  if (!input || typeof input !== 'object') return input
  return Object.fromEntries(
    Object.entries(input)
      .filter(([, value]) => value !== undefined && value !== null)
      .map(([key, value]) => [key, value instanceof Date ? value : value]),
  )
}

export const safeUserSnapshot = (user) => {
  const snapshot = presentUser(user)
  if (!snapshot) return null
  const { id, fullName, email, role, status, lastLoginAt, createdAt, updatedAt } = snapshot
  return stripUndefined({ id, fullName, email, role, status, lastLoginAt, createdAt, updatedAt })
}

export const recordAuditLog = async ({ actorId, action, entity, entityId, before, after, context }) => {
  const actorObjectId = toObjectId(actorId)
  const entityObjectId = toObjectId(entityId)

  if (!actorObjectId || !entityObjectId) return

  const payload = stripUndefined({
    actorId: actorObjectId,
    action,
    entity,
    entityId: entityObjectId,
    before: before ? stripUndefined(before) : undefined,
    after: after ? stripUndefined(after) : undefined,
    context: context ? stripUndefined(context) : undefined,
  })

  try {
    await AuditLog.create(payload)
  } catch (error) {
    console.error('AUDIT_LOG_ERROR', error?.message)
  }
}

export const recordUserAudit = async ({ actorId, action, userId, before, after, context }) => {
  const beforeSnapshot = before ? safeUserSnapshot(before) : undefined
  const afterSnapshot = after ? safeUserSnapshot(after) : undefined

  await recordAuditLog({
    actorId,
    action,
    entity: 'User',
    entityId: userId,
    before: beforeSnapshot,
    after: afterSnapshot,
    context,
  })
}
